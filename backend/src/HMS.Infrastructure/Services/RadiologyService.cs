using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Radiology;

namespace HMS.Infrastructure.Services;

public class RadiologyService : IRadiologyService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public RadiologyService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public async Task<RadiologyOrderDto> OrderAsync(OrderRadiologyRequest request, int doctorId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_RadiologyOrder_Insert", new
        {
            request.PatientId,
            DoctorId = doctorId,
            request.ScanType,
            request.Price,
            request.OpdVisitId,
            request.IpdAdmissionId
        });
        await _auditService.LogAsync("RadiologyOrdered", "RadiologyOrder", newId.ToString());
        return await GetByIdAsync(newId);
    }

    public async Task<RadiologyOrderDto> UploadReportAsync(int orderId, UploadRadiologyReportRequest request, int uploadedByUserId)
    {
        await _db.ExecuteAsync("sp_RadiologyReport_Insert", new
        {
            RadiologyOrderId = orderId,
            request.ImageUrl,
            request.ReportFileUrl,
            request.DoctorNotes,
            UploadedByUserId = uploadedByUserId
        });
        await _auditService.LogAsync("RadiologyReportUploaded", "RadiologyOrder", orderId.ToString());
        return await GetByIdAsync(orderId);
    }

    private async Task<RadiologyOrderDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<RadiologyOrderDto>("sp_RadiologyOrder_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.RadiologyOrder), id);

    public Task<IReadOnlyList<RadiologyOrderDto>> GetByPatientAsync(int patientId)
        => _db.QueryAsync<RadiologyOrderDto>("sp_RadiologyOrder_GetByPatient", new { PatientId = patientId });

    public Task<IReadOnlyList<RadiologyOrderDto>> GetPendingAsync(int branchId)
        => _db.QueryAsync<RadiologyOrderDto>("sp_RadiologyOrder_GetPending", new { BranchId = branchId });
}
