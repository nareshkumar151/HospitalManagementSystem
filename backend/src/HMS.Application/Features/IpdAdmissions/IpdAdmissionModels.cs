using HMS.Domain.Enums;

namespace HMS.Application.Features.IpdAdmissions;

public record IpdAdmissionDto(
    int Id, string AdmissionNumber, int PatientId, string PatientName, int DoctorId, string DoctorName,
    int? NurseUserId, string? NurseName, int BedId, string BedNumber, string RoomNumber, RoomType RoomType,
    DateTime AdmissionDate, AdmissionType AdmissionType, AdmissionStatus Status, string? ReasonForAdmission,
    DateTime? DischargeDate, int BranchId);

public record AdmitPatientRequest(
    int PatientId, int DoctorId, int BedId, AdmissionType AdmissionType, string? ReasonForAdmission, int BranchId);

public record AssignNurseRequest(int NurseUserId);
public record TransferBedRequest(int NewBedId);

public interface IIpdAdmissionService
{
    Task<IpdAdmissionDto> AdmitAsync(AdmitPatientRequest request);
    Task<IpdAdmissionDto> GetByIdAsync(int id);
    Task<IReadOnlyList<IpdAdmissionDto>> GetActiveAsync();
    Task<IReadOnlyList<IpdAdmissionDto>> GetByPatientAsync(int patientId);
    Task AssignNurseAsync(int admissionId, AssignNurseRequest request);
    Task TransferBedAsync(int admissionId, TransferBedRequest request);
}
