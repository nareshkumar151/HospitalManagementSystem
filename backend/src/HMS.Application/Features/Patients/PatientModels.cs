using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.Patients;

public record PatientDto(
    int Id,
    string UHID,
    string? AadhaarNumber,
    string FullName,
    Gender Gender,
    DateTime? DateOfBirth,
    int? Age,
    string Mobile,
    string? Email,
    string? Address,
    BloodGroup BloodGroup,
    string? EmergencyContactName,
    string? EmergencyContactNumber,
    string? ReferredByDoctorName,
    string? ReferralHospital,
    string? ReferralNotes,
    string? InsuranceCompany,
    string? InsurancePolicyNumber,
    string? Allergies,
    int BranchId,
    int HospitalId,
    DateTime CreatedAt);

public record UpsertPatientRequest(
    string? AadhaarNumber,
    string FullName,
    Gender Gender,
    DateTime? DateOfBirth,
    int? Age,
    string Mobile,
    string? Email,
    string? Address,
    BloodGroup BloodGroup,
    string? EmergencyContactName,
    string? EmergencyContactNumber,
    string? ReferredByDoctorName,
    string? ReferralHospital,
    string? ReferralNotes,
    string? InsuranceCompany,
    string? InsurancePolicyNumber,
    string? Allergies,
    int BranchId);

/// <summary> Everything needed for a doctor's "patient 360" view: history, meds, admissions, bills. </summary>
public record PatientHistoryDto(
    PatientDto Patient,
    IReadOnlyList<object> OpdVisits,
    IReadOnlyList<object> Prescriptions,
    IReadOnlyList<object> Admissions,
    IReadOnlyList<object> LabReports);

public interface IPatientService
{
    /// <summary> Always scoped to `hospitalId` - Patients are shared across every branch of one hospital
    /// (so a patient already registered at Branch A shows up when Branch B searches for them, instead of
    /// forcing a duplicate registration), and never visible across two different hospitals. `doctorId`
    /// narrows it further to patients that doctor has an appointment history with - pass null for the
    /// hospital-wide roster (Admin/Receptionist/Nurse). </summary>
    Task<PagedResult<PatientDto>> SearchAsync(PagedRequest request, int hospitalId, int? doctorId = null);
    Task<PatientDto> GetByIdAsync(int id);
    Task<PatientDto?> GetByUhidAsync(string uhid);
    /// <summary> `registeredByUserId` attributes the patient to whichever front-desk user registered them, for the receptionist's own-revenue dashboard tile. </summary>
    Task<PatientDto> CreateAsync(UpsertPatientRequest request, int? registeredByUserId = null);
    Task UpdateAsync(int id, UpsertPatientRequest request);
    Task DeleteAsync(int id);
    /// <summary> The full patient-360 view spans every branch of `hospitalId` - a patient treated at more
    /// than one branch of the same hospital should show their complete history, not just one branch's. </summary>
    Task<PatientHistoryDto> GetHistoryAsync(int id, int hospitalId);
}
