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
            request.PatientMonitoring,
            request.RespiratoryRate,
            request.PainScore,
            request.Consciousness,
            EarlyWarningScore = CalculateEarlyWarningScore(request),
        });

        var chart = await GetChartAsync(admissionId);
        return chart.First(c => c.Id == newId);
    }

    /// <summary>
    /// A simple MEWS-style (Modified Early Warning Score) track-and-trigger total: each vital that falls
    /// outside its normal band scores 0-3, summed to a single number the nursing station can act on at a
    /// glance - this mirrors the paper Clinical Chart's early-warning log, not a clinically-validated MEWS
    /// implementation, so treat it as a triage aid rather than a diagnostic score.
    /// </summary>
    private static int? CalculateEarlyWarningScore(RecordVitalsRequest r)
    {
        if (r.Pulse is null && r.Temperature is null && r.RespiratoryRate is null && r.Oxygen is null && r.BloodPressure is null)
            return null;

        var score = 0;
        if (r.Pulse is int p) score += p switch { < 40 or > 130 => 3, < 50 or > 110 => 2, < 60 or > 100 => 1, _ => 0 };
        if (r.Temperature is decimal t) score += t switch { < 95 or > 102.2m => 3, < 96.8m or > 100.4m => 1, _ => 0 };
        if (r.RespiratoryRate is int rr) score += rr switch { < 8 or > 30 => 3, > 24 => 2, < 12 => 1, _ => 0 };
        if (r.Oxygen is decimal o2) score += o2 switch { < 91 => 3, < 94 => 2, < 96 => 1, _ => 0 };
        if (r.BloodPressure is string bp && int.TryParse(bp.Split('/').FirstOrDefault(), out var systolic))
            score += systolic switch { < 90 or > 200 => 3, < 100 => 2, < 110 => 1, _ => 0 };

        return score;
    }

    public Task<IReadOnlyList<NursingChartDto>> GetChartAsync(int admissionId)
        => _db.QueryAsync<NursingChartDto>("sp_NursingChart_GetByAdmission", new { IpdAdmissionId = admissionId });

    public async Task<NursingChartDto> RecordAppointmentVitalsAsync(int appointmentId, RecordVitalsRequest request, int nurseUserId)
    {
        await _db.QuerySingleAsync<int>("sp_NursingChart_UpsertForAppointment", new
        {
            AppointmentId = appointmentId,
            NurseUserId = nurseUserId,
            request.Temperature,
            request.Pulse,
            request.BloodPressure,
            request.Oxygen,
            request.Weight,
            request.SugarLevel,
            request.MedicationSchedule,
            request.DailyNotes,
            request.PatientMonitoring,
            request.RespiratoryRate,
            request.PainScore,
            request.Consciousness,
            EarlyWarningScore = CalculateEarlyWarningScore(request),
        });

        return (await GetAppointmentVitalsAsync(appointmentId))!;
    }

    public Task<NursingChartDto?> GetAppointmentVitalsAsync(int appointmentId)
        => _db.QuerySingleOrDefaultAsync<NursingChartDto>("sp_NursingChart_GetByAppointment", new { AppointmentId = appointmentId });

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
