using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Discharge;
using HMS.Application.Features.PatientDocuments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class DischargeController : ApiControllerBase
{
    private readonly IDischargeService _dischargeService;
    private readonly IPdfService _pdfService;
    private readonly IPatientDocumentBundleService _bundleService;

    public DischargeController(IDischargeService dischargeService, IPdfService pdfService, IPatientDocumentBundleService bundleService)
    {
        _dischargeService = dischargeService;
        _pdfService = pdfService;
        _bundleService = bundleService;
    }

    [HttpPost("admissions/{admissionId:int}")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<DischargeSummaryDto>> Discharge(int admissionId, CreateDischargeSummaryRequest request)
        => Ok(await _dischargeService.DischargeAsync(admissionId, request, CurrentLinkedProfileId!.Value));

    [HttpGet("admissions/{admissionId:int}")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse + "," + RoleNames.Receptionist)]
    public async Task<ActionResult<DischargeSummaryDto>> GetByAdmission(int admissionId) => Ok(await _dischargeService.GetByAdmissionIdAsync(admissionId));

    [HttpGet("admissions/{admissionId:int}/pdf")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse + "," + RoleNames.Receptionist)]
    public async Task<IActionResult> DownloadPdf(int admissionId)
    {
        var summary = await _dischargeService.GetByAdmissionIdAsync(admissionId);
        var pdfBytes = _pdfService.GenerateDischargeSummaryPdf(summary);
        return File(pdfBytes, "application/pdf", $"DischargeSummary-{admissionId}.pdf");
    }

    // "Download All Documents" - everything on file for this admission's patient (consents, OT forms,
    // nursing chart, ER assessments, blood bank/dialysis/nutrition records, plus the discharge summary if
    // one exists yet) as a single PDF. Works before discharge too, so it also covers a mid-admission
    // bed/ward transfer where the ward wants the full record handed over in one file.
    [HttpGet("admissions/{admissionId:int}/documents-pdf")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse + "," + RoleNames.Receptionist)]
    public async Task<IActionResult> DownloadAllDocuments(int admissionId)
    {
        var pdfBytes = await _bundleService.GenerateBundlePdfAsync(admissionId);
        return File(pdfBytes, "application/pdf", $"PatientDocuments-{admissionId}.pdf");
    }
}
