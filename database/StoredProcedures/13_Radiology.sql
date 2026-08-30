USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_RadiologyOrder_Insert
    @PatientId INT, @DoctorId INT, @ScanType NVARCHAR(50), @Price DECIMAL(10,2), @OpdVisitId INT = NULL, @IpdAdmissionId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO RadiologyOrders (PatientId, DoctorId, ScanType, Price, OpdVisitId, IpdAdmissionId)
    VALUES (@PatientId, @DoctorId, @ScanType, @Price, @OpdVisitId, @IpdAdmissionId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_RadiologyReport_Insert
    @RadiologyOrderId INT, @ImageUrl NVARCHAR(400) = NULL, @ReportFileUrl NVARCHAR(400) = NULL,
    @DoctorNotes NVARCHAR(MAX) = NULL, @UploadedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    INSERT INTO RadiologyReports (RadiologyOrderId, ImageUrl, ReportFileUrl, DoctorNotes, UploadedByUserId)
    VALUES (@RadiologyOrderId, @ImageUrl, @ReportFileUrl, @DoctorNotes, @UploadedByUserId);

    UPDATE RadiologyOrders SET Status = 'Completed' WHERE Id = @RadiologyOrderId;

    COMMIT TRANSACTION;
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_RadiologyOrder_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.Id, o.PatientId, p.FullName AS PatientName, o.DoctorId, doc.FullName AS DoctorName,
           o.ScanType, o.Status, o.OrderedAt, o.Price, r.ImageUrl, r.ReportFileUrl, r.DoctorNotes
    FROM RadiologyOrders o
    JOIN Patients p ON p.Id = o.PatientId
    JOIN Doctors doc ON doc.Id = o.DoctorId
    LEFT JOIN RadiologyReports r ON r.RadiologyOrderId = o.Id
    WHERE o.Id = @Id AND o.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_RadiologyOrder_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.Id, o.PatientId, p.FullName AS PatientName, o.DoctorId, doc.FullName AS DoctorName,
           o.ScanType, o.Status, o.OrderedAt, o.Price, r.ImageUrl, r.ReportFileUrl, r.DoctorNotes
    FROM RadiologyOrders o
    JOIN Patients p ON p.Id = o.PatientId
    JOIN Doctors doc ON doc.Id = o.DoctorId
    LEFT JOIN RadiologyReports r ON r.RadiologyOrderId = o.Id
    WHERE o.PatientId = @PatientId AND o.IsDeleted = 0
    ORDER BY o.OrderedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_RadiologyOrder_GetPending
AS
BEGIN
    SET NOCOUNT ON;
    SELECT o.Id, o.PatientId, p.FullName AS PatientName, o.DoctorId, doc.FullName AS DoctorName,
           o.ScanType, o.Status, o.OrderedAt, o.Price, NULL AS ImageUrl, NULL AS ReportFileUrl, NULL AS DoctorNotes
    FROM RadiologyOrders o
    JOIN Patients p ON p.Id = o.PatientId
    JOIN Doctors doc ON doc.Id = o.DoctorId
    WHERE o.Status IN ('Ordered','Scheduled') AND o.IsDeleted = 0
    ORDER BY o.OrderedAt;
END
GO
