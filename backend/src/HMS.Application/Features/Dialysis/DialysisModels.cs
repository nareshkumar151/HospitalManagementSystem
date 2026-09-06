namespace HMS.Application.Features.Dialysis;

public record DialysisSessionDto(
    int Id, int PatientId, string PatientName, int? IpdAdmissionId, DateTime SessionDate, string DialysisType,
    int? DurationMinutes, decimal? PreWeight, decimal? PostWeight, string? PreBloodPressure,
    string? PostBloodPressure, string? DialyzerType, decimal? BloodFlowRate, decimal? UfGoal,
    decimal? UfAchieved, string? Complications, string? Remarks, string PerformedByName);

public record RecordDialysisSessionRequest(
    int PatientId, int? IpdAdmissionId, string DialysisType, int? DurationMinutes, decimal? PreWeight,
    decimal? PostWeight, string? PreBloodPressure, string? PostBloodPressure, string? DialyzerType,
    decimal? BloodFlowRate, decimal? UfGoal, decimal? UfAchieved, string? Complications, string? Remarks);

public interface IDialysisService
{
    Task<DialysisSessionDto> RecordAsync(RecordDialysisSessionRequest request, int userId);
    Task<DialysisSessionDto> GetByIdAsync(int id);
    Task<IReadOnlyList<DialysisSessionDto>> GetByPatientAsync(int patientId);
}
