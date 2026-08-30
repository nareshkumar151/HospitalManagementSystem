USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Medicine_Search
    @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL, @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, MedicineName, GenericName, BatchNumber, ExpiryDate, Manufacturer, PurchasePrice, SellingPrice,
           Stock, ReorderLevel, BranchId
    FROM Medicines
    WHERE IsDeleted = 0
      AND (@Search IS NULL OR MedicineName LIKE '%' + @Search + '%' OR GenericName LIKE '%' + @Search + '%')
      AND (@BranchId IS NULL OR BranchId = @BranchId)
    ORDER BY MedicineName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM Medicines
    WHERE IsDeleted = 0
      AND (@Search IS NULL OR MedicineName LIKE '%' + @Search + '%' OR GenericName LIKE '%' + @Search + '%')
      AND (@BranchId IS NULL OR BranchId = @BranchId);
END
GO

CREATE OR ALTER PROCEDURE sp_Medicine_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, MedicineName, GenericName, BatchNumber, ExpiryDate, Manufacturer, PurchasePrice, SellingPrice,
           Stock, ReorderLevel, BranchId
    FROM Medicines WHERE Id = @Id AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Medicine_GetLowStock
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, MedicineName, GenericName, BatchNumber, ExpiryDate, Manufacturer, PurchasePrice, SellingPrice,
           Stock, ReorderLevel, BranchId
    FROM Medicines WHERE IsDeleted = 0 AND Stock <= ReorderLevel ORDER BY Stock;
END
GO

CREATE OR ALTER PROCEDURE sp_Medicine_GetExpiringSoon
    @WithinDays INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, MedicineName, GenericName, BatchNumber, ExpiryDate, Manufacturer, PurchasePrice, SellingPrice,
           Stock, ReorderLevel, BranchId
    FROM Medicines
    WHERE IsDeleted = 0 AND ExpiryDate <= DATEADD(DAY, @WithinDays, SYSUTCDATETIME())
    ORDER BY ExpiryDate;
END
GO

CREATE OR ALTER PROCEDURE sp_Medicine_Insert
    @MedicineName NVARCHAR(150), @GenericName NVARCHAR(150), @BatchNumber NVARCHAR(50), @ExpiryDate DATE,
    @Manufacturer NVARCHAR(150), @PurchasePrice DECIMAL(10,2), @SellingPrice DECIMAL(10,2), @Stock INT,
    @ReorderLevel INT, @BranchId INT, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Medicines (MedicineName, GenericName, BatchNumber, ExpiryDate, Manufacturer, PurchasePrice,
        SellingPrice, Stock, ReorderLevel, BranchId, CreatedBy)
    VALUES (@MedicineName, @GenericName, @BatchNumber, @ExpiryDate, @Manufacturer, @PurchasePrice,
        @SellingPrice, @Stock, @ReorderLevel, @BranchId, @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Medicine_Update
    @Id INT, @MedicineName NVARCHAR(150), @GenericName NVARCHAR(150), @BatchNumber NVARCHAR(50), @ExpiryDate DATE,
    @Manufacturer NVARCHAR(150), @PurchasePrice DECIMAL(10,2), @SellingPrice DECIMAL(10,2), @ReorderLevel INT,
    @UpdatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Medicines SET MedicineName=@MedicineName, GenericName=@GenericName, BatchNumber=@BatchNumber,
        ExpiryDate=@ExpiryDate, Manufacturer=@Manufacturer, PurchasePrice=@PurchasePrice, SellingPrice=@SellingPrice,
        ReorderLevel=@ReorderLevel, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@UpdatedBy
    WHERE Id = @Id;
END
GO

/* Purchase: increments stock and logs the transaction. */
CREATE OR ALTER PROCEDURE sp_Medicine_Purchase
    @MedicineId INT, @Quantity INT, @UnitCost DECIMAL(10,2), @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE Medicines SET Stock = Stock + @Quantity, PurchasePrice = @UnitCost, UpdatedAt = SYSUTCDATETIME() WHERE Id = @MedicineId;
    INSERT INTO MedicineStockTransactions (MedicineId, TransactionType, Quantity, PerformedByUserId)
    VALUES (@MedicineId, 'Purchase', @Quantity, @UserId);

    COMMIT TRANSACTION;
END
GO

/* Adjustment: @Quantity may be positive or negative. */
CREATE OR ALTER PROCEDURE sp_Medicine_AdjustStock
    @MedicineId INT, @Quantity INT, @Reason NVARCHAR(300), @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE Medicines SET Stock = Stock + @Quantity, UpdatedAt = SYSUTCDATETIME() WHERE Id = @MedicineId;
    INSERT INTO MedicineStockTransactions (MedicineId, TransactionType, Quantity, Reason, PerformedByUserId)
    VALUES (@MedicineId, 'Adjustment', @Quantity, @Reason, @UserId);

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE sp_PharmacySale_NextInvoiceNumber
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year VARCHAR(4) = CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4));
    DECLARE @Next INT = (
        SELECT ISNULL(MAX(CAST(SUBSTRING(InvoiceNumber, 8, 10) AS INT)), 0) + 1
        FROM PharmacySales WHERE InvoiceNumber LIKE 'PHM' + @Year + '%'
    );
    SELECT 'PHM' + @Year + RIGHT('000000' + CAST(@Next AS VARCHAR(10)), 6) AS NextInvoiceNumber;
