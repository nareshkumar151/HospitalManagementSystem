using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Nutrition;

namespace HMS.Infrastructure.Services;

public class NutritionService : INutritionService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public NutritionService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<NutritionAssessmentDto> RecordAsync(RecordNutritionAssessmentRequest request, int userId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_NutritionAssessment_Insert", new
        {
            request.PatientId,
            request.IpdAdmissionId,
            request.HeightCm,
            request.WeightKg,
            request.DietType,
            request.NutritionalRisk,
            request.DietaryHistory,
            request.Allergies,
            request.Recommendations,
            request.ReassessmentDate,
            AssessedByUserId = userId,
        });
        await _auditService.LogAsync("NutritionAssessmentRecorded", "NutritionAssessment", newId.ToString(), request.DietType);
        var list = await GetByPatientAsync(request.PatientId);
        return list.First(a => a.Id == newId);
    }

    public async Task<NutritionAssessmentDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<NutritionAssessmentDto>("sp_NutritionAssessment_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.NutritionAssessment), id);

    public Task<IReadOnlyList<NutritionAssessmentDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<NutritionAssessmentDto>("sp_NutritionAssessment_GetByPatient", new { PatientId = patientId });
}
