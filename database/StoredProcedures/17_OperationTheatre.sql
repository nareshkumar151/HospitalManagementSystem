USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Surgery_Insert
    @PatientId INT, @IpdAdmissionId INT, @SurgeryName NVARCHAR(200), @SurgeonDoctorId INT,
    @AssistantDoctorId INT = NULL, @NurseUserId INT = NULL, @Equipment NVARCHAR(400) = NULL,
    @ScheduledAt DATETIME2, @OperationCost DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Surgeries (PatientId, IpdAdmissionId, SurgeryName, SurgeonDoctorId, AssistantDoctorId, NurseUserId,
        Equipment, ScheduledAt, OperationCost)
    VALUES (@PatientId, @IpdAdmissionId, @SurgeryName, @SurgeonDoctorId, @AssistantDoctorId, @NurseUserId,
        @Equipment, @ScheduledAt, @OperationCost);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Surgery_Complete
    @Id INT, @OperationNotes NVARCHAR(MAX), @Anesthesia NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Surgeries SET Status = 'Completed', CompletedAt = SYSUTCDATETIME(), OperationNotes = @OperationNotes,
        Anesthesia = @Anesthesia
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Surgery_Cancel
    @Id INT, @Reason NVARCHAR(400)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Surgeries SET Status = 'Cancelled', OperationNotes = @Reason WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Surgery_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id, s.PatientId, p.FullName AS PatientName, s.IpdAdmissionId, s.SurgeryName, s.SurgeonDoctorId,
           doc.FullName AS SurgeonName, s.AssistantDoctorId, s.NurseUserId, s.Equipment, s.ScheduledAt,
           s.CompletedAt, s.OperationNotes, s.Anesthesia, s.OperationCost, s.Status
    FROM Surgeries s JOIN Patients p ON p.Id = s.PatientId JOIN Doctors doc ON doc.Id = s.SurgeonDoctorId
    WHERE s.Id = @Id AND s.IsDeleted = 0;
END
GO

-- @BranchId scopes "today's schedule" to one hospital branch, so Branch A's OT staff never sees Branch B's
-- surgeries mixed into the same work queue.
CREATE OR ALTER PROCEDURE sp_Surgery_GetTodaysSchedule
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id, s.PatientId, p.FullName AS PatientName, s.IpdAdmissionId, s.SurgeryName, s.SurgeonDoctorId,
           doc.FullName AS SurgeonName, s.AssistantDoctorId, s.NurseUserId, s.Equipment, s.ScheduledAt,
           s.CompletedAt, s.OperationNotes, s.Anesthesia, s.OperationCost, s.Status
    FROM Surgeries s
    JOIN Patients p ON p.Id = s.PatientId
    JOIN Doctors doc ON doc.Id = s.SurgeonDoctorId
    JOIN IpdAdmissions a ON a.Id = s.IpdAdmissionId
    WHERE CAST(s.ScheduledAt AS DATE) = CAST(SYSUTCDATETIME() AS DATE) AND s.IsDeleted = 0 AND a.BranchId = @BranchId
    ORDER BY s.ScheduledAt;
END
GO

CREATE OR ALTER PROCEDURE sp_Surgery_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id, s.PatientId, p.FullName AS PatientName, s.IpdAdmissionId, s.SurgeryName, s.SurgeonDoctorId,
           doc.FullName AS SurgeonName, s.AssistantDoctorId, s.NurseUserId, s.Equipment, s.ScheduledAt,
           s.CompletedAt, s.OperationNotes, s.Anesthesia, s.OperationCost, s.Status
    FROM Surgeries s JOIN Patients p ON p.Id = s.PatientId JOIN Doctors doc ON doc.Id = s.SurgeonDoctorId
    WHERE s.PatientId = @PatientId AND s.IsDeleted = 0
    ORDER BY s.ScheduledAt DESC;
END
GO
