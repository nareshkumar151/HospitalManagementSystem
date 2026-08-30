using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Patients;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class PatientsController : ApiControllerBase
{
    private readonly IPatientService _patientService;
    private readonly IPdfService _pdfService;

    public PatientsController(IPatientService patientService, IPdfService pdfService)
    {
        _patientService = patientService;
        _pdfService = pdfService;
    }

    [HttpGet]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Receptionist + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<PagedResult<PatientDto>>> Search([FromQuery] PagedRequest request) => Ok(await _patientService.SearchAsync(request));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PatientDto>> GetById(int id)
    {
        // A Patient user may only view their own linked profile.
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != id) return Forbid();
        return Ok(await _patientService.GetByIdAsync(id));
    }

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != id) return Forbid();
        var patient = await _patientService.GetByIdAsync(id);
        var pdfBytes = _pdfService.GeneratePatientDetailsPdf(patient);
        return File(pdfBytes, "application/pdf", $"PatientDetails-{patient.UHID}.pdf");
    }

    [HttpGet("{id:int}/history")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<PatientHistoryDto>> GetHistory(int id) => Ok(await _patientService.GetHistoryAsync(id));

    [HttpPost]
    [Authorize(Roles = RoleNames.FrontDesk)]
    public async Task<ActionResult<PatientDto>> Create(UpsertPatientRequest request)
    {
        var created = await _patientService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.FrontDesk)]
    public async Task<IActionResult> Update(int id, UpsertPatientRequest request)
    {
        await _patientService.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        await _patientService.DeleteAsync(id);
        return NoContent();
    }
}
