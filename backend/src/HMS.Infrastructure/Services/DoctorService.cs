using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Doctors;

namespace HMS.Infrastructure.Services;

public class DoctorService : IDoctorService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public DoctorService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<PagedResult<DoctorDto>> SearchAsync(PagedRequest request)
    {
        var (items, counts) = await _db.QueryMultipleAsync<DoctorDto, int>("sp_Doctor_Search", new
        {
            request.PageNumber,
            request.PageSize,
            request.Search,
            DepartmentId = (int?)null,
            BranchId = (int?)null
        });

        return new PagedResult<DoctorDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public Task<IReadOnlyList<DoctorDto>> GetByDepartmentAsync(int departmentId)
        => _db.QueryAsync<DoctorDto>("sp_Doctor_GetByDepartment", new { DepartmentId = departmentId });

    public async Task<DoctorDto> GetByIdAsync(int id)
    {
        return await _db.QuerySingleOrDefaultAsync<DoctorDto>("sp_Doctor_GetById", new { Id = id })
            ?? throw new NotFoundException(nameof(Domain.Entities.Doctor), id);
    }

    public async Task<DoctorDto> CreateAsync(UpsertDoctorRequest request)
    {
        var code = await _db.ExecuteScalarAsync<string>("sp_Doctor_NextCode");
        var newId = await _db.QuerySingleAsync<int>("sp_Doctor_Insert", new
        {
            DoctorCode = code,
            request.FullName,
            request.DepartmentId,
            request.Qualification,
            request.ExperienceYears,
            request.ConsultationFee,
            request.AvailableDays,
            request.Mobile,
            request.Email,
            request.BranchId
        });
        await _auditService.LogAsync("DoctorCreated", "Doctor", newId.ToString());
        return await GetByIdAsync(newId);
    }

    public async Task UpdateAsync(int id, UpsertDoctorRequest request)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Doctor_Update", new
        {
            Id = id,
            request.FullName,
            request.DepartmentId,
            request.Qualification,
            request.ExperienceYears,
            request.ConsultationFee,
            request.AvailableDays,
            request.Mobile,
            request.Email
        });
        await _auditService.LogAsync("DoctorUpdated", "Doctor", id.ToString());
    }

    public async Task DeleteAsync(int id)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Doctor_Delete", new { Id = id });
        await _auditService.LogAsync("DoctorDeactivated", "Doctor", id.ToString());
    }

    public async Task UploadSignatureAsync(int id, string signatureUrl)
    {
        await GetByIdAsync(id);
        await _db.ExecuteAsync("sp_Doctor_UpdateSignature", new { Id = id, DigitalSignatureUrl = signatureUrl });
    }
}
