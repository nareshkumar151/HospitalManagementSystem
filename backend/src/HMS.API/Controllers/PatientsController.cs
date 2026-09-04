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
    public async Task<ActionResult<PagedResult<PatientDto>>> Search([FromQuery] PagedRequest request)
    {
        // A doctor sees only patients they have an appointment history with, not the hospital-wide roster.
        // Scoped to the whole hospital (not just this branch) - the same patient can already be registered
        // at a sister branch, and front desk here needs to find and reuse that record instead of
        // re-registering them.
        var doctorId = User.IsInRole(RoleNames.Doctor) ? CurrentLinkedProfileId : null;
        return Ok(await _patientService.SearchAsync(request, CurrentHospitalId, doctorId));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PatientDto>> GetById(int id)
    {
        // A Patient user may only view their own linked profile.
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != id) return Forbid();
        var patient = await _patientService.GetByIdAsync(id);
        // Staff may look up any patient registered anywhere in their own hospital (see Search above) but
        // never a patient belonging to a different hospital entirely.
        if (CurrentHospitalIdOrNull is { } hospitalId && patient.HospitalId != hospitalId) return Forbid();
        return Ok(patient);
    }

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != id) return Forbid();
        var patient = await _patientService.GetByIdAsync(id);
        if (CurrentHospitalIdOrNull is { } hospitalId && patient.HospitalId != hospitalId) return Forbid();
        var pdfBytes = _pdfService.GeneratePatientDetailsPdf(patient);
        return File(pdfBytes, "application/pdf", $"PatientDetails-{patient.UHID}.pdf");
    }

    [HttpGet("{id:int}/history")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<PatientHistoryDto>> GetHistory(int id)
    {
        var patient = await _patientService.GetByIdAsync(id);
        if (CurrentHospitalIdOrNull is { } hospitalId && patient.HospitalId != hospitalId) return Forbid();
        return Ok(await _patientService.GetHistoryAsync(id, CurrentHospitalId));
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.FrontDesk)]
    public async Task<ActionResult<PatientDto>> Create(UpsertPatientRequest request)
    {
        // BranchId is always the caller's own branch, server-derived - never trust the client for this,
        // or a raw API call could register a patient into a branch the caller doesn't belong to. SuperAdmin
        // has no single branch of their own, so (and only so) falls back to whatever the client sent.
        var created = await _patientService.CreateAsync(request with { BranchId = CurrentBranchIdOrNull ?? request.BranchId }, CurrentUserId);
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
