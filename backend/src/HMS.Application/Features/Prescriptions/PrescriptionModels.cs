using HMS.Domain.Enums;

namespace HMS.Application.Features.Prescriptions;

public record PrescriptionItemDto(int MedicineId, string MedicineName, string Dosage, string Frequency, int DurationDays, string? Instructions);

public record PrescriptionDto(
    int Id, int PatientId, string PatientName, int DoctorId, string DoctorName,
    int? OpdVisitId, int? IpdAdmissionId, DateTime PrescribedDate, PrescriptionStatus Status,
    string? DigitalSignature, IReadOnlyList<PrescriptionItemDto> Items);

public record PrescriptionItemRequest(int MedicineId, string Dosage, string Frequency, int DurationDays, string? Instructions);

public record CreatePrescriptionRequest(
    int PatientId, int? OpdVisitId, int? IpdAdmissionId,
    IReadOnlyList<PrescriptionItemRequest> Items, string? DigitalSignature);

public interface IPrescriptionService
{
    Task<PrescriptionDto> CreateAsync(CreatePrescriptionRequest request, int doctorId);
    Task<PrescriptionDto> GetByIdAsync(int id);
    Task<IReadOnlyList<PrescriptionDto>> GetByPatientAsync(int patientId);
    Task MarkDispensedAsync(int id);
    Task CancelAsync(int id);
}
