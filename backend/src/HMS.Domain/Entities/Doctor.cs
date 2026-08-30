using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 17: Doctor Management. </summary>
public class Doctor : BaseEntity
{
    public string DoctorCode { get; set; } = default!;
    public string FullName { get; set; } = default!;
    public int DepartmentId { get; set; }
    public string Qualification { get; set; } = default!;
    public int ExperienceYears { get; set; }
    public decimal ConsultationFee { get; set; }
    public string? AvailableDays { get; set; } // CSV: Mon,Tue,Wed
    public string? Mobile { get; set; }
    public string? Email { get; set; }
    public string? DigitalSignatureUrl { get; set; }
    public int BranchId { get; set; }
    public bool IsActive { get; set; } = true;
}
