using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 12: Insurance. </summary>
public class InsuranceClaim : BaseEntity
{
    public int PatientId { get; set; }
    public int? BillId { get; set; }
    public string InsuranceCompany { get; set; } = default!;
    public string PolicyNumber { get; set; } = default!;
    public decimal CoverageAmount { get; set; }
    public decimal? ApprovedAmount { get; set; }
    public ClaimStatus Status { get; set; } = ClaimStatus.Submitted;
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
    public string? Remarks { get; set; }
}
