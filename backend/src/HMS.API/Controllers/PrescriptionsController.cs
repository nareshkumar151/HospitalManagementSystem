using HMS.Application.Features.Prescriptions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class PrescriptionsController : ApiControllerBase
{
    private readonly IPrescriptionService _prescriptionService;

    public PrescriptionsController(IPrescriptionService prescriptionService) => _prescriptionService = prescriptionService;

    [HttpPost]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<PrescriptionDto>> Create(CreatePrescriptionRequest request)
    {
        var created = await _prescriptionService.CreateAsync(request, CurrentLinkedProfileId!.Value);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PrescriptionDto>> GetById(int id) => Ok(await _prescriptionService.GetByIdAsync(id));

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<PrescriptionDto>>> GetByPatient(int patientId)
    {
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != patientId) return Forbid();
        return Ok(await _prescriptionService.GetByPatientAsync(patientId));
    }

    [HttpPut("{id:int}/dispense")]
    [Authorize(Roles = RoleNames.Pharmacist)]
    public async Task<IActionResult> MarkDispensed(int id)
    {
        await _prescriptionService.MarkDispensedAsync(id);
        return NoContent();
    }

    [HttpPut("{id:int}/cancel")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor)]
    public async Task<IActionResult> Cancel(int id)
    {
        await _prescriptionService.CancelAsync(id);
        return NoContent();
    }
}
