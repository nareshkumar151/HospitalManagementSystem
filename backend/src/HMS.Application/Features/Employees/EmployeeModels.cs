using HMS.Application.Common.Models;

namespace HMS.Application.Features.Employees;

public record EmployeeDto(
    int Id, string EmployeeCode, string FullName, int DepartmentId, string? DepartmentName, string Designation,
    decimal Salary, DateTime JoiningDate, string Shift, string Contact, string EmailId, string? EmergencyContact,
    int BranchId, bool IsActive,
    /// <summary> Whether a Users login already exists for this employee - creating the Employees row alone does not create one. </summary>
    bool HasLogin);

public record UpsertEmployeeRequest(
    string FullName, int DepartmentId, string Designation, decimal Salary, DateTime JoiningDate,
    string Shift, string Contact, string EmailId, string? EmergencyContact, int BranchId);

public interface IEmployeeService
{
    Task<PagedResult<EmployeeDto>> SearchAsync(PagedRequest request, int branchId);
    Task<EmployeeDto> GetByIdAsync(int id);
    Task<EmployeeDto> CreateAsync(UpsertEmployeeRequest request);
    Task UpdateAsync(int id, UpsertEmployeeRequest request);
    Task DeactivateAsync(int id);

    /// <summary> Generates an offer/appointment letter document (highlighted SRS addition). </summary>
    Task<string> GenerateOfferLetterAsync(int employeeId, string letterType); // returns file URL
}
