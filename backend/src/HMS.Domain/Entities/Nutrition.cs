using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 22: Nutrition/Dietetics - digitizes the Initial Assessment by Nutrition paper form. </summary>
public class NutritionAssessment : BaseEntity
{
    public int PatientId { get; set; }
    public int? IpdAdmissionId { get; set; }
    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
    public decimal? HeightCm { get; set; }
    public decimal? WeightKg { get; set; }
    public string DietType { get; set; } = default!; // Normal | Diabetic | Renal | Liquid | SoftDiet | HighProtein | Other
    public string NutritionalRisk { get; set; } = "Low"; // Low | Medium | High
    public string? DietaryHistory { get; set; }
    public string? Allergies { get; set; }
    public string? Recommendations { get; set; }
    public DateTime? ReassessmentDate { get; set; }
    public int AssessedByUserId { get; set; }
}
