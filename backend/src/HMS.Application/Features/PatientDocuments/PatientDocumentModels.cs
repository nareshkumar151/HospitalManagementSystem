using HMS.Application.Features.BloodBank;
using HMS.Application.Features.Consents;
using HMS.Application.Features.Dialysis;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.Er;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Nursing;
using HMS.Application.Features.Nutrition;
using HMS.Application.Features.OperationTheatre;

namespace HMS.Application.Features.PatientDocuments;

/// <summary> One surgery plus every OT paperwork form recorded against it, grouped for a single printable section. </summary>
public record SurgeryFormsBundle(
    SurgeryDto Surgery, IReadOnlyList<SurgeryChecklistDto> Checklists,
    IReadOnlyList<SurgeryAnesthesiaRecordDto> AnesthesiaRecords, IReadOnlyList<SurgeryRecoveryRecordDto> RecoveryRecords,
    IReadOnlyList<SurgeryNursingNoteDto> NursingNotes);

/// <summary> One ER visit plus its nurse/doctor assessments, grouped for a single printable section. </summary>
public record ErVisitBundle(
    ErVisitDto Visit, IReadOnlyList<ErNurseAssessmentDto> NurseAssessments, IReadOnlyList<ErDoctorAssessmentDto> DoctorAssessments);

/// <summary>
/// Everything on file for one IPD episode - handed to a single QuestPDF document so front-desk/nursing can
/// hand the patient (or the next facility, on transfer) one file instead of hunting through each module.
/// DischargeSummary is null when downloaded before discharge (e.g. for a bed transfer mid-admission).
/// </summary>
public record PatientDocumentBundleDto(
    IpdAdmissionDto Admission,
    DischargeSummaryDto? DischargeSummary,
    IReadOnlyList<ConsentRecordDto> Consents,
    IReadOnlyList<SurgeryFormsBundle> Surgeries,
    IReadOnlyList<NursingChartDto> NursingChart,
    IReadOnlyList<ErVisitBundle> ErVisits,
    IReadOnlyList<TransfusionReactionDto> TransfusionReactions,
    IReadOnlyList<DialysisSessionDto> DialysisSessions,
    IReadOnlyList<NutritionAssessmentDto> NutritionAssessments);

public interface IPatientDocumentBundleService
{
    /// <summary> Assembles every document on file for the given admission's patient into one PDF. </summary>
    Task<byte[]> GenerateBundlePdfAsync(int admissionId);
}
