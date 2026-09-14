USE HMS_DB;
GO
-- Required for sp_NursingChart_UpsertForAppointment's INSERT/UPDATE against NursingCharts, which carries a
-- filtered unique index (IX_NursingCharts_Appointment, see 28_Schema_AppointmentVitals.sql).
SET QUOTED_IDENTIFIER ON;
GO

-- Redefined here too (idempotent CREATE OR ALTER, same body as 26_Consents.sql) purely so a fresh install
-- has it available regardless of which of these two files happens to run first alphabetically/numerically.
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

CREATE OR ALTER PROCEDURE sp_NursingChart_Insert
    @IpdAdmissionId INT, @NurseUserId INT, @Temperature DECIMAL(5,2) = NULL, @Pulse INT = NULL,
    @BloodPressure NVARCHAR(20) = NULL, @Oxygen DECIMAL(5,2) = NULL, @Weight DECIMAL(6,2) = NULL,
    @SugarLevel DECIMAL(6,2) = NULL, @MedicationSchedule NVARCHAR(400) = NULL,
    @DailyNotes NVARCHAR(MAX) = NULL, @PatientMonitoring NVARCHAR(MAX) = NULL,
    @RespiratoryRate INT = NULL, @PainScore INT = NULL, @Consciousness NVARCHAR(15) = NULL,
    @EarlyWarningScore INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO NursingCharts (IpdAdmissionId, NurseUserId, Temperature, Pulse, BloodPressure, Oxygen, Weight,
        SugarLevel, MedicationSchedule, DailyNotes, PatientMonitoring, RespiratoryRate, PainScore, Consciousness, EarlyWarningScore)
    VALUES (@IpdAdmissionId, @NurseUserId, @Temperature, @Pulse, @BloodPressure, @Oxygen, @Weight,
        @SugarLevel, @MedicationSchedule, @DailyNotes, @PatientMonitoring, @RespiratoryRate, @PainScore, @Consciousness, @EarlyWarningScore);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_NursingChart_GetByAdmission
    @IpdAdmissionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT nc.Id, nc.IpdAdmissionId, nc.AppointmentId, nc.NurseUserId, dbo.fn_UserDisplayName(nc.NurseUserId) AS NurseName, nc.RecordedAt, nc.Temperature,
           nc.Pulse, nc.BloodPressure, nc.Oxygen, nc.Weight, nc.SugarLevel, nc.MedicationSchedule,
           nc.DailyNotes, nc.PatientMonitoring, nc.RespiratoryRate, nc.PainScore, nc.Consciousness, nc.EarlyWarningScore
    FROM NursingCharts nc
    WHERE nc.IpdAdmissionId = @IpdAdmissionId AND nc.IsDeleted = 0
    ORDER BY nc.RecordedAt DESC;
END
GO

-- Appointment-linked vitals are a single editable snapshot (one row per appointment), not a running log -
-- a nurse can revisit and correct a reading taken at check-in without spawning duplicate history rows.
-- Update-if-exists / insert-if-not, keyed on the unique-per-appointment index (28_Schema_AppointmentVitals.sql).
CREATE OR ALTER PROCEDURE sp_NursingChart_UpsertForAppointment
    @AppointmentId INT, @NurseUserId INT, @Temperature DECIMAL(5,2) = NULL, @Pulse INT = NULL,
    @BloodPressure NVARCHAR(20) = NULL, @Oxygen DECIMAL(5,2) = NULL, @Weight DECIMAL(6,2) = NULL,
    @SugarLevel DECIMAL(6,2) = NULL, @MedicationSchedule NVARCHAR(400) = NULL,
    @DailyNotes NVARCHAR(MAX) = NULL, @PatientMonitoring NVARCHAR(MAX) = NULL,
    @RespiratoryRate INT = NULL, @PainScore INT = NULL, @Consciousness NVARCHAR(15) = NULL,
    @EarlyWarningScore INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id INT = (SELECT Id FROM NursingCharts WHERE AppointmentId = @AppointmentId AND IsDeleted = 0);

    IF @Id IS NULL
    BEGIN
        INSERT INTO NursingCharts (AppointmentId, NurseUserId, Temperature, Pulse, BloodPressure, Oxygen, Weight,
            SugarLevel, MedicationSchedule, DailyNotes, PatientMonitoring, RespiratoryRate, PainScore, Consciousness, EarlyWarningScore)
        VALUES (@AppointmentId, @NurseUserId, @Temperature, @Pulse, @BloodPressure, @Oxygen, @Weight,
            @SugarLevel, @MedicationSchedule, @DailyNotes, @PatientMonitoring, @RespiratoryRate, @PainScore, @Consciousness, @EarlyWarningScore);
        SET @Id = CAST(SCOPE_IDENTITY() AS INT);
    END
    ELSE
    BEGIN
        UPDATE NursingCharts SET
            NurseUserId = @NurseUserId, Temperature = @Temperature, Pulse = @Pulse, BloodPressure = @BloodPressure,
            Oxygen = @Oxygen, Weight = @Weight, SugarLevel = @SugarLevel, MedicationSchedule = @MedicationSchedule,
            DailyNotes = @DailyNotes, PatientMonitoring = @PatientMonitoring, RespiratoryRate = @RespiratoryRate,
            PainScore = @PainScore, Consciousness = @Consciousness, EarlyWarningScore = @EarlyWarningScore,
            RecordedAt = SYSUTCDATETIME()
        WHERE Id = @Id;
    END

    SELECT @Id AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_NursingChart_GetByAppointment
    @AppointmentId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT nc.Id, nc.IpdAdmissionId, nc.AppointmentId, nc.NurseUserId, dbo.fn_UserDisplayName(nc.NurseUserId) AS NurseName, nc.RecordedAt, nc.Temperature,
           nc.Pulse, nc.BloodPressure, nc.Oxygen, nc.Weight, nc.SugarLevel, nc.MedicationSchedule,
           nc.DailyNotes, nc.PatientMonitoring, nc.RespiratoryRate, nc.PainScore, nc.Consciousness, nc.EarlyWarningScore
    FROM NursingCharts nc
    WHERE nc.AppointmentId = @AppointmentId AND nc.IsDeleted = 0;
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