END
GO

CREATE OR ALTER PROCEDURE sp_PharmacySale_Insert
    @InvoiceNumber NVARCHAR(30), @PatientId INT, @PrescriptionId INT = NULL, @DispensedByUserId INT, @TotalAmount DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO PharmacySales (InvoiceNumber, PatientId, PrescriptionId, DispensedByUserId, TotalAmount)
    VALUES (@InvoiceNumber, @PatientId, @PrescriptionId, @DispensedByUserId, @TotalAmount);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

/* Dispenses one line item: inserts sale item, decrements stock, logs the movement. Called once per item
   from the Infrastructure service inside a single ambient TransactionScope covering the whole sale. */
CREATE OR ALTER PROCEDURE sp_PharmacySale_DispenseItem
    @PharmacySaleId INT, @MedicineId INT, @Quantity INT, @UnitPrice DECIMAL(10,2), @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @CurrentStock INT = (SELECT Stock FROM Medicines WHERE Id = @MedicineId);
    IF @CurrentStock IS NULL OR @CurrentStock < @Quantity
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Insufficient stock for the requested medicine.', 16, 1);
        RETURN;
    END

    INSERT INTO PharmacySaleItems (PharmacySaleId, MedicineId, Quantity, UnitPrice, LineTotal)
    VALUES (@PharmacySaleId, @MedicineId, @Quantity, @UnitPrice, @Quantity * @UnitPrice);

    UPDATE Medicines SET Stock = Stock - @Quantity WHERE Id = @MedicineId;

    INSERT INTO MedicineStockTransactions (MedicineId, TransactionType, Quantity, PerformedByUserId)
    VALUES (@MedicineId, 'Sale', -@Quantity, @UserId);

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE sp_PharmacySale_Return
    @SaleId INT, @MedicineId INT, @Quantity INT, @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE Medicines SET Stock = Stock + @Quantity WHERE Id = @MedicineId;
    INSERT INTO MedicineStockTransactions (MedicineId, TransactionType, Quantity, Reason, PerformedByUserId)
    VALUES (@MedicineId, 'Return', @Quantity, CONCAT('Return against sale #', @SaleId), @UserId);

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE sp_PharmacySale_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id, s.InvoiceNumber, s.PatientId, p.FullName AS PatientName, s.TotalAmount, s.SaleDate
    FROM PharmacySales s JOIN Patients p ON p.Id = s.PatientId
    WHERE s.Id = @Id AND s.IsDeleted = 0;

    SELECT si.MedicineId, m.MedicineName, si.Quantity, si.UnitPrice, si.LineTotal
    FROM PharmacySaleItems si JOIN Medicines m ON m.Id = si.MedicineId
    WHERE si.PharmacySaleId = @Id;
END
GO
