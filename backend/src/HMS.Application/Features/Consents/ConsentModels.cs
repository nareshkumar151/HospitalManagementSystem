using HMS.Application.Common.Models;

namespace HMS.Application.Features.Consents;

public record ConsentTemplateDto(int Id, string Code, string Title, string Category, string BodyText, bool IsActive);

public record UpsertConsentTemplateRequest(string Code, string Title, string Category, string BodyText);

public record UpdateConsentTemplateRequest(string Title, string BodyText, bool IsActive);

public record ConsentRecordDto(
    int Id, int PatientId, string PatientName, int TemplateId, string TemplateTitle, string Category,
    string Context, int? ContextId, string? ProcedureName, string Decision, string SignedByName,
    string? RelationToPatient, string? WitnessName, string? WitnessUserName, string? RefusalReason,
    string? Notes, string RecordedByName, DateTime SignedAt);

public record CaptureConsentRequest(
    int PatientId, int TemplateId, string Context, int? ContextId, string? ProcedureName, string Decision,
    string SignedByName, string? RelationToPatient, string? WitnessName, int? WitnessUserId,
    string? RefusalReason, string? Notes);

public interface IConsentService
{
    Task<IReadOnlyList<ConsentTemplateDto>> GetTemplatesAsync(bool includeInactive);
    Task<ConsentTemplateDto> CreateTemplateAsync(UpsertConsentTemplateRequest request);
    Task<ConsentTemplateDto> UpdateTemplateAsync(int id, UpdateConsentTemplateRequest request);

    Task<ConsentRecordDto> CaptureAsync(CaptureConsentRequest request, int hospitalId, int branchId, int recordedByUserId);
    Task<ConsentRecordDto> GetByIdAsync(int id);
    Task<IReadOnlyList<ConsentRecordDto>> GetByPatientAsync(int patientId);
    Task<PagedResult<ConsentRecordDto>> SearchAsync(int hospitalId, PagedRequest request, string? category = null);
}
