USE HMS_DB;
GO
-- The filtered unique index on SurgeryChecklists requires QUOTED_IDENTIFIER ON to have been in effect when
-- sp_SurgeryChecklist_Upsert was created, or its UPDATE against that table fails at execution time.
SET QUOTED_IDENTIFIER ON;
GO

-- One checklist per (SurgeryId, ChecklistType): re-saving updates the existing document (matches the
-- UX_SurgeryChecklists_Surgery_Type filtered unique index) so staff can correct/complete it in place.
CREATE OR ALTER PROCEDURE sp_SurgeryChecklist_Upsert
    @SurgeryId INT, @ChecklistType NVARCHAR(30), @ItemsJson NVARCHAR(MAX), @Remarks NVARCHAR(400) = NULL,
    @CompletedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Id INT = (SELECT Id FROM SurgeryChecklists WHERE SurgeryId = @SurgeryId AND ChecklistType = @ChecklistType AND IsDeleted = 0);

    IF @Id IS NOT NULL
    BEGIN
        UPDATE SurgeryChecklists
        SET ItemsJson = @ItemsJson, Remarks = @Remarks, CompletedByUserId = @CompletedByUserId, CompletedAt = SYSUTCDATETIME()
        WHERE Id = @Id;
    END
    ELSE
    BEGIN
        INSERT INTO SurgeryChecklists (SurgeryId, ChecklistType, ItemsJson, Remarks, CompletedByUserId)
        VALUES (@SurgeryId, @ChecklistType, @ItemsJson, @Remarks, @CompletedByUserId);
        SET @Id = CAST(SCOPE_IDENTITY() AS INT);
    END

    SELECT @Id AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_SurgeryChecklist_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.SurgeryId, c.ChecklistType, c.ItemsJson, c.Remarks, u.Username AS CompletedByName, c.CompletedAt
    FROM SurgeryChecklists c JOIN Users u ON u.Id = c.CompletedByUserId
    WHERE c.Id = @Id AND c.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_SurgeryChecklist_GetBySurgery
    @SurgeryId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.SurgeryId, c.ChecklistType, c.ItemsJson, c.Remarks, u.Username AS CompletedByName, c.CompletedAt
    FROM SurgeryChecklists c JOIN Users u ON u.Id = c.CompletedByUserId
    WHERE c.SurgeryId = @SurgeryId AND c.IsDeleted = 0
    ORDER BY c.ChecklistType;
END
GO

CREATE OR ALTER PROCEDURE sp_SurgeryAnesthesiaRecord_Insert
    @SurgeryId INT, @AnesthesiaType NVARCHAR(100) = NULL, @BloodPressure NVARCHAR(20) = NULL,
    @PulseRate INT = NULL, @SpO2 DECIMAL(5,2) = NULL, @Temperature DECIMAL(5,2) = NULL,
    @Remarks NVARCHAR(400) = NULL, @RecordedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO SurgeryAnesthesiaRecords (SurgeryId, AnesthesiaType, BloodPressure, PulseRate, SpO2, Temperature, Remarks, RecordedByUserId)
    VALUES (@SurgeryId, @AnesthesiaType, @BloodPressure, @PulseRate, @SpO2, @Temperature, @Remarks, @RecordedByUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_SurgeryAnesthesiaRecord_GetBySurgery
    @SurgeryId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.SurgeryId, a.RecordedAt, u.Username AS RecordedByName, a.AnesthesiaType, a.BloodPressure,
           a.PulseRate, a.SpO2, a.Temperature, a.Remarks
    FROM SurgeryAnesthesiaRecords a JOIN Users u ON u.Id = a.RecordedByUserId
    WHERE a.SurgeryId = @SurgeryId AND a.IsDeleted = 0
    ORDER BY a.RecordedAt;
END
GO

CREATE OR ALTER PROCEDURE sp_SurgeryRecoveryRecord_Insert
    @SurgeryId INT, @Activity INT, @Respiration INT, @Circulation INT, @Consciousness INT, @OxygenSaturation INT,
    @BloodPressure NVARCHAR(20) = NULL, @Pulse INT = NULL, @SpO2 DECIMAL(5,2) = NULL, @Remarks NVARCHAR(400) = NULL,
    @RecordedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO SurgeryRecoveryRecords (
        SurgeryId, Activity, Respiration, Circulation, Consciousness, OxygenSaturation, BloodPressure, Pulse,
        SpO2, Remarks, RecordedByUserId)
    VALUES (
        @SurgeryId, @Activity, @Respiration, @Circulation, @Consciousness, @OxygenSaturation, @BloodPressure,
        @Pulse, @SpO2, @Remarks, @RecordedByUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_SurgeryRecoveryRecord_GetBySurgery
    @SurgeryId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id, r.SurgeryId, r.RecordedAt, u.Username AS RecordedByName, r.Activity, r.Respiration,
           r.Circulation, r.Consciousness, r.OxygenSaturation,
           (r.Activity + r.Respiration + r.Circulation + r.Consciousness + r.OxygenSaturation) AS AldreteTotal,
           r.BloodPressure, r.Pulse, r.SpO2, r.Remarks, r.DischargedFromRecoveryAt
    FROM SurgeryRecoveryRecords r JOIN Users u ON u.Id = r.RecordedByUserId
    WHERE r.SurgeryId = @SurgeryId AND r.IsDeleted = 0
    ORDER BY r.RecordedAt;
END
GO

CREATE OR ALTER PROCEDURE sp_SurgeryRecoveryRecord_MarkDischarged
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE SurgeryRecoveryRecords SET DischargedFromRecoveryAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO
