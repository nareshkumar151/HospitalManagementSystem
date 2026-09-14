namespace HMS.Application.Features.Nursing;

// IpdAdmissionId/AppointmentId are mutually exclusive (see 28_Schema_AppointmentVitals.sql's check
// constraint) - an IPD chart entry carries the former, an OPD appointment's vitals snapshot the latter.
public record NursingChartDto(
    int Id, int? IpdAdmissionId, int? AppointmentId, int NurseUserId, string NurseName, DateTime RecordedAt,
    decimal? Temperature, int? Pulse, string? BloodPressure, decimal? Oxygen, decimal? Weight,
    decimal? SugarLevel, string? MedicationSchedule, string? DailyNotes, string? PatientMonitoring,
    int? RespiratoryRate, int? PainScore, string? Consciousness, int? EarlyWarningScore);

public record RecordVitalsRequest(
    decimal? Temperature, int? Pulse, string? BloodPressure, decimal? Oxygen, decimal? Weight,
    decimal? SugarLevel, string? MedicationSchedule, string? DailyNotes, string? PatientMonitoring,
    int? RespiratoryRate, int? PainScore, string? Consciousness);

public record NursingRequestDto(int Id, int IpdAdmissionId, string RequestType, string Details, string Status, DateTime CreatedAt);
public record RaiseNursingRequestRequest(string RequestType, string Details); // Investigation | Medicine | Refund

public interface INursingService
{
    Task<NursingChartDto> RecordVitalsAsync(int admissionId, RecordVitalsRequest request, int nurseUserId);
    Task<IReadOnlyList<NursingChartDto>> GetChartAsync(int admissionId);

    // Appointment-linked vitals: one editable snapshot per appointment rather than an append-only chart -
    // see sp_NursingChart_UpsertForAppointment.
    Task<NursingChartDto> RecordAppointmentVitalsAsync(int appointmentId, RecordVitalsRequest request, int nurseUserId);
    Task<NursingChartDto?> GetAppointmentVitalsAsync(int appointmentId);

    Task<NursingRequestDto> RaiseRequestAsync(int admissionId, RaiseNursingRequestRequest request, int nurseUserId);
    Task<IReadOnlyList<NursingRequestDto>> GetRequestsAsync(int admissionId);
}
