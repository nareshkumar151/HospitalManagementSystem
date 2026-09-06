USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_DialysisSession_Insert
    @PatientId INT, @IpdAdmissionId INT = NULL, @DialysisType NVARCHAR(20), @DurationMinutes INT = NULL,
    @PreWeight DECIMAL(6,2) = NULL, @PostWeight DECIMAL(6,2) = NULL, @PreBloodPressure NVARCHAR(20) = NULL,
    @PostBloodPressure NVARCHAR(20) = NULL, @DialyzerType NVARCHAR(100) = NULL, @BloodFlowRate DECIMAL(6,2) = NULL,
    @UfGoal DECIMAL(6,2) = NULL, @UfAchieved DECIMAL(6,2) = NULL, @Complications NVARCHAR(400) = NULL,
    @Remarks NVARCHAR(400) = NULL, @PerformedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO DialysisSessions (
        PatientId, IpdAdmissionId, DialysisType, DurationMinutes, PreWeight, PostWeight, PreBloodPressure,
        PostBloodPressure, DialyzerType, BloodFlowRate, UfGoal, UfAchieved, Complications, Remarks, PerformedByUserId)
    VALUES (
        @PatientId, @IpdAdmissionId, @DialysisType, @DurationMinutes, @PreWeight, @PostWeight, @PreBloodPressure,
        @PostBloodPressure, @DialyzerType, @BloodFlowRate, @UfGoal, @UfAchieved, @Complications, @Remarks, @PerformedByUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_DialysisSession_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.Id, s.PatientId, p.FullName AS PatientName, s.IpdAdmissionId, s.SessionDate, s.DialysisType,
           s.DurationMinutes, s.PreWeight, s.PostWeight, s.PreBloodPressure, s.PostBloodPressure, s.DialyzerType,
           s.BloodFlowRate, s.UfGoal, s.UfAchieved, s.Complications, s.Remarks, u.Username AS PerformedByName
    FROM DialysisSessions s JOIN Patients p ON p.Id = s.PatientId JOIN Users u ON u.Id = s.PerformedByUserId
    WHERE s.PatientId = @PatientId AND s.IsDeleted = 0
    ORDER BY s.SessionDate DESC;
END
GO
