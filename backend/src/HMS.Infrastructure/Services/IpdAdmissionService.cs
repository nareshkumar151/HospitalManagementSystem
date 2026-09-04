using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.IpdAdmissions;
using HMS.Domain.Enums;

namespace HMS.Infrastructure.Services;

public class IpdAdmissionService : IIpdAdmissionService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public IpdAdmissionService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<IpdAdmissionDto> AdmitAsync(AdmitPatientRequest request, int branchId)
    {
        var number = await _db.ExecuteScalarAsync<string>("sp_IpdAdmission_NextNumber");
        var newId = await _db.QuerySingleAsync<int>("sp_IpdAdmission_Admit", new
        {
            AdmissionNumber = number,
            request.PatientId,
            request.DoctorId,
            request.BedId,
            AdmissionType = request.AdmissionType.ToString(),
            request.ReasonForAdmission,
            BranchId = branchId
        });

        await _auditService.LogAsync("PatientAdmitted", "IpdAdmission", newId.ToString(), number);
        return await GetByIdAsync(newId);
    }

    public async Task<IpdAdmissionDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<IpdAdmissionDto>("sp_IpdAdmission_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.IpdAdmission), id);

    public Task<IReadOnlyList<IpdAdmissionDto>> GetActiveAsync(int branchId)
        => _db.QueryAsync<IpdAdmissionDto>("sp_IpdAdmission_GetActive", new { BranchId = branchId });

    public async Task<PagedResult<IpdAdmissionDto>> SearchAsync(PagedRequest request, int branchId, DateTime? fromDate = null, DateTime? toDate = null, AdmissionStatus? status = null)
    {
        var (items, counts) = await _db.QueryMultipleAsync<IpdAdmissionDto, int>("sp_IpdAdmission_Search", new
        {
            BranchId = branchId,
            request.PageNumber,
            request.PageSize,
            request.Search,
            FromDate = fromDate?.Date,
            ToDate = toDate?.Date,
            Status = status?.ToString()
        });

        return new PagedResult<IpdAdmissionDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public Task<IReadOnlyList<IpdAdmissionDto>> GetByPatientAsync(int patientId, int branchId)
        => _db.QueryAsync<IpdAdmissionDto>("sp_IpdAdmission_GetByPatient", new { PatientId = patientId, BranchId = branchId });

    public async Task AssignNurseAsync(int admissionId, AssignNurseRequest request)
    {
        await GetByIdAsync(admissionId);
        await _db.ExecuteAsync("sp_IpdAdmission_AssignNurse", new { Id = admissionId, request.NurseUserId });
    }

    public async Task TransferBedAsync(int admissionId, TransferBedRequest request)
    {
        await GetByIdAsync(admissionId);
        await _db.ExecuteAsync("sp_IpdAdmission_TransferBed", new { Id = admissionId, request.NewBedId });
        await _auditService.LogAsync("BedTransferred", "IpdAdmission", admissionId.ToString());
    }
}
