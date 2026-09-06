using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Dialysis;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Module 21: Nephrology/Dialysis - digitizes the Dialysis Record paper chart. </summary>
[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
public class DialysisController : ApiControllerBase
{
    private readonly IDialysisService _dialysisService;
    private readonly IPdfService _pdfService;

    public DialysisController(IDialysisService dialysisService, IPdfService pdfService)
    {
        _dialysisService = dialysisService;
        _pdfService = pdfService;
    }

    [HttpPost("sessions")]
    public async Task<ActionResult<DialysisSessionDto>> Record(RecordDialysisSessionRequest request)
        => Ok(await _dialysisService.RecordAsync(request, CurrentUserId));

    [HttpGet("sessions/patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<DialysisSessionDto>>> GetByPatient(int patientId)
        => Ok(await _dialysisService.GetByPatientAsync(patientId));

    [HttpGet("sessions/{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var record = await _dialysisService.GetByIdAsync(id);
        var pdfBytes = _pdfService.GenerateDialysisSessionPdf(record);
        return File(pdfBytes, "application/pdf", $"DialysisSession-{id}.pdf");
    }
}
