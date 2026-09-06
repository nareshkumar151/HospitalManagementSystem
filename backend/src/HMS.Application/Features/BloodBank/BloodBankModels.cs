namespace HMS.Application.Features.BloodBank;

public record TransfusionReactionDto(
    int Id, int PatientId, string PatientName, int? IpdAdmissionId, string? BloodGroup,
    string ComponentTransfused, decimal? UnitsTransfused, string ReactionType, string? Symptoms,
    DateTime OnsetTime, string? ActionTaken, string Outcome, string? Remarks, string ReportedByName);

public record RecordTransfusionReactionRequest(
    int PatientId, int? IpdAdmissionId, string? BloodGroup, string ComponentTransfused, decimal? UnitsTransfused,
    string ReactionType, string? Symptoms, string? ActionTaken, string Outcome, string? Remarks);

public interface IBloodBankService
{
    Task<TransfusionReactionDto> RecordAsync(RecordTransfusionReactionRequest request, int userId);
    Task<TransfusionReactionDto> GetByIdAsync(int id);
    Task<IReadOnlyList<TransfusionReactionDto>> GetByPatientAsync(int patientId);
}
