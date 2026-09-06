using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 21: Nephrology/Dialysis - digitizes the Dialysis Record paper chart. </summary>
public class DialysisSession : BaseEntity
{
    public int PatientId { get; set; }
    public int? IpdAdmissionId { get; set; }
    public DateTime SessionDate { get; set; } = DateTime.UtcNow;
    public string DialysisType { get; set; } = default!; // Hemodialysis | Peritoneal
    public int? DurationMinutes { get; set; }
    public decimal? PreWeight { get; set; }
    public decimal? PostWeight { get; set; }
    public string? PreBloodPressure { get; set; }
    public string? PostBloodPressure { get; set; }
    public string? DialyzerType { get; set; }
    public decimal? BloodFlowRate { get; set; }
    public decimal? UfGoal { get; set; } // ultrafiltration target, litres
    public decimal? UfAchieved { get; set; }
    public string? Complications { get; set; }
    public string? Remarks { get; set; }
    public int PerformedByUserId { get; set; }
}
