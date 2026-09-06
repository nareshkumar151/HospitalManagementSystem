using HMS.Application.Features.Dialysis;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Module 21: Nephrology/Dialysis - digitizes the Dialysis Record paper chart. </summary>
[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
public class DialysisController : ApiControllerBase
{
    private readonly IDialysisService _dialysisService;

    public DialysisController(IDialysisService dialysisService) => _dialysisService = dialysisService;

    [HttpPost("sessions")]
    public async Task<ActionResult<DialysisSessionDto>> Record(RecordDialysisSessionRequest request)
        => Ok(await _dialysisService.RecordAsync(request, CurrentUserId));

    [HttpGet("sessions/patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<DialysisSessionDto>>> GetByPatient(int patientId)
        => Ok(await _dialysisService.GetByPatientAsync(patientId));
}
