using HMS.Application.Features.Er;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Module 19: Emergency (ER) - digitizes the ER Doctor/Nurse Assessment paper forms. </summary>
[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Receptionist + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
public class ErController : ApiControllerBase
{
    private readonly IErService _erService;

    public ErController(IErService erService) => _erService = erService;

    [HttpPost("visits")]
    [Authorize(Roles = RoleNames.AdminOnly + "," + RoleNames.Receptionist + "," + RoleNames.Nurse)]
    public async Task<ActionResult<ErVisitDto>> RegisterVisit(RegisterErVisitRequest request)
        => Ok(await _erService.RegisterVisitAsync(request, CurrentBranchId, CurrentHospitalId, CurrentUserId));

    [HttpGet("visits/active")]
    public async Task<ActionResult<IReadOnlyList<ErVisitDto>>> GetActiveVisits() => Ok(await _erService.GetActiveVisitsAsync(CurrentBranchId));

    [HttpGet("visits/{id:int}")]
    public async Task<ActionResult<ErVisitDto>> GetVisit(int id) => Ok(await _erService.GetVisitAsync(id));

    [HttpPut("visits/{id:int}/disposition")]
    [Authorize(Roles = RoleNames.AdminOnly + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<IActionResult> UpdateDisposition(int id, UpdateErDispositionRequest request)
    {
        await _erService.UpdateDispositionAsync(id, request);
        return NoContent();
    }

    [HttpPost("visits/{id:int}/nurse-assessment")]
    [Authorize(Roles = RoleNames.Nurse)]
    public async Task<ActionResult<ErNurseAssessmentDto>> RecordNurseAssessment(int id, RecordErNurseAssessmentRequest request)
        => Ok(await _erService.RecordNurseAssessmentAsync(id, request, CurrentUserId));

    [HttpGet("visits/{id:int}/nurse-assessments")]
    public async Task<ActionResult<IReadOnlyList<ErNurseAssessmentDto>>> GetNurseAssessments(int id)
        => Ok(await _erService.GetNurseAssessmentsAsync(id));

    [HttpPost("visits/{id:int}/doctor-assessment")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<ErDoctorAssessmentDto>> RecordDoctorAssessment(int id, RecordErDoctorAssessmentRequest request)
        => Ok(await _erService.RecordDoctorAssessmentAsync(id, request, CurrentLinkedProfileId!.Value));

    [HttpGet("visits/{id:int}/doctor-assessments")]
    public async Task<ActionResult<IReadOnlyList<ErDoctorAssessmentDto>>> GetDoctorAssessments(int id)
        => Ok(await _erService.GetDoctorAssessmentsAsync(id));
}
