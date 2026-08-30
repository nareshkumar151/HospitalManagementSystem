using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 8: Laboratory - test catalogue (Blood, Urine, ECG, Health-check packages, etc.). </summary>
public class LabTestCatalog : BaseEntity
{
    public string TestName { get; set; } = default!;
    public string Category { get; set; } = default!; // Blood | Urine | ECG | Package
    public decimal Price { get; set; }
    public string? NormalRange { get; set; }
}

/// <summary> Doctor Orders -> Lab Collection -> Processing -> Report Upload -> Doctor Review. </summary>
public class LabTestOrder : BaseEntity
{
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public int LabTestCatalogId { get; set; }
    public int? OpdVisitId { get; set; }
    public int? IpdAdmissionId { get; set; }
    public LabTestStatus Status { get; set; } = LabTestStatus.Ordered;
    public DateTime OrderedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SampleCollectedAt { get; set; }
    public int? CollectedByUserId { get; set; }
}

public class LabReport : BaseEntity
{
    public int LabTestOrderId { get; set; }
    public string? ResultSummary { get; set; }
    public string? ReportFileUrl { get; set; }
    public int UploadedByUserId { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public bool ReviewedByDoctor { get; set; }
    public string? DoctorRemarks { get; set; }
}
