using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Payroll;

namespace HMS.Infrastructure.Services;

public class PayrollService : IPayrollService
{
    // Statutory percentages kept as constants for clarity; move to configuration if they vary by branch/state.
    private const decimal PfPercent = 12m;
    private const decimal EsiPercent = 0.75m;

    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public PayrollService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<PayrollDto> GenerateAsync(GeneratePayrollRequest request)
    {
        var employee = await _db.QuerySingleAsync<dynamic>("sp_Employee_GetById", new { Id = request.EmployeeId });
        decimal basic = (decimal)employee.Salary;

        var pf = Math.Round(basic * PfPercent / 100m, 2);
        var esi = Math.Round(basic * EsiPercent / 100m, 2);
        var net = basic - pf - esi - request.TaxDeduction + request.Bonus;

        await _db.QuerySingleAsync<int>("sp_Payroll_Generate", new
        {
            request.EmployeeId,
            request.PayPeriod,
            BasicSalary = basic,
            PF = pf,
            ESI = esi,
            request.TaxDeduction,
            request.Bonus,
            NetSalary = net
        });

        await _auditService.LogAsync("PayrollGenerated", "Payroll", request.EmployeeId.ToString(), request.PayPeriod);

        var list = await GetByEmployeeAsync(request.EmployeeId);
        return list.First(p => p.PayPeriod == request.PayPeriod);
    }

    public Task<IReadOnlyList<PayrollDto>> GetByEmployeeAsync(int employeeId)
        => _db.QueryAsync<PayrollDto>("sp_Payroll_GetByEmployee", new { EmployeeId = employeeId });

    public Task<IReadOnlyList<PayrollDto>> GetByPeriodAsync(string payPeriod, int branchId)
        => _db.QueryAsync<PayrollDto>("sp_Payroll_GetByPeriod", new { PayPeriod = payPeriod, BranchId = branchId });
}
