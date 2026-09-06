using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.BloodBank;
using HMS.Application.Features.Consents;
using HMS.Application.Features.Dialysis;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.Er;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Nursing;
using HMS.Application.Features.Nutrition;
using HMS.Application.Features.OperationTheatre;
using HMS.Application.Features.PatientDocuments;

namespace HMS.Infrastructure.Services;

/// <summary>
/// Composes the "Download All Documents" bundle by calling every module's own service (each already
/// enforces its own branch/hospital scoping) rather than querying tables directly - keeps this service a
/// thin orchestrator instead of a second copy of every module's data-access logic.
/// </summary>
public class PatientDocumentBundleService : IPatientDocumentBundleService
{
    private readonly IIpdAdmissionService _admissionService;
    private readonly IDischargeService _dischargeService;
    private readonly IConsentService _consentService;
    private readonly IOperationTheatreService _operationTheatreService;
    private readonly INursingService _nursingService;
    private readonly IErService _erService;
    private readonly IBloodBankService _bloodBankService;
    private readonly IDialysisService _dialysisService;
    private readonly INutritionService _nutritionService;
    private readonly IPdfService _pdfService;

    public PatientDocumentBundleService(
        IIpdAdmissionService admissionService, IDischargeService dischargeService, IConsentService consentService,
        IOperationTheatreService operationTheatreService, INursingService nursingService, IErService erService,
        IBloodBankService bloodBankService, IDialysisService dialysisService, INutritionService nutritionService,
        IPdfService pdfService)
    {
        _admissionService = admissionService;
        _dischargeService = dischargeService;
        _consentService = consentService;
        _operationTheatreService = operationTheatreService;
        _nursingService = nursingService;
        _erService = erService;
        _bloodBankService = bloodBankService;
        _dialysisService = dialysisService;
        _nutritionService = nutritionService;
        _pdfService = pdfService;
    }

    public async Task<byte[]> GenerateBundlePdfAsync(int admissionId)
    {
        var admission = await _admissionService.GetByIdAsync(admissionId);

        DischargeSummaryDto? dischargeSummary;
        try
        {
            dischargeSummary = await _dischargeService.GetByAdmissionIdAsync(admissionId);
        }
        catch (NotFoundException)
        {
            // Not discharged yet - e.g. downloading the bundle for a mid-admission bed transfer.
            dischargeSummary = null;
        }

        var consents = await _consentService.GetByPatientAsync(admission.PatientId);

        var allSurgeries = await _operationTheatreService.GetByPatientAsync(admission.PatientId);
        var surgeryBundles = new List<SurgeryFormsBundle>();
        foreach (var surgery in allSurgeries.Where(s => s.IpdAdmissionId == admissionId))
        {
            surgeryBundles.Add(new SurgeryFormsBundle(
                surgery,
                await _operationTheatreService.GetChecklistsAsync(surgery.Id),
                await _operationTheatreService.GetAnesthesiaRecordsAsync(surgery.Id),
                await _operationTheatreService.GetRecoveryRecordsAsync(surgery.Id)));
        }

        var nursingChart = await _nursingService.GetChartAsync(admissionId);

        var allErVisits = await _erService.GetByPatientAsync(admission.PatientId);
        var erBundles = new List<ErVisitBundle>();
        foreach (var visit in allErVisits)
        {
            erBundles.Add(new ErVisitBundle(
                visit,
                await _erService.GetNurseAssessmentsAsync(visit.Id),
                await _erService.GetDoctorAssessmentsAsync(visit.Id)));
        }

        var transfusionReactions = await _bloodBankService.GetByPatientAsync(admission.PatientId);
        var dialysisSessions = await _dialysisService.GetByPatientAsync(admission.PatientId);
        var nutritionAssessments = await _nutritionService.GetByPatientAsync(admission.PatientId);

        var bundle = new PatientDocumentBundleDto(
            admission, dischargeSummary, consents, surgeryBundles, nursingChart, erBundles,
            transfusionReactions, dialysisSessions, nutritionAssessments);

        return _pdfService.GeneratePatientDocumentBundlePdf(bundle);
    }
}
