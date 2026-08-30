using HMS.Domain.Enums;

namespace HMS.Application.Features.Radiology;

public record RadiologyOrderDto(
    int Id, int PatientId, string PatientName, int DoctorId, string DoctorName,
    string ScanType, RadiologyStatus Status, DateTime OrderedAt, decimal Price,
    string? ImageUrl, string? ReportFileUrl, string? DoctorNotes);

public record OrderRadiologyRequest(int PatientId, string ScanType, decimal Price, int? OpdVisitId, int? IpdAdmissionId);
public record UploadRadiologyReportRequest(string? ImageUrl, string? ReportFileUrl, string? DoctorNotes);

public interface IRadiologyService
{
    Task<RadiologyOrderDto> OrderAsync(OrderRadiologyRequest request, int doctorId);
    Task<RadiologyOrderDto> UploadReportAsync(int orderId, UploadRadiologyReportRequest request, int uploadedByUserId);
    Task<IReadOnlyList<RadiologyOrderDto>> GetByPatientAsync(int patientId);
    Task<IReadOnlyList<RadiologyOrderDto>> GetPendingAsync(int branchId);
}
