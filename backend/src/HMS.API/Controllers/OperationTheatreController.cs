using HMS.Application.Features.OperationTheatre;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
public class OperationTheatreController : ApiControllerBase
{
    private readonly IOperationTheatreService _operationTheatreService;

    public OperationTheatreController(IOperationTheatreService operationTheatreService) => _operationTheatreService = operationTheatreService;

    // Receptionist no longer coordinates the OT calendar - Administrator/Doctor only.
    [HttpPost]
    [Authorize(Roles = RoleNames.AdminOnly + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryDto>> Schedule(ScheduleSurgeryRequest request) => Ok(await _operationTheatreService.ScheduleAsync(request));

    [HttpPut("{id:int}/complete")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryDto>> Complete(int id, CompleteSurgeryRequest request) => Ok(await _operationTheatreService.CompleteAsync(id, request));

    [HttpPut("{id:int}/cancel")]
    [Authorize(Roles = RoleNames.AdminOnly + "," + RoleNames.Doctor)]
    public async Task<ActionResult<SurgeryDto>> Cancel(int id, [FromBody] string reason) => Ok(await _operationTheatreService.CancelAsync(id, reason));

    [HttpGet("today")]
    public async Task<ActionResult<IReadOnlyList<SurgeryDto>>> GetTodaysSchedule() => Ok(await _operationTheatreService.GetTodaysScheduleAsync(CurrentBranchId));

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<SurgeryDto>>> GetByPatient(int patientId) => Ok(await _operationTheatreService.GetByPatientAsync(patientId));
}
