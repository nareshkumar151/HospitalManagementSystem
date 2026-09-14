USE HMS_DB;
GO

-- Redefined here too (idempotent CREATE OR ALTER, same body as 26_Consents.sql) so a fresh install has it
-- available regardless of which of these files happens to run first alphabetically/numerically.
CREATE OR ALTER FUNCTION dbo.fn_UserDisplayName(@UserId INT)
RETURNS NVARCHAR(200)
AS
BEGIN
    DECLARE @Name NVARCHAR(200);
    SELECT @Name = CASE WHEN u.RoleName = 'Doctor' THEN d.FullName ELSE e.FullName END
    FROM Users u
    LEFT JOIN Doctors d ON d.Id = u.LinkedProfileId AND u.RoleName = 'Doctor'
    LEFT JOIN Employees e ON e.Id = u.LinkedProfileId AND u.RoleName <> 'Doctor'
    WHERE u.Id = @UserId;
    RETURN ISNULL(@Name, (SELECT Username FROM Users WHERE Id = @UserId));
END
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

-- @PreparedBySignature: a stylus capture (data:image/png;base64,...) from the person generating the bill,
-- or NULL to leave the printed receipt's signature line blank for a wet-ink signature - see PdfService.
CREATE OR ALTER PROCEDURE sp_Bill_Insert
    @BillNumber NVARCHAR(30), @PatientId INT, @OpdVisitId INT = NULL, @IpdAdmissionId INT = NULL, @Type NVARCHAR(20),
    @SubTotal DECIMAL(12,2), @GstAmount DECIMAL(12,2), @DiscountAmount DECIMAL(12,2), @TotalAmount DECIMAL(12,2),
    @GeneratedByUserId INT, @BranchId INT, @PreparedBySignature NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Bills (BillNumber, PatientId, OpdVisitId, IpdAdmissionId, Type, SubTotal, GstAmount, DiscountAmount,
        TotalAmount, GeneratedByUserId, BranchId, HospitalId, PreparedBySignature)
    VALUES (@BillNumber, @PatientId, @OpdVisitId, @IpdAdmissionId, @Type, @SubTotal, @GstAmount, @DiscountAmount,
        @TotalAmount, @GeneratedByUserId, @BranchId, (SELECT HospitalId FROM Branches WHERE Id = @BranchId), @PreparedBySignature);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

-- @Section: RoomTariff | Consultation | Investigation | GeneralService | Others (NULL prints under "Others" -
-- see PdfService). @ItemDate: NULL defaults to the bill's own BillDate when printed - a single provisional
-- bill can otherwise carry charges dated across several days of a stay.
CREATE OR ALTER PROCEDURE sp_BillItem_Insert
    @BillId INT, @Description NVARCHAR(200), @Quantity INT, @UnitPrice DECIMAL(10,2), @LineTotal DECIMAL(12,2),
    @Section NVARCHAR(30) = NULL, @ItemDate DATETIME2 = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO BillItems (BillId, Description, Quantity, UnitPrice, LineTotal, Section, ItemDate)
    VALUES (@BillId, @Description, @Quantity, @UnitPrice, @LineTotal, @Section, @ItemDate);
END
GO

-- Edit Bill (IPD/Admissions page and Billing) - only ever called on a bill still in 'Pending' status
-- (enforced by BillingService.UpdateBillAsync, not here), so there's never a payment already reconciled
-- against the totals this overwrites.
CREATE OR ALTER PROCEDURE sp_Bill_Update
    @Id INT, @SubTotal DECIMAL(12,2), @GstAmount DECIMAL(12,2), @DiscountAmount DECIMAL(12,2), @TotalAmount DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Bills SET SubTotal = @SubTotal, GstAmount = @GstAmount, DiscountAmount = @DiscountAmount, TotalAmount = @TotalAmount
    WHERE Id = @Id;
END
GO

