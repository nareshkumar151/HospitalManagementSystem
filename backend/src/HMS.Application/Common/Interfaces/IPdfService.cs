using HMS.Application.Features.Billing;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Patients;

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
    byte[] GenerateBillReceiptPdf(BillDto bill);
}
