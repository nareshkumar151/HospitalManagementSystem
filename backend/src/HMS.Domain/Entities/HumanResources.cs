using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 22: Attendance. </summary>
public class Attendance : BaseEntity
{
    public int EmployeeId { get; set; }
    public DateTime AttendanceDate { get; set; }
    public DateTime? CheckIn { get; set; }
    public DateTime? CheckOut { get; set; }
    public decimal OvertimeHours { get; set; }
    public string Shift { get; set; } = default!;
}

/// <summary> Module 21: Payroll. </summary>
public class Payroll : BaseEntity
{
    public int EmployeeId { get; set; }
    public string PayPeriod { get; set; } = default!; // e.g. "2026-08"
    public decimal BasicSalary { get; set; }
    public decimal PF { get; set; }
    public decimal ESI { get; set; }
    public decimal TaxDeduction { get; set; }
    public decimal Bonus { get; set; }
    public decimal NetSalary { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string? PayslipUrl { get; set; }
}

public class LeaveRequest : BaseEntity
{
    public int EmployeeId { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
    public string Reason { get; set; } = default!;
    public LeaveStatus Status { get; set; } = LeaveStatus.Requested;
    public int? ApprovedByUserId { get; set; }
}
