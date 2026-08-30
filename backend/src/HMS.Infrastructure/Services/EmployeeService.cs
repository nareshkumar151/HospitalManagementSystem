using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Employees;

namespace HMS.Infrastructure.Services;

public class EmployeeService : IEmployeeService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public EmployeeService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<PagedResult<EmployeeDto>> SearchAsync(PagedRequest request, int branchId)
    {
        var (items, counts) = await _db.QueryMultipleAsync<EmployeeDto, int>("sp_Employee_Search", new
        {
            request.PageNumber,
            request.PageSize,
            request.Search,
            DepartmentId = (int?)null,
            BranchId = branchId
        });

        return new PagedResult<EmployeeDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<EmployeeDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<EmployeeDto>("sp_Employee_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.Employee), id);

    public async Task<EmployeeDto> CreateAsync(UpsertEmployeeRequest request)
    {
        var code = await _db.ExecuteScalarAsync<string>("sp_Employee_NextCode");
        var newId = await _db.QuerySingleAsync<int>("sp_Employee_Insert", new
        {
            EmployeeCode = code,
            request.FullName,
            request.DepartmentId,
            request.Designation,
            request.Salary,
            request.JoiningDate,
            request.Shift,
            request.Contact,
            request.EmailId,
            request.EmergencyContact,
            request.BranchId
        });
        await _auditService.LogAsync("EmployeeCreated", "Employee", newId.ToString(), code);
        return await GetByIdAsync(newId);
    }

    public async Task UpdateAsync(int id, UpsertEmployeeRequest request)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Employee_Update", new
        {
            Id = id,
            request.FullName,
            request.DepartmentId,
            request.Designation,
            request.Salary,
            request.JoiningDate,
            request.Shift,
            request.Contact,
            request.EmailId,
            request.EmergencyContact
        });
    }

    public async Task DeactivateAsync(int id)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Employee_Deactivate", new { Id = id });
        await _auditService.LogAsync("EmployeeDeactivated", "Employee", id.ToString());
    }

    public async Task<string> GenerateOfferLetterAsync(int employeeId, string letterType)
    {
        var employee = await GetByIdAsync(employeeId);
        // Document rendering (PDF) is a presentation concern handled by a templating/report service at the API
        // edge; this returns the logical file path the API's letter-generation endpoint writes to.
        await _auditService.LogAsync("LetterGenerated", "Employee", employeeId.ToString(), letterType);
        return $"/files/letters/{employee.EmployeeCode}-{letterType}.pdf";
    }
}
