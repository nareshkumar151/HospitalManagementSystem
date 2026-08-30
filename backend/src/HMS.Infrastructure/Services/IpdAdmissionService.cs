using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.IpdAdmissions;

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

    public async Task<IpdAdmissionDto> AdmitAsync(AdmitPatientRequest request)
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
            request.BranchId
        });

        await _auditService.LogAsync("PatientAdmitted", "IpdAdmission", newId.ToString(), number);
        return await GetByIdAsync(newId);
    }

    public async Task<IpdAdmissionDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<IpdAdmissionDto>("sp_IpdAdmission_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.IpdAdmission), id);

    public Task<IReadOnlyList<IpdAdmissionDto>> GetActiveAsync()
        => _db.QueryAsync<IpdAdmissionDto>("sp_IpdAdmission_GetActive");

    public Task<IReadOnlyList<IpdAdmissionDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<IpdAdmissionDto>("sp_IpdAdmission_GetByPatient", new { PatientId = patientId });

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
