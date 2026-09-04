USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Bill_NextNumber
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year VARCHAR(4) = CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4));
    DECLARE @Next INT = (
        SELECT ISNULL(MAX(CAST(SUBSTRING(BillNumber, 8, 10) AS INT)), 0) + 1
        FROM Bills WHERE BillNumber LIKE 'BIL' + @Year + '%'
    );
    SELECT 'BIL' + @Year + RIGHT('000000' + CAST(@Next AS VARCHAR(10)), 6) AS NextNumber;
END
GO

CREATE OR ALTER PROCEDURE sp_Bill_Insert
    @BillNumber NVARCHAR(30), @PatientId INT, @OpdVisitId INT = NULL, @IpdAdmissionId INT = NULL, @Type NVARCHAR(20),
    @SubTotal DECIMAL(12,2), @GstAmount DECIMAL(12,2), @DiscountAmount DECIMAL(12,2), @TotalAmount DECIMAL(12,2),
    @GeneratedByUserId INT, @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Bills (BillNumber, PatientId, OpdVisitId, IpdAdmissionId, Type, SubTotal, GstAmount, DiscountAmount,
        TotalAmount, GeneratedByUserId, BranchId, HospitalId)
    VALUES (@BillNumber, @PatientId, @OpdVisitId, @IpdAdmissionId, @Type, @SubTotal, @GstAmount, @DiscountAmount,
        @TotalAmount, @GeneratedByUserId, @BranchId, (SELECT HospitalId FROM Branches WHERE Id = @BranchId));
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_BillItem_Insert
    @BillId INT, @Description NVARCHAR(200), @Quantity INT, @UnitPrice DECIMAL(10,2), @LineTotal DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO BillItems (BillId, Description, Quantity, UnitPrice, LineTotal)
    VALUES (@BillId, @Description, @Quantity, @UnitPrice, @LineTotal);
END
GO

CREATE OR ALTER PROCEDURE sp_Bill_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT b.Id, b.BillNumber, b.PatientId, p.FullName AS PatientName, b.Type,
           b.OpdVisitId, b.IpdAdmissionId,
           b.SubTotal, b.GstAmount, b.DiscountAmount, b.TotalAmount, b.PaidAmount, b.Status, b.BillDate, b.BranchId
    FROM Bills b JOIN Patients p ON p.Id = b.PatientId
    WHERE b.Id = @Id AND b.IsDeleted = 0;

    SELECT Description, Quantity, UnitPrice, LineTotal FROM BillItems WHERE BillId = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Bill_Search
    @BranchId INT, @PageNumber INT = 1, @PageSize INT = 20, @Status NVARCHAR(20) = NULL, @Category NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- @Category: 'IPD' = linked to an admission, 'OPD' = everything else (walk-in or linked to an OPD visit).
    SELECT b.Id, b.BillNumber, b.PatientId, p.FullName AS PatientName, b.Type,
           b.OpdVisitId, b.IpdAdmissionId,
           b.SubTotal, b.GstAmount, b.DiscountAmount, b.TotalAmount, b.PaidAmount, b.Status, b.BillDate, b.BranchId
    FROM Bills b JOIN Patients p ON p.Id = b.PatientId
    WHERE b.IsDeleted = 0 AND b.BranchId = @BranchId AND (@Status IS NULL OR b.Status = @Status)
      AND (@Category IS NULL
           OR (@Category = 'IPD' AND b.IpdAdmissionId IS NOT NULL)
           OR (@Category = 'OPD' AND b.IpdAdmissionId IS NULL))
    ORDER BY b.BillDate DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM Bills b
    WHERE b.IsDeleted = 0 AND b.BranchId = @BranchId AND (@Status IS NULL OR b.Status = @Status)
      AND (@Category IS NULL
           OR (@Category = 'IPD' AND b.IpdAdmissionId IS NOT NULL)
           OR (@Category = 'OPD' AND b.IpdAdmissionId IS NULL));
END
GO

CREATE OR ALTER PROCEDURE sp_Bill_GetByPatient
    @PatientId INT, @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- @BranchId scopes to one branch's bills for this patient (front-desk/staff lookup); NULL returns
    -- every bill this patient has ever been issued across every branch (their own "my bills" view).
    SELECT b.Id, b.BillNumber, b.PatientId, p.FullName AS PatientName, b.Type,
           b.OpdVisitId, b.IpdAdmissionId,
           b.SubTotal, b.GstAmount, b.DiscountAmount, b.TotalAmount, b.PaidAmount, b.Status, b.BillDate, b.BranchId
    FROM Bills b JOIN Patients p ON p.Id = b.PatientId
    WHERE b.PatientId = @PatientId AND b.IsDeleted = 0 AND (@BranchId IS NULL OR b.BranchId = @BranchId)
    ORDER BY b.BillDate DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_Bill_GetPending
    @BranchId INT, @Category NVARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT b.Id, b.BillNumber, b.PatientId, p.FullName AS PatientName, b.Type,
           b.OpdVisitId, b.IpdAdmissionId,
           b.SubTotal, b.GstAmount, b.DiscountAmount, b.TotalAmount, b.PaidAmount, b.Status, b.BillDate, b.BranchId
    FROM Bills b JOIN Patients p ON p.Id = b.PatientId
    WHERE b.IsDeleted = 0 AND b.BranchId = @BranchId AND b.Status IN ('Pending','PartiallyPaid')
      AND (@Category IS NULL
           OR (@Category = 'IPD' AND b.IpdAdmissionId IS NOT NULL)
           OR (@Category = 'OPD' AND b.IpdAdmissionId IS NULL))
    ORDER BY b.BillDate;
END
GO

/* Applies a payment/refund, updates PaidAmount and derives the new Status in one transaction. */
CREATE OR ALTER PROCEDURE sp_Payment_Collect
    @BillId INT, @Amount DECIMAL(12,2), @Mode NVARCHAR(20), @TransactionReference NVARCHAR(100) = NULL,
    @IsRefund BIT, @ReceivedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    INSERT INTO Payments (BillId, Amount, Mode, TransactionReference, IsRefund, ReceivedByUserId, BranchId, HospitalId)
    SELECT @BillId, @Amount, @Mode, @TransactionReference, @IsRefund, @ReceivedByUserId, b.BranchId, b.HospitalId
    FROM Bills b WHERE b.Id = @BillId;
    DECLARE @NewPaymentId INT = CAST(SCOPE_IDENTITY() AS INT);

    UPDATE Bills SET PaidAmount = PaidAmount + (CASE WHEN @IsRefund = 1 THEN -@Amount ELSE @Amount END)
    WHERE Id = @BillId;

    UPDATE Bills SET Status = CASE
        WHEN PaidAmount <= 0 THEN 'Pending'
        WHEN PaidAmount >= TotalAmount THEN 'Paid'
        ELSE 'PartiallyPaid' END
    WHERE Id = @BillId;

    COMMIT TRANSACTION;
    SELECT @NewPaymentId AS NewId;
END
GO
