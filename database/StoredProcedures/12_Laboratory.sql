USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_LabTestCatalog_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, TestName, Category, Price, NormalRange FROM LabTestCatalog WHERE IsDeleted = 0 ORDER BY Category, TestName;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestCatalog_Insert
    @TestName NVARCHAR(150), @Category NVARCHAR(50), @Price DECIMAL(10,2), @NormalRange NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO LabTestCatalog (TestName, Category, Price, NormalRange) VALUES (@TestName, @Category, @Price, @NormalRange);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestCatalog_Update
    @Id INT, @TestName NVARCHAR(150), @Category NVARCHAR(50), @Price DECIMAL(10,2), @NormalRange NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE LabTestCatalog SET TestName=@TestName, Category=@Category, Price=@Price, NormalRange=@NormalRange WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestCatalog_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE LabTestCatalog SET IsDeleted = 1 WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestOrder_Insert
    @PatientId INT, @DoctorId INT, @LabTestCatalogId INT, @OpdVisitId INT = NULL, @IpdAdmissionId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO LabTestOrders (PatientId, DoctorId, LabTestCatalogId, OpdVisitId, IpdAdmissionId)
    VALUES (@PatientId, @DoctorId, @LabTestCatalogId, @OpdVisitId, @IpdAdmissionId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestOrder_CollectSample
    @Id INT, @CollectedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE LabTestOrders SET Status = 'SampleCollected', SampleCollectedAt = SYSUTCDATETIME(), CollectedByUserId = @CollectedByUserId
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_LabReport_Insert
    @LabTestOrderId INT, @ResultSummary NVARCHAR(MAX) = NULL, @ReportFileUrl NVARCHAR(400) = NULL, @UploadedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    INSERT INTO LabReports (LabTestOrderId, ResultSummary, ReportFileUrl, UploadedByUserId)
    VALUES (@LabTestOrderId, @ResultSummary, @ReportFileUrl, @UploadedByUserId);

    UPDATE LabTestOrders SET Status = 'ReportUploaded' WHERE Id = @LabTestOrderId;

    COMMIT TRANSACTION;
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_LabReport_Review
    @LabTestOrderId INT, @DoctorRemarks NVARCHAR(400)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE LabReports SET ReviewedByDoctor = 1, DoctorRemarks = @DoctorRemarks WHERE LabTestOrderId = @LabTestOrderId;
    UPDATE LabTestOrders SET Status = 'Reviewed' WHERE Id = @LabTestOrderId;

    COMMIT TRANSACTION;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestOrder_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.Id, o.PatientId, p.FullName AS PatientName, o.DoctorId, doc.FullName AS DoctorName,
           o.LabTestCatalogId, c.TestName, o.Status, o.OrderedAt, o.SampleCollectedAt
    FROM LabTestOrders o
    JOIN Patients p ON p.Id = o.PatientId
    JOIN Doctors doc ON doc.Id = o.DoctorId
    JOIN LabTestCatalog c ON c.Id = o.LabTestCatalogId
    WHERE o.Id = @Id AND o.IsDeleted = 0;

    SELECT Id, LabTestOrderId, ResultSummary, ReportFileUrl, UploadedAt, ReviewedByDoctor, DoctorRemarks
    FROM LabReports WHERE LabTestOrderId = @Id AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestOrder_GetPending
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.Id, o.PatientId, p.FullName AS PatientName, o.DoctorId, doc.FullName AS DoctorName,
           o.LabTestCatalogId, c.TestName, o.Status, o.OrderedAt, o.SampleCollectedAt
    FROM LabTestOrders o
    JOIN Patients p ON p.Id = o.PatientId
    JOIN Doctors doc ON doc.Id = o.DoctorId
    JOIN LabTestCatalog c ON c.Id = o.LabTestCatalogId
    WHERE o.Status <> 'Reviewed' AND o.IsDeleted = 0
    ORDER BY o.OrderedAt;
END
GO

CREATE OR ALTER PROCEDURE sp_LabTestOrder_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.Id, o.PatientId, p.FullName AS PatientName, o.DoctorId, doc.FullName AS DoctorName,
           o.LabTestCatalogId, c.TestName, o.Status, o.OrderedAt, o.SampleCollectedAt
    FROM LabTestOrders o
    JOIN Patients p ON p.Id = o.PatientId
    JOIN Doctors doc ON doc.Id = o.DoctorId
    JOIN LabTestCatalog c ON c.Id = o.LabTestCatalogId
    WHERE o.PatientId = @PatientId AND o.IsDeleted = 0
    ORDER BY o.OrderedAt DESC;
END
GO
