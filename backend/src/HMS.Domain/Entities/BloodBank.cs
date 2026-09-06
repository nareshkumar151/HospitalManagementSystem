using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 20: Blood Bank - digitizes the Transfusion Reaction Form. </summary>
public class TransfusionReaction : BaseEntity
{
    public int PatientId { get; set; }
    public int? IpdAdmissionId { get; set; }
    public string? BloodGroup { get; set; }
    public string ComponentTransfused { get; set; } = default!; // WholeBlood | PRBC | FFP | Platelets | Cryoprecipitate
    public decimal? UnitsTransfused { get; set; }
    public string ReactionType { get; set; } = default!; // Allergic | Febrile | Hemolytic | Anaphylactic | TRALI | Other
    public string? Symptoms { get; set; }
    public DateTime OnsetTime { get; set; } = DateTime.UtcNow;
    public string? ActionTaken { get; set; }
    public string Outcome { get; set; } = "Ongoing"; // Resolved | Ongoing | Fatal
    public string? Remarks { get; set; }
    public int ReportedByUserId { get; set; }
}
