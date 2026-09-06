namespace HMS.Application.Features.OperationTheatre;

public record SurgeryDto(
    int Id, int PatientId, string PatientName, int IpdAdmissionId, string SurgeryName,
    int SurgeonDoctorId, string SurgeonName, int? AssistantDoctorId, int? NurseUserId,
    string? Equipment, DateTime ScheduledAt, DateTime? CompletedAt, string? OperationNotes,
    string? Anesthesia, decimal OperationCost, string Status);

public record ScheduleSurgeryRequest(
    int PatientId, int IpdAdmissionId, string SurgeryName, int SurgeonDoctorId, int? AssistantDoctorId,
    int? NurseUserId, string? Equipment, DateTime ScheduledAt, decimal OperationCost);

public record CompleteSurgeryRequest(string OperationNotes, string? Anesthesia);

// --- Checklists (Pre-Op / Instrument & Swab Count / OT Cleaning) -----------------------------------------

public record ChecklistItemDto(string Label, bool Checked, string? Remarks);

public record SurgeryChecklistDto(
    int Id, int SurgeryId, string ChecklistType, IReadOnlyList<ChecklistItemDto> Items, string? Remarks,
    string CompletedByName, DateTime CompletedAt);

public record SaveSurgeryChecklistRequest(int SurgeryId, string ChecklistType, IReadOnlyList<ChecklistItemDto> Items, string? Remarks);

// --- Anesthesia Monitoring Record -------------------------------------------------------------------------

public record SurgeryAnesthesiaRecordDto(
    int Id, int SurgeryId, DateTime RecordedAt, string RecordedByName, string? AnesthesiaType,
    string? BloodPressure, int? PulseRate, decimal? SpO2, decimal? Temperature, string? Remarks);

public record RecordAnesthesiaRequest(
    int SurgeryId, string? AnesthesiaType, string? BloodPressure, int? PulseRate, decimal? SpO2,
    decimal? Temperature, string? Remarks);

// --- Post-Op Recovery Room Record (Aldrete Score) ---------------------------------------------------------

public record SurgeryRecoveryRecordDto(
    int Id, int SurgeryId, DateTime RecordedAt, string RecordedByName, int Activity, int Respiration,
    int Circulation, int Consciousness, int OxygenSaturation, int AldreteTotal, string? BloodPressure,
    int? Pulse, decimal? SpO2, string? Remarks, DateTime? DischargedFromRecoveryAt);

public record RecordRecoveryRequest(
    int SurgeryId, int Activity, int Respiration, int Circulation, int Consciousness, int OxygenSaturation,
    string? BloodPressure, int? Pulse, decimal? SpO2, string? Remarks);

public interface IOperationTheatreService
{
    Task<SurgeryDto> ScheduleAsync(ScheduleSurgeryRequest request);
    Task<SurgeryDto> CompleteAsync(int id, CompleteSurgeryRequest request);
    Task<SurgeryDto> CancelAsync(int id, string reason);
    Task<SurgeryDto> GetByIdAsync(int id);
    Task<IReadOnlyList<SurgeryDto>> GetTodaysScheduleAsync(int branchId);
    Task<IReadOnlyList<SurgeryDto>> GetByPatientAsync(int patientId);

    Task<SurgeryChecklistDto> SaveChecklistAsync(SaveSurgeryChecklistRequest request, int userId);
    Task<IReadOnlyList<SurgeryChecklistDto>> GetChecklistsAsync(int surgeryId);

    Task<SurgeryAnesthesiaRecordDto> RecordAnesthesiaAsync(RecordAnesthesiaRequest request, int userId);
    Task<IReadOnlyList<SurgeryAnesthesiaRecordDto>> GetAnesthesiaRecordsAsync(int surgeryId);

    Task<SurgeryRecoveryRecordDto> RecordRecoveryAsync(RecordRecoveryRequest request, int userId);
    Task<IReadOnlyList<SurgeryRecoveryRecordDto>> GetRecoveryRecordsAsync(int surgeryId);
    Task MarkRecoveryDischargedAsync(int recoveryRecordId);
}
