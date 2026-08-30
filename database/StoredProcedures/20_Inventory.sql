USE HMS_DB;
GO

/* ==================== Vendors ==================== */
CREATE OR ALTER PROCEDURE sp_Vendor_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, GstNumber, Contact, Address, IsActive FROM Vendors WHERE IsDeleted = 0 ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_Vendor_Insert
    @Name NVARCHAR(150), @GstNumber NVARCHAR(30), @Contact NVARCHAR(20), @Address NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Vendors (Name, GstNumber, Contact, Address) VALUES (@Name, @GstNumber, @Contact, @Address);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Vendor_Update
    @Id INT, @Name NVARCHAR(150), @GstNumber NVARCHAR(30), @Contact NVARCHAR(20), @Address NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Vendors SET Name=@Name, GstNumber=@GstNumber, Contact=@Contact, Address=@Address WHERE Id = @Id;
END
GO

/* ==================== Inventory Items ==================== */
CREATE OR ALTER PROCEDURE sp_InventoryItem_GetAll
    @Type NVARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, ItemName, Type, Unit, Stock, ReorderLevel, ExpiryDate, VendorId, BranchId
    FROM InventoryItems WHERE IsDeleted = 0 AND (@Type IS NULL OR Type = @Type)
    ORDER BY ItemName;
END
GO

CREATE OR ALTER PROCEDURE sp_InventoryItem_Insert
    @ItemName NVARCHAR(150), @Type NVARCHAR(30), @Unit NVARCHAR(30), @Stock INT, @ReorderLevel INT,
    @ExpiryDate DATE = NULL, @VendorId INT = NULL, @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO InventoryItems (ItemName, Type, Unit, Stock, ReorderLevel, ExpiryDate, VendorId, BranchId)
    VALUES (@ItemName, @Type, @Unit, @Stock, @ReorderLevel, @ExpiryDate, @VendorId, @BranchId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_InventoryItem_RecordMovement
    @InventoryItemId INT, @MovementType NVARCHAR(20), @Quantity INT, @Reason NVARCHAR(300) = NULL, @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @Delta INT = CASE WHEN @MovementType IN ('Sale','Expired') THEN -ABS(@Quantity)
                               WHEN @MovementType = 'Purchase' THEN ABS(@Quantity)
                               ELSE @Quantity END;

    UPDATE InventoryItems SET Stock = Stock + @Delta WHERE Id = @InventoryItemId;
    INSERT INTO InventoryTransactions (InventoryItemId, MovementType, Quantity, Reason, PerformedByUserId)
    VALUES (@InventoryItemId, @MovementType, @Delta, @Reason, @UserId);

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE sp_InventoryItem_GetLowStock
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, ItemName, Type, Unit, Stock, ReorderLevel, ExpiryDate, VendorId, BranchId
    FROM InventoryItems WHERE IsDeleted = 0 AND Stock <= ReorderLevel ORDER BY Stock;
END
GO

CREATE OR ALTER PROCEDURE sp_InventoryItem_GetExpiringSoon
    @WithinDays INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, ItemName, Type, Unit, Stock, ReorderLevel, ExpiryDate, VendorId, BranchId
    FROM InventoryItems
    WHERE IsDeleted = 0 AND ExpiryDate IS NOT NULL AND ExpiryDate <= DATEADD(DAY, @WithinDays, SYSUTCDATETIME())
    ORDER BY ExpiryDate;
END
GO

/* ==================== Purchase Orders ==================== */
CREATE OR ALTER PROCEDURE sp_PurchaseOrder_NextNumber
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year VARCHAR(4) = CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4));
    DECLARE @Next INT = (
        SELECT ISNULL(MAX(CAST(SUBSTRING(PoNumber, 6, 10) AS INT)), 0) + 1
        FROM PurchaseOrders WHERE PoNumber LIKE 'PO' + @Year + '%'
    );
    SELECT 'PO' + @Year + RIGHT('000000' + CAST(@Next AS VARCHAR(10)), 6) AS NextNumber;
END
GO

CREATE OR ALTER PROCEDURE sp_PurchaseOrder_Insert
    @PoNumber NVARCHAR(30), @VendorId INT, @TotalAmount DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO PurchaseOrders (PoNumber, VendorId, TotalAmount) VALUES (@PoNumber, @VendorId, @TotalAmount);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_PurchaseOrderItem_Insert
    @PurchaseOrderId INT, @ItemDescription NVARCHAR(200), @Quantity INT, @UnitPrice DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO PurchaseOrderItems (PurchaseOrderId, ItemDescription, Quantity, UnitPrice)
    VALUES (@PurchaseOrderId, @ItemDescription, @Quantity, @UnitPrice);
END
GO

CREATE OR ALTER PROCEDURE sp_PurchaseOrder_MarkReceived
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE PurchaseOrders SET Status = 'Received' WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_PurchaseOrder_MarkPaid
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE PurchaseOrders SET PaymentDone = 1 WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_PurchaseOrder_GetAll
    @VendorId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT po.Id, po.PoNumber, po.VendorId, v.Name AS VendorName, po.OrderDate, po.TotalAmount, po.Status, po.PaymentDone
    FROM PurchaseOrders po JOIN Vendors v ON v.Id = po.VendorId
    WHERE po.IsDeleted = 0 AND (@VendorId IS NULL OR po.VendorId = @VendorId)
    ORDER BY po.OrderDate DESC;

    SELECT poi.PurchaseOrderId, poi.ItemDescription, poi.Quantity, poi.UnitPrice
    FROM PurchaseOrderItems poi
    JOIN PurchaseOrders po ON po.Id = poi.PurchaseOrderId
    WHERE po.IsDeleted = 0 AND (@VendorId IS NULL OR po.VendorId = @VendorId);
END
GO
