using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 16: Employee Management (covers Nurse/Pharmacist/LabTech/HR/Receptionist staff profiles). </summary>
public class Employee : BaseEntity
{
    public string EmployeeCode { get; set; } = default!;
    public string FullName { get; set; } = default!;
    public int DepartmentId { get; set; }
    public string Designation { get; set; } = default!;
    public decimal Salary { get; set; }
    public DateTime JoiningDate { get; set; }
    public string Shift { get; set; } = default!;
    public string Contact { get; set; } = default!;
    public string EmailId { get; set; } = default!;
    public string? EmergencyContact { get; set; }
    public int BranchId { get; set; }
    public bool IsActive { get; set; } = true;
}
