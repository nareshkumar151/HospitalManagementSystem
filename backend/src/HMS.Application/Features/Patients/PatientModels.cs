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
    /// <summary> `doctorId` scopes results to patients that doctor has an appointment history with - pass null for the unscoped, hospital-wide list (Admin/Receptionist). </summary>
    Task<PagedResult<PatientDto>> SearchAsync(PagedRequest request, int? doctorId = null);
    Task<PatientDto> GetByIdAsync(int id);
    Task<PatientDto?> GetByUhidAsync(string uhid);
    Task<PatientDto> CreateAsync(UpsertPatientRequest request);
    Task UpdateAsync(int id, UpsertPatientRequest request);
    Task DeleteAsync(int id);
    Task<PatientHistoryDto> GetHistoryAsync(int id);
}
