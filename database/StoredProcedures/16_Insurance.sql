USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_InsuranceClaim_Insert
    @PatientId INT, @BillId INT = NULL, @InsuranceCompany NVARCHAR(150), @PolicyNumber NVARCHAR(100), @CoverageAmount DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO InsuranceClaims (PatientId, BillId, InsuranceCompany, PolicyNumber, CoverageAmount)
    VALUES (@PatientId, @BillId, @InsuranceCompany, @PolicyNumber, @CoverageAmount);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_InsuranceClaim_UpdateStatus
    @Id INT, @Status NVARCHAR(20), @ApprovedAmount DECIMAL(12,2) = NULL, @Remarks NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE InsuranceClaims SET Status = @Status, ApprovedAmount = @ApprovedAmount, Remarks = @Remarks WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_InsuranceClaim_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.BillId, c.InsuranceCompany, c.PolicyNumber,
           c.CoverageAmount, c.ApprovedAmount, c.Status, c.SubmittedAt, c.Remarks
    FROM InsuranceClaims c JOIN Patients p ON p.Id = c.PatientId
    WHERE c.PatientId = @PatientId AND c.IsDeleted = 0
    ORDER BY c.SubmittedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_InsuranceClaim_GetAll
    @Status NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.BillId, c.InsuranceCompany, c.PolicyNumber,
           c.CoverageAmount, c.ApprovedAmount, c.Status, c.SubmittedAt, c.Remarks
    FROM InsuranceClaims c JOIN Patients p ON p.Id = c.PatientId
    WHERE c.IsDeleted = 0 AND (@Status IS NULL OR c.Status = @Status)
    ORDER BY c.SubmittedAt DESC;
END
GO
