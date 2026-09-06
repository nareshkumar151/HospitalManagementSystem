USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_TransfusionReaction_Insert
    @PatientId INT, @IpdAdmissionId INT = NULL, @BloodGroup NVARCHAR(15) = NULL, @ComponentTransfused NVARCHAR(30),
    @UnitsTransfused DECIMAL(5,2) = NULL, @ReactionType NVARCHAR(30), @Symptoms NVARCHAR(400) = NULL,
    @ActionTaken NVARCHAR(400) = NULL, @Outcome NVARCHAR(20), @Remarks NVARCHAR(400) = NULL, @ReportedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO TransfusionReactions (
        PatientId, IpdAdmissionId, BloodGroup, ComponentTransfused, UnitsTransfused, ReactionType, Symptoms,
        ActionTaken, Outcome, Remarks, ReportedByUserId)
    VALUES (
        @PatientId, @IpdAdmissionId, @BloodGroup, @ComponentTransfused, @UnitsTransfused, @ReactionType, @Symptoms,
        @ActionTaken, @Outcome, @Remarks, @ReportedByUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_TransfusionReaction_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT r.Id, r.PatientId, p.FullName AS PatientName, r.IpdAdmissionId, r.BloodGroup, r.ComponentTransfused,
           r.UnitsTransfused, r.ReactionType, r.Symptoms, r.OnsetTime, r.ActionTaken, r.Outcome, r.Remarks,
           u.Username AS ReportedByName
    FROM TransfusionReactions r JOIN Patients p ON p.Id = r.PatientId JOIN Users u ON u.Id = r.ReportedByUserId
    WHERE r.PatientId = @PatientId AND r.IsDeleted = 0
    ORDER BY r.OnsetTime DESC;
END
GO
