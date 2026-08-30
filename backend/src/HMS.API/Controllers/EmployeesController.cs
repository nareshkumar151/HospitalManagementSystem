using HMS.Application.Common.Models;
using HMS.Application.Features.Employees;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
public class EmployeesController : ApiControllerBase
{
    private readonly IEmployeeService _employeeService;

    public EmployeesController(IEmployeeService employeeService) => _employeeService = employeeService;

    [HttpGet]
    public async Task<ActionResult<PagedResult<EmployeeDto>>> Search([FromQuery] PagedRequest request) => Ok(await _employeeService.SearchAsync(request, CurrentBranchId));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EmployeeDto>> GetById(int id) => Ok(await _employeeService.GetByIdAsync(id));

    [HttpPost]
    public async Task<ActionResult<EmployeeDto>> Create(UpsertEmployeeRequest request)
    {
        var created = await _employeeService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertEmployeeRequest request)
    {
        await _employeeService.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpPut("{id:int}/deactivate")]
    public async Task<IActionResult> Deactivate(int id)
    {
        await _employeeService.DeactivateAsync(id);
        return NoContent();
    }

    [HttpPost("{id:int}/offer-letter")]
    public async Task<IActionResult> GenerateOfferLetter(int id, [FromQuery] string letterType = "OfferLetter")
        => Ok(new { url = await _employeeService.GenerateOfferLetterAsync(id, letterType) });
}
