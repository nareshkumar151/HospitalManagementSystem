using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Dialysis;

namespace HMS.Infrastructure.Services;

public class DialysisService : IDialysisService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public DialysisService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<DialysisSessionDto> RecordAsync(RecordDialysisSessionRequest request, int userId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_DialysisSession_Insert", new
        {
            request.PatientId,
            request.IpdAdmissionId,
            request.DialysisType,
            request.DurationMinutes,
            request.PreWeight,
            request.PostWeight,
            request.PreBloodPressure,
            request.PostBloodPressure,
            request.DialyzerType,
            request.BloodFlowRate,
            request.UfGoal,
            request.UfAchieved,
            request.Complications,
            request.Remarks,
            PerformedByUserId = userId,
        });
        await _auditService.LogAsync("DialysisSessionRecorded", "DialysisSession", newId.ToString(), request.DialysisType);
        var list = await GetByPatientAsync(request.PatientId);
        return list.First(s => s.Id == newId);
    }

    public Task<IReadOnlyList<DialysisSessionDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<DialysisSessionDto>("sp_DialysisSession_GetByPatient", new { PatientId = patientId });
}
