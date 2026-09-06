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
    /// <summary> Pre-op notes captured when scheduling - distinct from OperationNotes (the post-op summary). </summary>
    public string? Notes { get; set; }
}

/// <summary>
/// One row per surgery per paper checklist (Pre-Operative Checklist, Operative Instruments &amp; Swab Check
/// Sheet, OT Cleaning Checklist). Each checklist's item list differs and can change over time, so the
/// checked items are stored as a JSON array (see ChecklistItemDto) rather than one column per item -
/// avoids a schema change every time a checklist gains or loses a line.
/// </summary>
public class SurgeryChecklist : BaseEntity
{
    public int SurgeryId { get; set; }
    public string ChecklistType { get; set; } = default!; // PreOp | InstrumentSwabCount | OTCleaning
    public string ItemsJson { get; set; } = default!;
    public string? Remarks { get; set; }
    public int CompletedByUserId { get; set; }
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
}

/// <summary> Intra-operative Anesthesia Monitoring Record - one row per observation during the surgery. </summary>
public class SurgeryAnesthesiaRecord : BaseEntity
{
    public int SurgeryId { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public int RecordedByUserId { get; set; }
    public string? AnesthesiaType { get; set; }
    public string? BloodPressure { get; set; }
    public int? PulseRate { get; set; }
    public decimal? SpO2 { get; set; }
    public decimal? Temperature { get; set; }
    public string? Remarks { get; set; }
}

/// <summary>
/// Post-Op Recovery Room Record. The five Aldrete components are each scored 0-2 by the recovering nurse;
/// AldreteTotal (max 10) is derived in the DTO rather than stored, so it never drifts from the components.
/// </summary>
public class SurgeryRecoveryRecord : BaseEntity
{
    public int SurgeryId { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public int RecordedByUserId { get; set; }
    public int Activity { get; set; }
    public int Respiration { get; set; }
    public int Circulation { get; set; }
    public int Consciousness { get; set; }
    public int OxygenSaturation { get; set; }
    public string? BloodPressure { get; set; }
    public int? Pulse { get; set; }
    public decimal? SpO2 { get; set; }
    public string? Remarks { get; set; }
    public DateTime? DischargedFromRecoveryAt { get; set; }
}
