using HMS.Application.Features.Departments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class DepartmentsController : ApiControllerBase
{
    private readonly IDepartmentService _departmentService;

    public DepartmentsController(IDepartmentService departmentService) => _departmentService = departmentService;

    // No page in this app browses departments pre-login (unlike Doctors' anonymous booking-browse), so this
    // is always an authenticated staff call - server-enforce the caller's own branch rather than trusting an
    // optional client-supplied query param, which a raw API call could simply omit to see every hospital's
    // departments.
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DepartmentDto>>> GetAll() => Ok(await _departmentService.GetAllAsync(CurrentBranchId));

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<DepartmentDto>> GetById(int id) => Ok(await _departmentService.GetByIdAsync(id));

    [HttpPost]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<DepartmentDto>> Create(UpsertDepartmentRequest request)
    {
        var created = await _departmentService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Update(int id, UpsertDepartmentRequest request)
    {
        await _departmentService.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        await _departmentService.DeleteAsync(id);
        return NoContent();
    }
}

public class OrganizationController : ApiControllerBase
{
    private readonly IOrganizationService _organizationService;

    public OrganizationController(IOrganizationService organizationService) => _organizationService = organizationService;

    // Hospital/Branch creation, editing, and deletion are SuperAdmin-exclusive: an Administrator manages
    // everything *within* their hospital, but must not be able to spin up or tear down hospitals/branches
    // themselves. Reading the list stays open to Administrator too (AllowAnonymous historically, kept as-is
    // for the doctor-picker/branch-picker UI on public pages like the login/registration screens).

    [HttpGet("hospitals")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<IReadOnlyList<HospitalDto>>> GetHospitals() => Ok(await _organizationService.GetHospitalsAsync());

    [HttpPost("hospitals")]
    [Authorize(Roles = RoleNames.SuperAdminOnly)]
    public async Task<ActionResult<HospitalDto>> CreateHospital(UpsertHospitalRequest request) => Ok(await _organizationService.CreateHospitalAsync(request));

    [HttpPut("hospitals/{id:int}")]
    [Authorize(Roles = RoleNames.SuperAdminOnly)]
    public async Task<IActionResult> UpdateHospital(int id, UpsertHospitalRequest request)
    {
        await _organizationService.UpdateHospitalAsync(id, request);
        return NoContent();
    }

    [HttpDelete("hospitals/{id:int}")]
    [Authorize(Roles = RoleNames.SuperAdminOnly)]
    public async Task<IActionResult> DeleteHospital(int id)
    {
        await _organizationService.DeleteHospitalAsync(id);
        return NoContent();
    }

    [HttpGet("branches")]
    [AllowAnonymous]
    public async Task<ActionResult<IReadOnlyList<BranchDto>>> GetBranches([FromQuery] int? hospitalId) => Ok(await _organizationService.GetBranchesAsync(hospitalId));

    [HttpPost("branches")]
    [Authorize(Roles = RoleNames.SuperAdminOnly)]
    public async Task<ActionResult<BranchDto>> CreateBranch(UpsertBranchRequest request) => Ok(await _organizationService.CreateBranchAsync(request));

    [HttpPut("branches/{id:int}")]
    [Authorize(Roles = RoleNames.SuperAdminOnly)]
    public async Task<IActionResult> UpdateBranch(int id, UpsertBranchRequest request)
    {
        await _organizationService.UpdateBranchAsync(id, request);
        return NoContent();
    }

    [HttpDelete("branches/{id:int}")]
    [Authorize(Roles = RoleNames.SuperAdminOnly)]
    public async Task<IActionResult> DeleteBranch(int id)
    {
        await _organizationService.DeleteBranchAsync(id);
        return NoContent();
    }
}
