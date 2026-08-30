using HMS.Application.Features.Payroll;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
public class PayrollController : ApiControllerBase
{
    private readonly IPayrollService _payrollService;

    public PayrollController(IPayrollService payrollService) => _payrollService = payrollService;

    [HttpPost]
    public async Task<ActionResult<PayrollDto>> Generate(GeneratePayrollRequest request) => Ok(await _payrollService.GenerateAsync(request));

    [HttpGet("employee/{employeeId:int}")]
    public async Task<ActionResult<IReadOnlyList<PayrollDto>>> GetByEmployee(int employeeId) => Ok(await _payrollService.GetByEmployeeAsync(employeeId));

    [HttpGet("period/{payPeriod}")]
    public async Task<ActionResult<IReadOnlyList<PayrollDto>>> GetByPeriod(string payPeriod) => Ok(await _payrollService.GetByPeriodAsync(payPeriod, CurrentBranchId));
}
