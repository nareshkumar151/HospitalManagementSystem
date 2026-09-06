using HMS.Application.Common.Interfaces;
using HMS.Application.Features.IpdAdmissions;
using HMS.Application.Features.Nursing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Nurse + "," + RoleNames.Doctor)]
public class NursingController : ApiControllerBase
{
    private readonly INursingService _nursingService;
    private readonly IIpdAdmissionService _ipdAdmissionService;
    private readonly IPdfService _pdfService;

    public NursingController(INursingService nursingService, IIpdAdmissionService ipdAdmissionService, IPdfService pdfService)
    {
        _nursingService = nursingService;
        _ipdAdmissionService = ipdAdmissionService;
        _pdfService = pdfService;
    }

    [HttpPost("admissions/{admissionId:int}/vitals")]
    [Authorize(Roles = RoleNames.Nurse)]
    public async Task<ActionResult<NursingChartDto>> RecordVitals(int admissionId, RecordVitalsRequest request)
        => Ok(await _nursingService.RecordVitalsAsync(admissionId, request, CurrentUserId));

    [HttpGet("admissions/{admissionId:int}/vitals")]
    public async Task<ActionResult<IReadOnlyList<NursingChartDto>>> GetChart(int admissionId) => Ok(await _nursingService.GetChartAsync(admissionId));

    [HttpPost("admissions/{admissionId:int}/requests")]
    [Authorize(Roles = RoleNames.Nurse)]
    public async Task<ActionResult<NursingRequestDto>> RaiseRequest(int admissionId, RaiseNursingRequestRequest request)
        => Ok(await _nursingService.RaiseRequestAsync(admissionId, request, CurrentUserId));

    [HttpGet("admissions/{admissionId:int}/requests")]
    public async Task<ActionResult<IReadOnlyList<NursingRequestDto>>> GetRequests(int admissionId) => Ok(await _nursingService.GetRequestsAsync(admissionId));

    [HttpGet("admissions/{admissionId:int}/pdf")]
    public async Task<IActionResult> DownloadChartPdf(int admissionId)
    {
        var admission = await _ipdAdmissionService.GetByIdAsync(admissionId);
        var chart = await _nursingService.GetChartAsync(admissionId);
        var pdfBytes = _pdfService.GenerateNursingChartPdf(admission.PatientName, admission.AdmissionNumber, chart);
        return File(pdfBytes, "application/pdf", $"NursingChart-{admission.AdmissionNumber}.pdf");
    }
}
