using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 13: Operation Theatre. </summary>
public class Surgery : BaseEntity
{
    public int PatientId { get; set; }
    public int IpdAdmissionId { get; set; }
    public string SurgeryName { get; set; } = default!;
    public int SurgeonDoctorId { get; set; }
    public int? AssistantDoctorId { get; set; }
    public int? NurseUserId { get; set; }
    public string? Equipment { get; set; }
    public DateTime ScheduledAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? OperationNotes { get; set; }
    public string? Anesthesia { get; set; }
    public decimal OperationCost { get; set; }
    public string Status { get; set; } = "Scheduled"; // Scheduled | InProgress | Completed | Cancelled
}
