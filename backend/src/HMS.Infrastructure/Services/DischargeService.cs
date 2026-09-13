using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.IpdAdmissions;

namespace HMS.Infrastructure.Services;

public class DischargeService : IDischargeService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;
    private readonly IIpdAdmissionService _ipdAdmissionService;

    public DischargeService(ISqlDataAccess db, IAuditService auditService, IIpdAdmissionService ipdAdmissionService)
    {
        _db = db;
        _auditService = auditService;
        _ipdAdmissionService = ipdAdmissionService;
    }

    public async Task<DischargeSummaryDto> DischargeAsync(int admissionId, CreateDischargeSummaryRequest request)
    {
        // The treating doctor is always this admission's own attending doctor - not whoever happens to be
        // filing the discharge (front desk/nursing routinely process it on the attending doctor's behalf).
        var admission = await _ipdAdmissionService.GetByIdAsync(admissionId);

        await _db.QuerySingleAsync<int>("sp_DischargeSummary_Create", new
        {
            IpdAdmissionId = admissionId,
            TreatingDoctorId = admission.DoctorId,
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
