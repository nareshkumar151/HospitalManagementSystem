using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Er;

namespace HMS.Infrastructure.Services;

public class ErService : IErService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public ErService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<ErVisitDto> RegisterVisitAsync(RegisterErVisitRequest request, int branchId, int hospitalId, int registeredByUserId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_ErVisit_Insert", new
        {
            request.PatientId,
            BranchId = branchId,
            HospitalId = hospitalId,
            request.ModeOfArrival,
            request.BroughtBy,
            request.ChiefComplaint,
            request.TriageCategory,
            RegisteredByUserId = registeredByUserId,
        });
        await _auditService.LogAsync("ErVisitRegistered", "ErVisit", newId.ToString(), request.ChiefComplaint);
        return await GetVisitAsync(newId);
    }

    public Task<IReadOnlyList<ErVisitDto>> GetActiveVisitsAsync(int branchId)
        => _db.QueryAsync<ErVisitDto>("sp_ErVisit_GetActive", new { BranchId = branchId });

    public async Task<ErVisitDto> GetVisitAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<ErVisitDto>("sp_ErVisit_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.ErVisit), id);

    public async Task UpdateDispositionAsync(int id, UpdateErDispositionRequest request)
    {
        await _db.ExecuteAsync("sp_ErVisit_UpdateStatus", new { Id = id, request.Status });
        await _auditService.LogAsync("ErVisitDisposed", "ErVisit", id.ToString(), request.Status);
    }

    public async Task<ErNurseAssessmentDto> RecordNurseAssessmentAsync(int visitId, RecordErNurseAssessmentRequest request, int nurseUserId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_ErNurseAssessment_Insert", new
        {
            ErVisitId = visitId,
            request.BloodPressure,
            request.Pulse,
            request.Temperature,
            request.RespiratoryRate,
            request.SpO2,
            request.PainScore,
            request.GcsTotal,
            request.InitialActions,
            request.Remarks,
            NurseUserId = nurseUserId,
        });
        var list = await GetNurseAssessmentsAsync(visitId);
        return list.First(a => a.Id == newId);
    }

    public Task<IReadOnlyList<ErNurseAssessmentDto>> GetNurseAssessmentsAsync(int visitId)
        => _db.QueryAsync<ErNurseAssessmentDto>("sp_ErNurseAssessment_GetByVisit", new { ErVisitId = visitId });

    public async Task<ErDoctorAssessmentDto> RecordDoctorAssessmentAsync(int visitId, RecordErDoctorAssessmentRequest request, int doctorId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_ErDoctorAssessment_Insert", new
        {
            ErVisitId = visitId,
            request.HistoryOfPresentIllness,
            request.ExaminationFindings,
            request.ProvisionalDiagnosis,
            request.TreatmentGiven,
            request.Disposition,
            request.Remarks,
            DoctorId = doctorId,
        });
        var list = await GetDoctorAssessmentsAsync(visitId);
        return list.First(a => a.Id == newId);
    }

    public Task<IReadOnlyList<ErDoctorAssessmentDto>> GetDoctorAssessmentsAsync(int visitId)
        => _db.QueryAsync<ErDoctorAssessmentDto>("sp_ErDoctorAssessment_GetByVisit", new { ErVisitId = visitId });
}
