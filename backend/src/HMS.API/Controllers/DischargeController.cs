using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Discharge;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class DischargeController : ApiControllerBase
{
    private readonly IDischargeService _dischargeService;
    private readonly IPdfService _pdfService;

    public DischargeController(IDischargeService dischargeService, IPdfService pdfService)
    {
        _dischargeService = dischargeService;
        _pdfService = pdfService;
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
}
