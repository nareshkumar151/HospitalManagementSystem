using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
using HMS.Application.Features.Laboratory;

namespace HMS.Infrastructure.Services;

public class LaboratoryService : ILaboratoryService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public LaboratoryService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<LabTestCatalogDto>> GetCatalogAsync() => _db.QueryAsync<LabTestCatalogDto>("sp_LabTestCatalog_GetAll");

    public async Task<LabTestCatalogDto> AddCatalogItemAsync(UpsertLabTestCatalogRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_LabTestCatalog_Insert", request);
        var catalog = await GetCatalogAsync();
        return catalog.First(c => c.Id == newId);
    }

    public Task UpdateCatalogItemAsync(int id, UpsertLabTestCatalogRequest request)
        => _db.ExecuteAsync("sp_LabTestCatalog_Update", new { Id = id, request.TestName, request.Category, request.Price, request.NormalRange });

    public Task DeleteCatalogItemAsync(int id) => _db.ExecuteAsync("sp_LabTestCatalog_Delete", new { Id = id });

    public async Task<LabTestOrderDto> OrderTestAsync(OrderLabTestRequest request, int doctorId)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_LabTestOrder_Insert", new
        {
            request.PatientId,
            DoctorId = doctorId,
            request.LabTestCatalogId,
            request.OpdVisitId,
            request.IpdAdmissionId
        });
        await _auditService.LogAsync("LabTestOrdered", "LabTestOrder", newId.ToString());
        return await GetOrderByIdAsync(newId);
    }

    public async Task<LabTestOrderDto> CollectSampleAsync(int orderId, int technicianUserId)
    {
        await _db.ExecuteAsync("sp_LabTestOrder_CollectSample", new { Id = orderId, CollectedByUserId = technicianUserId });
        return await GetOrderByIdAsync(orderId);
    }

    public async Task<LabTestOrderDto> UploadReportAsync(int orderId, UploadLabReportRequest request, int technicianUserId)
    {
        await _db.ExecuteAsync("sp_LabReport_Insert", new
        {
            LabTestOrderId = orderId,
            request.ResultSummary,
            request.ReportFileUrl,
            UploadedByUserId = technicianUserId
        });
        await _auditService.LogAsync("LabReportUploaded", "LabTestOrder", orderId.ToString());
        return await GetOrderByIdAsync(orderId);
    }

    public async Task<LabTestOrderDto> ReviewReportAsync(int orderId, ReviewLabReportRequest request)
    {
        await _db.ExecuteAsync("sp_LabReport_Review", new { LabTestOrderId = orderId, request.DoctorRemarks });
        return await GetOrderByIdAsync(orderId);
    }

    public async Task<PagedResult<LabTestOrderDto>> GetPendingAsync(int branchId, PagedRequest request)
    {
        var (headers, counts) = await _db.QueryMultipleAsync<OrderHeaderRow, int>("sp_LabTestOrder_GetPending", new
        {
            BranchId = branchId,
            request.PageNumber,
            request.PageSize,
            request.Search
        });

        return new PagedResult<LabTestOrderDto>
        {
            Items = headers.Select(r => Map(r, null)).ToList(),
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public Task<IReadOnlyList<LabTestOrderDto>> GetByPatientAsync(int patientId)
        => QueryOrdersAsync("sp_LabTestOrder_GetByPatient", new { PatientId = patientId });

    private async Task<LabTestOrderDto> GetOrderByIdAsync(int id)
    {
        var (headers, reports) = await _db.QueryMultipleAsync<OrderHeaderRow, LabReportDto>("sp_LabTestOrder_GetById", new { Id = id });
        var header = headers.FirstOrDefault() ?? throw new NotFoundException(nameof(Domain.Entities.LabTestOrder), id);
        return Map(header, reports.FirstOrDefault());
    }

    private async Task<IReadOnlyList<LabTestOrderDto>> QueryOrdersAsync(string sp, object? parameters = null)
    {
        var rows = await _db.QueryAsync<OrderHeaderRow>(sp, parameters);
        return rows.Select(r => Map(r, null)).ToList();
    }

    private static LabTestOrderDto Map(OrderHeaderRow r, LabReportDto? report) =>
        new(r.Id, r.PatientId, r.PatientName, r.DoctorId, r.DoctorName, r.LabTestCatalogId, r.TestName,
            Enum.Parse<Domain.Enums.LabTestStatus>(r.Status), r.OrderedAt, r.SampleCollectedAt, report);

    internal record OrderHeaderRow(
        int Id, int PatientId, string PatientName, int DoctorId, string DoctorName,
        int LabTestCatalogId, string TestName, string Status, DateTime OrderedAt, DateTime? SampleCollectedAt);
}
