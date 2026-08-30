using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Insurance;
using HMS.Domain.Enums;

namespace HMS.Infrastructure.Services;

public class InsuranceService : IInsuranceService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public InsuranceService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<InsuranceClaimDto> SubmitAsync(SubmitClaimRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_InsuranceClaim_Insert", request);
        await _auditService.LogAsync("InsuranceClaimSubmitted", "InsuranceClaim", newId.ToString());
        var claims = await GetByPatientAsync(request.PatientId);
        return claims.First(c => c.Id == newId);
    }

    public async Task<InsuranceClaimDto> UpdateStatusAsync(int id, UpdateClaimStatusRequest request)
    {
        await _db.ExecuteAsync("sp_InsuranceClaim_UpdateStatus", new { Id = id, Status = request.Status.ToString(), request.ApprovedAmount, request.Remarks });
        await _auditService.LogAsync("InsuranceClaimStatusUpdated", "InsuranceClaim", id.ToString(), request.Status.ToString());
        // Reading back a row by the id we just updated, not a listing - bypass branch filtering here rather
        // than needing a branchId just to find the row this call itself already knows about.
        var all = await _db.QueryAsync<InsuranceClaimDto>("sp_InsuranceClaim_GetAll", new { BranchId = (int?)null, Status = (string?)null });
        return all.First(c => c.Id == id);
    }

    public Task<IReadOnlyList<InsuranceClaimDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<InsuranceClaimDto>("sp_InsuranceClaim_GetByPatient", new { PatientId = patientId });

    public Task<IReadOnlyList<InsuranceClaimDto>> GetAllAsync(int branchId, ClaimStatus? status = null)
        => _db.QueryAsync<InsuranceClaimDto>("sp_InsuranceClaim_GetAll", new { BranchId = branchId, Status = status?.ToString() });
}
