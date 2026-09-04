using HMS.Application.Common.Models;

namespace HMS.Application.Features.MedicalRecords;

public record MedicalRecordDto(int Id, int PatientId, string RecordType, string Title, string? FileUrl, string? Notes, DateTime RecordDate);
public record CreateMedicalRecordRequest(int PatientId, string RecordType, string Title, string? FileUrl, string? Notes);

public record IpPatientListRowDto(int PatientId, string UHID, string FullName, string Mobile, string AdmissionNumber, string Status, DateTime AdmissionDate, DateTime? DischargeDate);

public interface IMedicalRecordService
{
    Task<MedicalRecordDto> AddAsync(CreateMedicalRecordRequest request);
    Task<IReadOnlyList<MedicalRecordDto>> GetByPatientAsync(int patientId, string? recordType = null);
    Task<PagedResult<IpPatientListRowDto>> GetIpPatientListAsync(int branchId, PagedRequest request); // "IP Patient list" op from SRS Module 15
    Task DeleteAsync(int id);
}
