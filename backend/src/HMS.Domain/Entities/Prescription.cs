using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

public class Prescription : BaseEntity
{
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public int? OpdVisitId { get; set; }
    public int? IpdAdmissionId { get; set; }
    public DateTime PrescribedDate { get; set; } = DateTime.UtcNow;
    public PrescriptionStatus Status { get; set; } = PrescriptionStatus.Active;
    public string? DigitalSignature { get; set; }
}

public class PrescriptionItem
{
    public int Id { get; set; }
    public int PrescriptionId { get; set; }
    public int MedicineId { get; set; }
    public string Dosage { get; set; } = default!;
    public string Frequency { get; set; } = default!;
    public int DurationDays { get; set; }
    public string? Instructions { get; set; }
}
