namespace HMS.Application.Features.Departments;

public record DepartmentDto(int Id, int BranchId, string Name, string? Description, bool IsActive);
public record UpsertDepartmentRequest(int BranchId, string Name, string? Description);

public interface IDepartmentService
{
    Task<IReadOnlyList<DepartmentDto>> GetAllAsync(int? branchId = null);
    Task<DepartmentDto> GetByIdAsync(int id);
    Task<DepartmentDto> CreateAsync(UpsertDepartmentRequest request);
    Task UpdateAsync(int id, UpsertDepartmentRequest request);
    Task DeleteAsync(int id);
}

public record HospitalDto(int Id, string Name, string RegistrationNumber, string Address, string ContactNumber, string? Email, string? LogoUrl, string? ThemeColor);
public record UpsertHospitalRequest(string Name, string RegistrationNumber, string Address, string ContactNumber, string? Email, string? ThemeColor = null);

/// <summary> Cosmetic-only, deliberately narrower than HospitalDto - fetched by every signed-in session
/// (any role) to paint the app in its own hospital's colors, so it can't leak the rest of HospitalDto. </summary>
public record HospitalThemeDto(int Id, string? ThemeColor);

public record BranchDto(int Id, int HospitalId, string Name, string Address, string City, string ContactNumber, bool IsActive);
public record UpsertBranchRequest(int HospitalId, string Name, string Address, string City, string ContactNumber);

public interface IOrganizationService
{
    /// <summary> Pass `hospitalId` to scope to just that hospital (a branch-bound Administrator's own);
    /// null returns every hospital (SuperAdmin only). </summary>
    Task<IReadOnlyList<HospitalDto>> GetHospitalsAsync(int? hospitalId = null);
    Task<HospitalDto> CreateHospitalAsync(UpsertHospitalRequest request);
    Task UpdateHospitalAsync(int id, UpsertHospitalRequest request);
    /// <summary> Refuses (ConflictException) if the hospital still has active branches - delete/deactivate those first. </summary>
    Task DeleteHospitalAsync(int id);
    Task<HospitalThemeDto> GetHospitalThemeAsync(int id);

    Task<IReadOnlyList<BranchDto>> GetBranchesAsync(int? hospitalId = null);
    Task<BranchDto> CreateBranchAsync(UpsertBranchRequest request);
    Task UpdateBranchAsync(int id, UpsertBranchRequest request);
    /// <summary> Refuses (ConflictException) if the branch still has active departments, doctors, employees, or patients. </summary>
    Task DeleteBranchAsync(int id);
}
