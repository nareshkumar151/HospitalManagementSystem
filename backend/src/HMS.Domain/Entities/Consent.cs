using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary>
/// Module 18: Consent Forms. One flexible template + per-patient record pair covers every consent type
/// found in the hospital's paper forms (General/Surgery/Anesthesia/Transfusion/LAMA/procedure-specific) -
/// the many near-identical bilingual per-procedure consents (URSL, Circumcision, Cystolithotripsy, etc.)
/// share the single PROCEDURE_CONSENT template and are distinguished by ConsentRecord.ProcedureName rather
/// than needing one hardcoded template row per surgery type.
/// </summary>
public class ConsentTemplate : BaseEntity
{
    public string Code { get; set; } = default!;
    public string Title { get; set; } = default!;
    public string Category { get; set; } = default!; // Registration | Surgery | Anesthesia | Transfusion | LAMA | Procedure
    public string BodyText { get; set; } = default!;
    public bool IsActive { get; set; } = true;
}

public class ConsentRecord : BaseEntity
{
    public int HospitalId { get; set; }
    public int BranchId { get; set; }
    public int PatientId { get; set; }
    public int TemplateId { get; set; }
    public string Context { get; set; } = default!; // Registration | OPD | IPD | Surgery
    public int? ContextId { get; set; } // e.g. IpdAdmissions.Id or Surgeries.Id
    public string? ProcedureName { get; set; }
    public string Decision { get; set; } = default!; // Accepted | Refused
    public string SignedByName { get; set; } = default!;
    public string? RelationToPatient { get; set; }
    public string? WitnessName { get; set; }
    public int? WitnessUserId { get; set; }
    public string? RefusalReason { get; set; }
    public string? Notes { get; set; }
    public int RecordedByUserId { get; set; }
    public DateTime SignedAt { get; set; } = DateTime.UtcNow;
}
