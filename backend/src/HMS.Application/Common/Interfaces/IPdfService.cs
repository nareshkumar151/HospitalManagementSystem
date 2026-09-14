using HMS.Application.Features.Billing;
using HMS.Application.Features.Consents;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Nursing;
using HMS.Application.Features.Nutrition;
using HMS.Application.Features.BloodBank;
using HMS.Application.Features.Dialysis;
using HMS.Application.Features.Patients;
using HMS.Application.Features.PatientDocuments;

namespace HMS.Application.Common.Interfaces;

/// <summary>
/// Renders the hospital's printable documents to PDF bytes (QuestPDF, Infrastructure layer).
/// Controllers stream the result back as application/pdf - nothing is written to disk.
/// </summary>
public interface IPdfService
{
    byte[] GenerateDischargeSummaryPdf(DischargeSummaryDto summary);
    byte[] GenerateAdmissionDocumentPdf(IpdAdmissionDto admission);
    byte[] GeneratePatientDetailsPdf(PatientDto patient);
    byte[] GenerateBillReceiptPdf(BillReceiptDto receipt);

    byte[] GenerateConsentRecordPdf(ConsentRecordDto record);
    byte[] GenerateSurgeryFormsPdf(SurgeryFormsBundle bundle);
    byte[] GenerateErVisitPdf(ErVisitBundle bundle);
    byte[] GenerateNursingChartPdf(string patientName, string admissionNumber, IReadOnlyList<NursingChartDto> chart);
    byte[] GenerateTransfusionReactionPdf(TransfusionReactionDto record);
    byte[] GenerateDialysisSessionPdf(DialysisSessionDto record);
    byte[] GenerateNutritionAssessmentPdf(NutritionAssessmentDto record);

    /// <summary> Everything on file for one IPD episode, as a single downloadable PDF - the "Download All
    /// Documents" button on discharge/transfer. </summary>
    byte[] GeneratePatientDocumentBundlePdf(PatientDocumentBundleDto bundle);
}