-- BillItems has no soft-delete column (see 01_Schema.sql) - a hard delete-and-reinsert is this table's own
-- normal pattern, same as how sp_BillItem_Insert already builds a bill's items one row at a time.
CREATE OR ALTER PROCEDURE sp_BillItem_DeleteByBill
    @BillId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM BillItems WHERE BillId = @BillId;
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

    SELECT Description, Quantity, UnitPrice, LineTotal, Section, ItemDate FROM BillItems WHERE BillId = @Id;
END
GO

-- Everything the printable Provisional Bill needs beyond sp_Bill_GetById - patient/doctor/admission header
-- details and the branch's own letterhead info, plus the receipt/payment history - fetched only for the
-- PDF/print view (BillingService.GetReceiptDetailsAsync), not the day-to-day billing list screens.
CREATE OR ALTER PROCEDURE sp_Bill_GetReceiptDetails
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT b.Id, b.BillNumber, b.PatientId, p.FullName AS PatientName, b.Type,
           b.OpdVisitId, b.IpdAdmissionId,
           b.SubTotal, b.GstAmount, b.DiscountAmount, b.TotalAmount, b.PaidAmount, b.Status, b.BillDate, b.BranchId,
           p.UHID AS PatientUhid, p.Age AS PatientAge, p.Gender AS PatientGender,
           CAST(CASE WHEN p.InsuranceCompany IS NOT NULL AND p.InsuranceCompany <> '' THEN 1 ELSE 0 END AS BIT) AS HasInsurance,
           COALESCE(ipd_doc.FullName, opd_doc.FullName) AS DoctorName,
           a.AdmissionNumber, a.AdmissionDate,
           dbo.fn_UserDisplayName(b.GeneratedByUserId) AS GeneratedByName,
           br.Name AS BranchName, br.Address AS BranchAddress, br.ContactNumber AS BranchContactNumber,
           b.PreparedBySignature
    FROM Bills b
    JOIN Patients p ON p.Id = b.PatientId
    JOIN Branches br ON br.Id = b.BranchId
    LEFT JOIN IpdAdmissions a ON a.Id = b.IpdAdmissionId
    LEFT JOIN Doctors ipd_doc ON ipd_doc.Id = a.DoctorId
    LEFT JOIN OpdVisits ov ON ov.Id = b.OpdVisitId
    LEFT JOIN Doctors opd_doc ON opd_doc.Id = ov.DoctorId
    WHERE b.Id = @Id AND b.IsDeleted = 0;

    SELECT Description, Quantity, UnitPrice, LineTotal, Section, ItemDate FROM BillItems WHERE BillId = @Id;

    SELECT ISNULL(ReceiptNumber, '-') AS ReceiptNumber, PaidAt, Amount, Mode, IsRefund
    FROM Payments WHERE BillId = @Id AND IsDeleted = 0 ORDER BY PaidAt;
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

    -- Same NextNumber convention as BillNumber/AdmissionNumber - printed on the provisional bill's receipt
    -- history table (see sp_Bill_GetReceiptDetails).
    DECLARE @Year VARCHAR(4) = CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4));
    DECLARE @NextSeq INT = (
        SELECT ISNULL(MAX(CAST(SUBSTRING(ReceiptNumber, 8, 10) AS INT)), 0) + 1
        FROM Payments WHERE ReceiptNumber LIKE 'REC' + @Year + '%'
    );
    DECLARE @ReceiptNumber VARCHAR(30) = 'REC' + @Year + RIGHT('000000' + CAST(@NextSeq AS VARCHAR(10)), 6);

    INSERT INTO Payments (BillId, Amount, Mode, TransactionReference, IsRefund, ReceivedByUserId, BranchId, HospitalId, ReceiptNumber)
    SELECT @BillId, @Amount, @Mode, @TransactionReference, @IsRefund, @ReceivedByUserId, b.BranchId, b.HospitalId, @ReceiptNumber
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
