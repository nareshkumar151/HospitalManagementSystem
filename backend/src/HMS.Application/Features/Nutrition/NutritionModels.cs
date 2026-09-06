namespace HMS.Application.Features.Nutrition;

public record NutritionAssessmentDto(
    int Id, int PatientId, string PatientName, int? IpdAdmissionId, DateTime AssessedAt, decimal? HeightCm,
    decimal? WeightKg, decimal? Bmi, string DietType, string NutritionalRisk, string? DietaryHistory,
    string? Allergies, string? Recommendations, DateTime? ReassessmentDate, string AssessedByName);

public record RecordNutritionAssessmentRequest(
    int PatientId, int? IpdAdmissionId, decimal? HeightCm, decimal? WeightKg, string DietType,
    string NutritionalRisk, string? DietaryHistory, string? Allergies, string? Recommendations,
    DateTime? ReassessmentDate);

public interface INutritionService
{
    Task<NutritionAssessmentDto> RecordAsync(RecordNutritionAssessmentRequest request, int userId);
    Task<NutritionAssessmentDto> GetByIdAsync(int id);
    Task<IReadOnlyList<NutritionAssessmentDto>> GetByPatientAsync(int patientId);
}
