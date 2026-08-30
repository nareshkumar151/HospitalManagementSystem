using HMS.Application.Common.Interfaces;
using HMS.Application.Features.OperationTheatre;

namespace HMS.Infrastructure.Services;

public class OperationTheatreService : IOperationTheatreService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public OperationTheatreService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<SurgeryDto> ScheduleAsync(ScheduleSurgeryRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Surgery_Insert", request);
        await _auditService.LogAsync("SurgeryScheduled", "Surgery", newId.ToString(), request.SurgeryName);
        var list = await GetByPatientAsync(request.PatientId);
        return list.First(s => s.Id == newId);
    }

    public async Task<SurgeryDto> CompleteAsync(int id, CompleteSurgeryRequest request)
    {
        await _db.ExecuteAsync("sp_Surgery_Complete", new { Id = id, request.OperationNotes, request.Anesthesia });
        await _auditService.LogAsync("SurgeryCompleted", "Surgery", id.ToString());
        return await GetByIdAsync(id);
    }

    public async Task<SurgeryDto> CancelAsync(int id, string reason)
    {
        await _db.ExecuteAsync("sp_Surgery_Cancel", new { Id = id, Reason = reason });
        return await GetByIdAsync(id);
    }

    public Task<IReadOnlyList<SurgeryDto>> GetTodaysScheduleAsync(int branchId) => _db.QueryAsync<SurgeryDto>("sp_Surgery_GetTodaysSchedule", new { BranchId = branchId });

    private async Task<SurgeryDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<SurgeryDto>("sp_Surgery_GetById", new { Id = id })
           ?? throw new Application.Common.Exceptions.NotFoundException(nameof(Domain.Entities.Surgery), id);

    public Task<IReadOnlyList<SurgeryDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<SurgeryDto>("sp_Surgery_GetByPatient", new { PatientId = patientId });
}
