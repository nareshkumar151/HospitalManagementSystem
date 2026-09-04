using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.IpdAdmissions;

public record IpdAdmissionDto(
    int Id, string AdmissionNumber, int PatientId, string PatientName, string UHID, int DoctorId, string DoctorName,
    string DepartmentName, string? InsuranceCompany,
    int? NurseUserId, string? NurseName, int BedId, string BedNumber, string RoomNumber, RoomType RoomType,
    DateTime AdmissionDate, AdmissionType AdmissionType, AdmissionStatus Status, string? ReasonForAdmission,
    DateTime? DischargeDate, int BranchId);

public record AdmitPatientRequest(
    int PatientId, int DoctorId, int BedId, AdmissionType AdmissionType, string? ReasonForAdmission, int BranchId);

public record AssignNurseRequest(int NurseUserId);
public record TransferBedRequest(int NewBedId);

public interface IIpdAdmissionService
{
    /// <summary> `branchId` is always the caller's own branch (server-derived) - never trust
    /// <see cref="AdmitPatientRequest.BranchId"/> for this, a client could send any branch. </summary>
    Task<IpdAdmissionDto> AdmitAsync(AdmitPatientRequest request, int branchId);
    Task<IpdAdmissionDto> GetByIdAsync(int id);
    Task<IReadOnlyList<IpdAdmissionDto>> GetActiveAsync(int branchId);
    /// <summary> The IPD/Admissions list screen - searchable and date-filterable across the full admission
    /// history (not just currently-active ones); pass `status` to narrow to Admitted/Discharged. </summary>
    Task<PagedResult<IpdAdmissionDto>> SearchAsync(PagedRequest request, int branchId, DateTime? fromDate = null, DateTime? toDate = null, AdmissionStatus? status = null);
    Task<IReadOnlyList<IpdAdmissionDto>> GetByPatientAsync(int patientId, int branchId);
    Task AssignNurseAsync(int admissionId, AssignNurseRequest request);
    Task TransferBedAsync(int admissionId, TransferBedRequest request);
}
