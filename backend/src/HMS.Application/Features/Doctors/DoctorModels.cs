using HMS.Application.Common.Models;

namespace HMS.Application.Features.Doctors;

public record DoctorDto(
    int Id, string DoctorCode, string FullName, int DepartmentId, string? DepartmentName,
    string Qualification, int ExperienceYears, decimal ConsultationFee, string? AvailableDays,
    string? Mobile, string? Email, string? DigitalSignatureUrl, int BranchId, bool IsActive,
    /// <summary> Whether a Users login already exists for this doctor - creating the Doctors row alone does not create one. </summary>
    bool HasLogin);

public record UpsertDoctorRequest(
    string FullName, int DepartmentId, string Qualification, int ExperienceYears,
    decimal ConsultationFee, string? AvailableDays, string? Mobile, string? Email, int BranchId);

public interface IDoctorService
{
    Task<PagedResult<DoctorDto>> SearchAsync(PagedRequest request);
    Task<IReadOnlyList<DoctorDto>> GetByDepartmentAsync(int departmentId);
    Task<DoctorDto> GetByIdAsync(int id);
    Task<DoctorDto> CreateAsync(UpsertDoctorRequest request);
    Task UpdateAsync(int id, UpsertDoctorRequest request);
    Task DeleteAsync(int id);
    Task UploadSignatureAsync(int id, string signatureUrl);
}
