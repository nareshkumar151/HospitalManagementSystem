using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 5: IPD Admission. </summary>
public class IpdAdmission : BaseEntity
{
    public string AdmissionNumber { get; set; } = default!;
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public int? NurseUserId { get; set; }
    public int BedId { get; set; }
    public DateTime AdmissionDate { get; set; } = DateTime.UtcNow;
    public AdmissionType AdmissionType { get; set; }
    public AdmissionStatus Status { get; set; } = AdmissionStatus.Admitted;
    public string? ReasonForAdmission { get; set; }
    public DateTime? DischargeDate { get; set; }
    public int BranchId { get; set; }
}
