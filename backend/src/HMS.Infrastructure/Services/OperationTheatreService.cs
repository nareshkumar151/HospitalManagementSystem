using System.Text.Json;
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

    public async Task<SurgeryDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<SurgeryDto>("sp_Surgery_GetById", new { Id = id })
           ?? throw new Application.Common.Exceptions.NotFoundException(nameof(Domain.Entities.Surgery), id);

    public Task<IReadOnlyList<SurgeryDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<SurgeryDto>("sp_Surgery_GetByPatient", new { PatientId = patientId });

    // --- Checklists ----------------------------------------------------------------------------------

    // Dapper maps sp_SurgeryChecklist_* rows onto this raw shape (ItemsJson stays a string); Items is
    // deserialized only when handing the DTO back to the API, so the JSON round-trip lives in one place.
    private record RawChecklistRow(int Id, int SurgeryId, string ChecklistType, string ItemsJson, string? Remarks, string CompletedByName, DateTime CompletedAt);

    private static SurgeryChecklistDto ToChecklistDto(RawChecklistRow row) => new(
        row.Id, row.SurgeryId, row.ChecklistType,
        JsonSerializer.Deserialize<List<ChecklistItemDto>>(row.ItemsJson) ?? new List<ChecklistItemDto>(),
        row.Remarks, row.CompletedByName, row.CompletedAt);

    public async Task<SurgeryChecklistDto> SaveChecklistAsync(SaveSurgeryChecklistRequest request, int userId)
    {
        var itemsJson = JsonSerializer.Serialize(request.Items);
        var newId = await _db.QuerySingleAsync<int>("sp_SurgeryChecklist_Upsert", new
        {
            request.SurgeryId,
            request.ChecklistType,
            ItemsJson = itemsJson,
            request.Remarks,
            CompletedByUserId = userId,
        });
        await _auditService.LogAsync("SurgeryChecklistSaved", "SurgeryChecklist", newId.ToString(), request.ChecklistType);
        var row = await _db.QuerySingleOrDefaultAsync<RawChecklistRow>("sp_SurgeryChecklist_GetById", new { Id = newId })
            ?? throw new Application.Common.Exceptions.NotFoundException(nameof(Domain.Entities.SurgeryChecklist), newId);
        return ToChecklistDto(row);
    }

    public async Task<IReadOnlyList<SurgeryChecklistDto>> GetChecklistsAsync(int surgeryId)
    {
        var rows = await _db.QueryAsync<RawChecklistRow>("sp_SurgeryChecklist_GetBySurgery", new { SurgeryId = surgeryId });
        return rows.Select(ToChecklistDto).ToList();
    }

    // --- Anesthesia Monitoring -------------------------------------------------------------------------

    public async Task<SurgeryAnesthesiaRecordDto> RecordAnesthesiaAsync(RecordAnesthesiaRequest request, int userId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_SurgeryAnesthesiaRecord_Insert", new
        {
            request.SurgeryId,
            request.AnesthesiaType,
            request.BloodPressure,
            request.PulseRate,
            request.SpO2,
            request.Temperature,
            request.Remarks,
            RecordedByUserId = userId,
        });
        var list = await GetAnesthesiaRecordsAsync(request.SurgeryId);
        return list.First(r => r.Id == newId);
    }

    public Task<IReadOnlyList<SurgeryAnesthesiaRecordDto>> GetAnesthesiaRecordsAsync(int surgeryId)
        => _db.QueryAsync<SurgeryAnesthesiaRecordDto>("sp_SurgeryAnesthesiaRecord_GetBySurgery", new { SurgeryId = surgeryId });

    // --- Post-Op Recovery / Aldrete Score ---------------------------------------------------------------

    public async Task<SurgeryRecoveryRecordDto> RecordRecoveryAsync(RecordRecoveryRequest request, int userId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_SurgeryRecoveryRecord_Insert", new
        {
            request.SurgeryId,
            request.Activity,
            request.Respiration,
            request.Circulation,
            request.Consciousness,
            request.OxygenSaturation,
            request.BloodPressure,
            request.Pulse,
            request.SpO2,
            request.Remarks,
            RecordedByUserId = userId,
        });
        var list = await GetRecoveryRecordsAsync(request.SurgeryId);
        return list.First(r => r.Id == newId);
    }

    public Task<IReadOnlyList<SurgeryRecoveryRecordDto>> GetRecoveryRecordsAsync(int surgeryId)
        => _db.QueryAsync<SurgeryRecoveryRecordDto>("sp_SurgeryRecoveryRecord_GetBySurgery", new { SurgeryId = surgeryId });

    public Task MarkRecoveryDischargedAsync(int recoveryRecordId)
        => _db.ExecuteAsync("sp_SurgeryRecoveryRecord_MarkDischarged", new { Id = recoveryRecordId });
}
