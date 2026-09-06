using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Consents;

namespace HMS.Infrastructure.Services;

public class ConsentService : IConsentService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public ConsentService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<ConsentTemplateDto>> GetTemplatesAsync(bool includeInactive)
        => _db.QueryAsync<ConsentTemplateDto>("sp_ConsentTemplate_GetAll", new { IncludeInactive = includeInactive });

    public async Task<ConsentTemplateDto> CreateTemplateAsync(UpsertConsentTemplateRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_ConsentTemplate_Insert", request);
        await _auditService.LogAsync("ConsentTemplateCreated", "ConsentTemplate", newId.ToString(), request.Title);
        return (await GetTemplatesAsync(true)).First(t => t.Id == newId);
    }

    public async Task<ConsentTemplateDto> UpdateTemplateAsync(int id, UpdateConsentTemplateRequest request)
    {
        await _db.ExecuteAsync("sp_ConsentTemplate_Update", new { Id = id, request.Title, request.BodyText, request.IsActive });
        await _auditService.LogAsync("ConsentTemplateUpdated", "ConsentTemplate", id.ToString());
        return (await GetTemplatesAsync(true)).First(t => t.Id == id);
    }

    public async Task<ConsentRecordDto> CaptureAsync(CaptureConsentRequest request, int hospitalId, int branchId, int recordedByUserId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_ConsentRecord_Insert", new
        {
            request.PatientId,
            request.TemplateId,
            HospitalId = hospitalId,
            BranchId = branchId,
            request.Context,
            request.ContextId,
            request.ProcedureName,
            request.Decision,
            request.SignedByName,
            request.RelationToPatient,
            request.WitnessName,
            request.WitnessUserId,
            request.RefusalReason,
            request.Notes,
            RecordedByUserId = recordedByUserId,
        });
        await _auditService.LogAsync("ConsentCaptured", "ConsentRecord", newId.ToString(), $"{request.Context}/{request.Decision}");
        return await GetByIdAsync(newId);
    }

    public async Task<ConsentRecordDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<ConsentRecordDto>("sp_ConsentRecord_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.ConsentRecord), id);

    public Task<IReadOnlyList<ConsentRecordDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<ConsentRecordDto>("sp_ConsentRecord_GetByPatient", new { PatientId = patientId });

    public async Task<PagedResult<ConsentRecordDto>> SearchAsync(int hospitalId, PagedRequest request, string? category = null)
    {
        var (items, counts) = await _db.QueryMultipleAsync<ConsentRecordDto, int>("sp_ConsentRecord_Search", new
        {
            HospitalId = hospitalId,
            Category = category,
            request.PageNumber,
            request.PageSize,
            request.Search
        });

        return new PagedResult<ConsentRecordDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }
}
