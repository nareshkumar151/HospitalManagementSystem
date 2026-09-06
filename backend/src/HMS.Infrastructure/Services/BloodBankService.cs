using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.BloodBank;

namespace HMS.Infrastructure.Services;

public class BloodBankService : IBloodBankService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public BloodBankService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<TransfusionReactionDto> RecordAsync(RecordTransfusionReactionRequest request, int userId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_TransfusionReaction_Insert", new
        {
            request.PatientId,
            request.IpdAdmissionId,
            request.BloodGroup,
            request.ComponentTransfused,
            request.UnitsTransfused,
            request.ReactionType,
            request.Symptoms,
            request.ActionTaken,
            request.Outcome,
            request.Remarks,
            ReportedByUserId = userId,
        });
        await _auditService.LogAsync("TransfusionReactionRecorded", "TransfusionReaction", newId.ToString(), request.ReactionType);
        var list = await GetByPatientAsync(request.PatientId);
        return list.First(r => r.Id == newId);
    }

    public async Task<TransfusionReactionDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<TransfusionReactionDto>("sp_TransfusionReaction_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.TransfusionReaction), id);

    public Task<IReadOnlyList<TransfusionReactionDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<TransfusionReactionDto>("sp_TransfusionReaction_GetByPatient", new { PatientId = patientId });
}
