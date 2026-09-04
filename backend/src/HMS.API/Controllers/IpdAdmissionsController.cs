using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.IpdAdmissions;
using HMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Receptionist + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
public class IpdAdmissionsController : ApiControllerBase
{
    private readonly IIpdAdmissionService _ipdAdmissionService;
    private readonly IPdfService _pdfService;

    public IpdAdmissionsController(IIpdAdmissionService ipdAdmissionService, IPdfService pdfService)
    {
        _ipdAdmissionService = ipdAdmissionService;
        _pdfService = pdfService;
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.FrontDesk + "," + RoleNames.Nurse)]
    public async Task<ActionResult<IpdAdmissionDto>> Admit(AdmitPatientRequest request)
    {
        var created = await _ipdAdmissionService.AdmitAsync(request, CurrentBranchIdOrNull ?? request.BranchId);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<IpdAdmissionDto>> GetById(int id)
    {
        var admission = await _ipdAdmissionService.GetByIdAsync(id);
        if (CurrentBranchIdOrNull is { } branchId && admission.BranchId != branchId) return Forbid();
        return Ok(admission);
    }

    [HttpGet("active")]
    public async Task<ActionResult<IReadOnlyList<IpdAdmissionDto>>> GetActive() => Ok(await _ipdAdmissionService.GetActiveAsync(CurrentBranchId));

    /// <summary> IPD/Admissions list screen: searchable + date-filterable + paginated, across the full
    /// admission history (not just currently-active). </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<IpdAdmissionDto>>> Search(
        [FromQuery] PagedRequest request, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] AdmissionStatus? status)
        => Ok(await _ipdAdmissionService.SearchAsync(request, CurrentBranchId, fromDate, toDate, status));

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<IpdAdmissionDto>>> GetByPatient(int patientId) => Ok(await _ipdAdmissionService.GetByPatientAsync(patientId, CurrentBranchId));

    [HttpGet("{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var admission = await _ipdAdmissionService.GetByIdAsync(id);
        if (CurrentBranchIdOrNull is { } branchId && admission.BranchId != branchId) return Forbid();
        var pdfBytes = _pdfService.GenerateAdmissionDocumentPdf(admission);
        return File(pdfBytes, "application/pdf", $"AdmissionDocument-{admission.AdmissionNumber}.pdf");
    }

    [HttpPut("{id:int}/assign-nurse")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor)]
    public async Task<IActionResult> AssignNurse(int id, AssignNurseRequest request)
    {
        await _ipdAdmissionService.AssignNurseAsync(id, request);
        return NoContent();
    }

    [HttpPut("{id:int}/transfer-bed")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Nurse)]
    public async Task<IActionResult> TransferBed(int id, TransferBedRequest request)
    {
        await _ipdAdmissionService.TransferBedAsync(id, request);
        return NoContent();
    }
}
