USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_NutritionAssessment_Insert
    @PatientId INT, @IpdAdmissionId INT = NULL, @HeightCm DECIMAL(5,2) = NULL, @WeightKg DECIMAL(6,2) = NULL,
    @DietType NVARCHAR(30), @NutritionalRisk NVARCHAR(10), @DietaryHistory NVARCHAR(400) = NULL,
    @Allergies NVARCHAR(400) = NULL, @Recommendations NVARCHAR(400) = NULL, @ReassessmentDate DATETIME2 = NULL,
    @AssessedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO NutritionAssessments (
        PatientId, IpdAdmissionId, HeightCm, WeightKg, DietType, NutritionalRisk, DietaryHistory, Allergies,
        Recommendations, ReassessmentDate, AssessedByUserId)
    VALUES (
        @PatientId, @IpdAdmissionId, @HeightCm, @WeightKg, @DietType, @NutritionalRisk, @DietaryHistory, @Allergies,
        @Recommendations, @ReassessmentDate, @AssessedByUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

-- BMI is derived at read time (kg / m^2) so it never drifts if Height/Weight are corrected later.
CREATE OR ALTER PROCEDURE sp_NutritionAssessment_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.PatientId, p.FullName AS PatientName, a.IpdAdmissionId, a.AssessedAt, a.HeightCm, a.WeightKg,
           CASE WHEN a.HeightCm IS NOT NULL AND a.WeightKg IS NOT NULL AND a.HeightCm > 0
                THEN ROUND(a.WeightKg / ((a.HeightCm / 100.0) * (a.HeightCm / 100.0)), 1)
                ELSE NULL END AS Bmi,
           a.DietType, a.NutritionalRisk, a.DietaryHistory, a.Allergies, a.Recommendations, a.ReassessmentDate,
           u.Username AS AssessedByName
    FROM NutritionAssessments a JOIN Patients p ON p.Id = a.PatientId JOIN Users u ON u.Id = a.AssessedByUserId
    WHERE a.PatientId = @PatientId AND a.IsDeleted = 0
    ORDER BY a.AssessedAt DESC;
END
GO
