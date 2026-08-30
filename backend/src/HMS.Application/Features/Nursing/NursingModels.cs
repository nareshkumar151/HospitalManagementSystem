namespace HMS.Application.Features.Nursing;

public record NursingChartDto(
    int Id, int IpdAdmissionId, int NurseUserId, string NurseName, DateTime RecordedAt,
    decimal? Temperature, int? Pulse, string? BloodPressure, decimal? Oxygen, decimal? Weight,
    decimal? SugarLevel, string? MedicationSchedule, string? DailyNotes, string? PatientMonitoring);

public record RecordVitalsRequest(
    decimal? Temperature, int? Pulse, string? BloodPressure, decimal? Oxygen, decimal? Weight,
    decimal? SugarLevel, string? MedicationSchedule, string? DailyNotes, string? PatientMonitoring);

public record NursingRequestDto(int Id, int IpdAdmissionId, string RequestType, string Details, string Status, DateTime CreatedAt);
public record RaiseNursingRequestRequest(string RequestType, string Details); // Investigation | Medicine | Refund

public interface INursingService
{
    Task<NursingChartDto> RecordVitalsAsync(int admissionId, RecordVitalsRequest request, int nurseUserId);
    Task<IReadOnlyList<NursingChartDto>> GetChartAsync(int admissionId);
    Task<NursingRequestDto> RaiseRequestAsync(int admissionId, RaiseNursingRequestRequest request, int nurseUserId);
    Task<IReadOnlyList<NursingRequestDto>> GetRequestsAsync(int admissionId);
}
