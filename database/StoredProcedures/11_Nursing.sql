USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_NursingChart_Insert
    @IpdAdmissionId INT, @NurseUserId INT, @Temperature DECIMAL(5,2) = NULL, @Pulse INT = NULL,
    @BloodPressure NVARCHAR(20) = NULL, @Oxygen DECIMAL(5,2) = NULL, @Weight DECIMAL(6,2) = NULL,
    @SugarLevel DECIMAL(6,2) = NULL, @MedicationSchedule NVARCHAR(400) = NULL,
    @DailyNotes NVARCHAR(MAX) = NULL, @PatientMonitoring NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO NursingCharts (IpdAdmissionId, NurseUserId, Temperature, Pulse, BloodPressure, Oxygen, Weight,
        SugarLevel, MedicationSchedule, DailyNotes, PatientMonitoring)
    VALUES (@IpdAdmissionId, @NurseUserId, @Temperature, @Pulse, @BloodPressure, @Oxygen, @Weight,
        @SugarLevel, @MedicationSchedule, @DailyNotes, @PatientMonitoring);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_NursingChart_GetByAdmission
    @IpdAdmissionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT nc.Id, nc.IpdAdmissionId, nc.NurseUserId, u.Username AS NurseName, nc.RecordedAt, nc.Temperature,
           nc.Pulse, nc.BloodPressure, nc.Oxygen, nc.Weight, nc.SugarLevel, nc.MedicationSchedule,
           nc.DailyNotes, nc.PatientMonitoring
    FROM NursingCharts nc JOIN Users u ON u.Id = nc.NurseUserId
    WHERE nc.IpdAdmissionId = @IpdAdmissionId AND nc.IsDeleted = 0
    ORDER BY nc.RecordedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_NursingRequest_Insert
    @IpdAdmissionId INT, @NurseUserId INT, @RequestType NVARCHAR(30), @Details NVARCHAR(400)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO NursingRequests (IpdAdmissionId, NurseUserId, RequestType, Details)
    VALUES (@IpdAdmissionId, @NurseUserId, @RequestType, @Details);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_NursingRequest_GetByAdmission
    @IpdAdmissionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, IpdAdmissionId, RequestType, Details, Status, CreatedAt
    FROM NursingRequests WHERE IpdAdmissionId = @IpdAdmissionId AND IsDeleted = 0
    ORDER BY CreatedAt DESC;
END
GO
