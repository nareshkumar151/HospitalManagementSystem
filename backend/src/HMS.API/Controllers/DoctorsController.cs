using HMS.Application.Common.Models;
using HMS.Application.Features.Doctors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class DoctorsController : ApiControllerBase
{
    private readonly IDoctorService _doctorService;

    public DoctorsController(IDoctorService doctorService) => _doctorService = doctorService;

    [HttpGet]
    [AllowAnonymous] // Patients need to browse doctors before logging in to book an appointment
    // Server-derived only, never client-supplied: a signed-in user with a real branchId claim (Doctor,
    // Nurse, Administrator...) is always forced to their own branch here regardless of what a raw API call
    // might pass, closing off the "just omit the query param" bypass. A genuinely anonymous pre-login
    // request, or SuperAdmin (no single branch), falls through to the unscoped, every-branch view.
    public async Task<ActionResult<PagedResult<DoctorDto>>> Search([FromQuery] PagedRequest request) => Ok(await _doctorService.SearchAsync(request, CurrentBranchIdOrNull));

    [HttpGet("by-department/{departmentId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<DoctorDto>>> GetByDepartment(int departmentId) => Ok(await _doctorService.GetByDepartmentAsync(departmentId));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<DoctorDto>> GetById(int id)
    {
        var doctor = await _doctorService.GetByIdAsync(id);
        // A genuinely anonymous pre-login request has no branch claim and falls through unrestricted
        // (browsing doctors to book with, by design); an authenticated staff member is confined to their
        // own branch's doctors.
        if (CurrentBranchIdOrNull is { } branchId && doctor.BranchId != branchId) return Forbid();
        return Ok(doctor);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<DoctorDto>> Create(UpsertDoctorRequest request)
    {
        // A branch-bound Administrator is always forced to their own branch; SuperAdmin has no single
        // branch of their own, so (and only so) their explicit request.BranchId is trusted instead.
        var created = await _doctorService.CreateAsync(request with { BranchId = CurrentBranchIdOrNull ?? request.BranchId });
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Update(int id, UpsertDoctorRequest request)
    {
        await _doctorService.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        await _doctorService.DeleteAsync(id);
        return NoContent();
    }

    [HttpPost("{id:int}/signature")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<IActionResult> UploadSignature(int id, [FromBody] string signatureUrl)
    {
        await _doctorService.UploadSignatureAsync(id, signatureUrl);
        return NoContent();
    }
}
