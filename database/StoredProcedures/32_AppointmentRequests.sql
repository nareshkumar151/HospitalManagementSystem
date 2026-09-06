USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_AppointmentRequest_Insert
    @AppointmentId INT, @RequestedByDoctorId INT, @RequestType NVARCHAR(20), @Reason NVARCHAR(400)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AppointmentRequests (AppointmentId, RequestedByDoctorId, RequestType, Reason)
    VALUES (@AppointmentId, @RequestedByDoctorId, @RequestType, @Reason);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_AppointmentRequest_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id, r.AppointmentId, p.FullName AS PatientName, doc.FullName AS DoctorName,
           a.AppointmentDate, a.TimeSlot, r.RequestType, r.Reason, r.Status, r.CreatedAt
    FROM AppointmentRequests r
    JOIN Appointments a ON a.Id = r.AppointmentId
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = r.RequestedByDoctorId
    WHERE r.Id = @Id AND r.IsDeleted = 0;
END
GO

-- @BranchId scopes the review queue to one branch, via the underlying appointment.
CREATE OR ALTER PROCEDURE sp_AppointmentRequest_GetPending
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id, r.AppointmentId, p.FullName AS PatientName, doc.FullName AS DoctorName,
           a.AppointmentDate, a.TimeSlot, r.RequestType, r.Reason, r.Status, r.CreatedAt
    FROM AppointmentRequests r
    JOIN Appointments a ON a.Id = r.AppointmentId
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = r.RequestedByDoctorId
    WHERE a.BranchId = @BranchId AND r.Status = 'Pending' AND r.IsDeleted = 0
    ORDER BY r.CreatedAt;
END
GO

CREATE OR ALTER PROCEDURE sp_AppointmentRequest_Resolve
    @Id INT, @Status NVARCHAR(20), @ResolvedByUserId INT, @ResolutionNotes NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE AppointmentRequests
    SET Status = @Status, ResolvedByUserId = @ResolvedByUserId, ResolutionNotes = @ResolutionNotes, ResolvedAt = SYSUTCDATETIME()
    WHERE Id = @Id;

    SELECT AppointmentId FROM AppointmentRequests WHERE Id = @Id;
END
GO
