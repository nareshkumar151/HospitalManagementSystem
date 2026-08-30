using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 1: Patient Registration. </summary>
public class Patient : BaseEntity
{
    public string UHID { get; set; } = default!;
    public string? AadhaarNumber { get; set; }
    public string FullName { get; set; } = default!;
    public Gender Gender { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public int? Age { get; set; }
    public string Mobile { get; set; } = default!;
    public string? Email { get; set; }
    public string? Address { get; set; }
    public BloodGroup BloodGroup { get; set; } = BloodGroup.Unknown;
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactNumber { get; set; }

    // Referral details (highlighted addition)
    public string? ReferredByDoctorName { get; set; }
    public string? ReferralHospital { get; set; }
    public string? ReferralNotes { get; set; }

    // Insurance details
    public string? InsuranceCompany { get; set; }
    public string? InsurancePolicyNumber { get; set; }

    public string? Allergies { get; set; }
    public int BranchId { get; set; }
}
