using HMS.Application.Features.Nursing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Nurse + "," + RoleNames.Doctor)]
public class NursingController : ApiControllerBase
{
    private readonly INursingService _nursingService;

    public NursingController(INursingService nursingService) => _nursingService = nursingService;

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
}
