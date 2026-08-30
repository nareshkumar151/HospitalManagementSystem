using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Discharge;

namespace HMS.Infrastructure.Services;

public class DischargeService : IDischargeService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public DischargeService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<DischargeSummaryDto> DischargeAsync(int admissionId, CreateDischargeSummaryRequest request, int doctorId)
    {
        await _db.QuerySingleAsync<int>("sp_DischargeSummary_Create", new
        {
            IpdAdmissionId = admissionId,
            TreatingDoctorId = doctorId,
            request.Diagnosis,
            request.ChiefComplaint,
            request.PastHistory,
            request.PhysicalExamination,
            request.Investigation,
            request.CourseInHospital,
            request.ConditionAtDischarge,
            request.MedicinesAdvised,
            request.DietAdvice,
            request.FollowUpDate,
            request.DoctorDigitalSignature
        });

        await _auditService.LogAsync("PatientDischarged", "IpdAdmission", admissionId.ToString());
        return await GetByAdmissionIdAsync(admissionId);
    }

    public async Task<DischargeSummaryDto> GetByAdmissionIdAsync(int admissionId)
        => await _db.QuerySingleOrDefaultAsync<DischargeSummaryDto>("sp_DischargeSummary_GetByAdmission", new { IpdAdmissionId = admissionId })
           ?? throw new NotFoundException("DischargeSummary", admissionId);
}
