using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 9: Radiology - X-Ray, MRI, CT Scan, PET Scan, Ultrasound. </summary>
public class RadiologyOrder : BaseEntity
{
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public string ScanType { get; set; } = default!;
    public int? OpdVisitId { get; set; }
    public int? IpdAdmissionId { get; set; }
    public RadiologyStatus Status { get; set; } = RadiologyStatus.Ordered;
    public DateTime OrderedAt { get; set; } = DateTime.UtcNow;
    public decimal Price { get; set; }
}

public class RadiologyReport : BaseEntity
{
    public int RadiologyOrderId { get; set; }
    public string? ImageUrl { get; set; }
    public string? ReportFileUrl { get; set; }
    public string? DoctorNotes { get; set; }
    public int UploadedByUserId { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
