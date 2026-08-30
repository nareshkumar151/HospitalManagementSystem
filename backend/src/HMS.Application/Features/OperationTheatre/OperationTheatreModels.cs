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

public interface IOperationTheatreService
{
    Task<SurgeryDto> ScheduleAsync(ScheduleSurgeryRequest request);
    Task<SurgeryDto> CompleteAsync(int id, CompleteSurgeryRequest request);
    Task<SurgeryDto> CancelAsync(int id, string reason);
    Task<IReadOnlyList<SurgeryDto>> GetTodaysScheduleAsync();
    Task<IReadOnlyList<SurgeryDto>> GetByPatientAsync(int patientId);
}
