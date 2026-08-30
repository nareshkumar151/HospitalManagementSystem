using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Departments;

namespace HMS.Infrastructure.Services;

public class DepartmentService : IDepartmentService
{
    private readonly ISqlDataAccess _db;

    public DepartmentService(ISqlDataAccess db) => _db = db;

    public Task<IReadOnlyList<DepartmentDto>> GetAllAsync(int? branchId = null)
        => _db.QueryAsync<DepartmentDto>("sp_Department_GetAll", new { BranchId = branchId });

    public async Task<DepartmentDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<DepartmentDto>("sp_Department_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.Department), id);

    public async Task<DepartmentDto> CreateAsync(UpsertDepartmentRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Department_Insert", new { request.BranchId, request.Name, request.Description });
        return await GetByIdAsync(newId);
    }

    public async Task UpdateAsync(int id, UpsertDepartmentRequest request)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Department_Update", new { Id = id, request.BranchId, request.Name, request.Description });
    }

    public async Task DeleteAsync(int id)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Department_Delete", new { Id = id });
    }
}

public class OrganizationService : IOrganizationService
{
    private readonly ISqlDataAccess _db;

    public OrganizationService(ISqlDataAccess db) => _db = db;

    public Task<IReadOnlyList<HospitalDto>> GetHospitalsAsync() => _db.QueryAsync<HospitalDto>("sp_Hospital_GetAll");

    public async Task<HospitalDto> CreateHospitalAsync(UpsertHospitalRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Hospital_Insert", request);
        var hospitals = await GetHospitalsAsync();
        return hospitals.First(h => h.Id == newId);
    }

    public Task UpdateHospitalAsync(int id, UpsertHospitalRequest request)
        => _db.ExecuteAsync("sp_Hospital_Update", new { Id = id, request.Name, request.RegistrationNumber, request.Address, request.ContactNumber, request.Email });

    public Task DeleteHospitalAsync(int id) => _db.ExecuteAsync("sp_Hospital_Delete", new { Id = id });

    public Task<IReadOnlyList<BranchDto>> GetBranchesAsync(int? hospitalId = null)
        => _db.QueryAsync<BranchDto>("sp_Branch_GetAll", new { HospitalId = hospitalId });

    public async Task<BranchDto> CreateBranchAsync(UpsertBranchRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Branch_Insert", request);
        var branches = await GetBranchesAsync();
        return branches.First(b => b.Id == newId);
    }

    public Task UpdateBranchAsync(int id, UpsertBranchRequest request)
        => _db.ExecuteAsync("sp_Branch_Update", new { Id = id, request.Name, request.Address, request.City, request.ContactNumber });

    public Task DeleteBranchAsync(int id) => _db.ExecuteAsync("sp_Branch_Delete", new { Id = id });
}
