using HMS.Domain.Enums;

namespace HMS.Application.Features.Laboratory;

public record LabTestCatalogDto(int Id, string TestName, string Category, decimal Price, string? NormalRange);
public record UpsertLabTestCatalogRequest(string TestName, string Category, decimal Price, string? NormalRange);

public record LabTestOrderDto(
    int Id, int PatientId, string PatientName, int DoctorId, string DoctorName,
    int LabTestCatalogId, string TestName, LabTestStatus Status, DateTime OrderedAt,
    DateTime? SampleCollectedAt, LabReportDto? Report);

public record OrderLabTestRequest(int PatientId, int LabTestCatalogId, int? OpdVisitId, int? IpdAdmissionId);

public record LabReportDto(int Id, int LabTestOrderId, string? ResultSummary, string? ReportFileUrl, DateTime UploadedAt, bool ReviewedByDoctor, string? DoctorRemarks);
public record UploadLabReportRequest(string? ResultSummary, string ReportFileUrl);
public record ReviewLabReportRequest(string DoctorRemarks);

public interface ILaboratoryService
{
    Task<IReadOnlyList<LabTestCatalogDto>> GetCatalogAsync();
    Task<LabTestCatalogDto> AddCatalogItemAsync(UpsertLabTestCatalogRequest request);
    Task UpdateCatalogItemAsync(int id, UpsertLabTestCatalogRequest request);
    Task DeleteCatalogItemAsync(int id);

    Task<LabTestOrderDto> OrderTestAsync(OrderLabTestRequest request, int doctorId);
    Task<LabTestOrderDto> CollectSampleAsync(int orderId, int technicianUserId);
    Task<LabTestOrderDto> UploadReportAsync(int orderId, UploadLabReportRequest request, int technicianUserId);
    Task<LabTestOrderDto> ReviewReportAsync(int orderId, ReviewLabReportRequest request);
    Task<IReadOnlyList<LabTestOrderDto>> GetPendingAsync(int branchId);
    Task<IReadOnlyList<LabTestOrderDto>> GetByPatientAsync(int patientId);
}
