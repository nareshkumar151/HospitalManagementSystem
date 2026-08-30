using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Nursing;

namespace HMS.Infrastructure.Services;

public class NursingService : INursingService
{
    private readonly ISqlDataAccess _db;

    public NursingService(ISqlDataAccess db) => _db = db;

    public async Task<NursingChartDto> RecordVitalsAsync(int admissionId, RecordVitalsRequest request, int nurseUserId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_NursingChart_Insert", new
        {
            IpdAdmissionId = admissionId,
            NurseUserId = nurseUserId,
            request.Temperature,
            request.Pulse,
            request.BloodPressure,
            request.Oxygen,
            request.Weight,
            request.SugarLevel,
            request.MedicationSchedule,
            request.DailyNotes,
            request.PatientMonitoring
        });

        var chart = await GetChartAsync(admissionId);
        return chart.First(c => c.Id == newId);
    }

    public Task<IReadOnlyList<NursingChartDto>> GetChartAsync(int admissionId)
        => _db.QueryAsync<NursingChartDto>("sp_NursingChart_GetByAdmission", new { IpdAdmissionId = admissionId });

    public async Task<NursingRequestDto> RaiseRequestAsync(int admissionId, RaiseNursingRequestRequest request, int nurseUserId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_NursingRequest_Insert", new
        {
            IpdAdmissionId = admissionId,
            NurseUserId = nurseUserId,
            request.RequestType,
            request.Details
        });

        var requests = await GetRequestsAsync(admissionId);
        return requests.First(r => r.Id == newId);
    }

    public Task<IReadOnlyList<NursingRequestDto>> GetRequestsAsync(int admissionId)
        => _db.QueryAsync<NursingRequestDto>("sp_NursingRequest_GetByAdmission", new { IpdAdmissionId = admissionId });
}
