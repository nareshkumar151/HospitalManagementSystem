namespace HMS.Application.Features.Payroll;

public record PayrollDto(
    int Id, int EmployeeId, string EmployeeName, string PayPeriod, decimal BasicSalary, decimal PF,
    decimal ESI, decimal TaxDeduction, decimal Bonus, decimal NetSalary, DateTime GeneratedAt, string? PayslipUrl);

public record GeneratePayrollRequest(int EmployeeId, string PayPeriod, decimal Bonus, decimal TaxDeduction);

public interface IPayrollService
{
    /// <summary> Computes PF/ESI statutory deductions off the employee's basic salary and generates a payslip. </summary>
    Task<PayrollDto> GenerateAsync(GeneratePayrollRequest request);
    Task<IReadOnlyList<PayrollDto>> GetByEmployeeAsync(int employeeId);
    Task<IReadOnlyList<PayrollDto>> GetByPeriodAsync(string payPeriod, int branchId);
}
