using HMS.Application.Features.OpdVisits;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
public class OpdVisitsController : ApiControllerBase
{
    private readonly IOpdVisitService _opdVisitService;

    public OpdVisitsController(IOpdVisitService opdVisitService) => _opdVisitService = opdVisitService;

    [HttpPost("start-consultation")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<OpdVisitDto>> StartConsultation(StartConsultationRequest request)
        => Ok(await _opdVisitService.StartConsultationAsync(request, CurrentLinkedProfileId!.Value));

    [HttpPut("{id:int}/complete-consultation")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<OpdVisitDto>> CompleteConsultation(int id, CompleteConsultationRequest request)
        => Ok(await _opdVisitService.CompleteConsultationAsync(id, request));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<OpdVisitDto>> GetById(int id)
    {
        var visit = await _opdVisitService.GetByIdAsync(id);
        if (CurrentBranchIdOrNull is { } branchId && visit.BranchId != branchId) return Forbid();
        return Ok(visit);
    }

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<OpdVisitDto>>> GetByPatient(int patientId) => Ok(await _opdVisitService.GetByPatientAsync(patientId, CurrentBranchId));

    [HttpGet("doctor/{doctorId:int}")]
    public async Task<ActionResult<IReadOnlyList<OpdVisitDto>>> GetByDoctor(int doctorId, [FromQuery] DateTime? date)
        => Ok(await _opdVisitService.GetByDoctorAsync(doctorId, CurrentBranchId, date));

    [HttpPost("{id:int}/nursing-note")]
    [Authorize(Roles = RoleNames.Nurse)]
    public async Task<IActionResult> AddNursingNote(int id, OpdNursingNoteRequest request)
    {
        await _opdVisitService.AddNursingNoteAsync(id, request, CurrentUserId);
        return NoContent();
    }
}
