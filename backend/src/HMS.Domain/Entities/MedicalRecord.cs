using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 15: Medical Records - long-term document store per patient. </summary>
public class MedicalRecord : BaseEntity
{
    public int PatientId { get; set; }
    public string RecordType { get; set; } = default!; // Prescription | LabReport | XRay | MRI | SurgeryNotes | Allergy | Vaccination | ChronicDisease | ConsentForm
    public string Title { get; set; } = default!;
    public string? FileUrl { get; set; }
    public string? Notes { get; set; }
    public DateTime RecordDate { get; set; } = DateTime.UtcNow;
}
