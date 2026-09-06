namespace HMS.Application.Features.Er;

public record ErVisitDto(
    int Id, int PatientId, string PatientName, string Uhid, DateTime ArrivalTime, string? ModeOfArrival,
    string? BroughtBy, string ChiefComplaint, string TriageCategory, string Status, string RegisteredByName);

public record RegisterErVisitRequest(
    int PatientId, string? ModeOfArrival, string? BroughtBy, string ChiefComplaint, string TriageCategory);

public record UpdateErDispositionRequest(string Status);

public record ErNurseAssessmentDto(
    int Id, int ErVisitId, DateTime AssessedAt, string NurseName, string? BloodPressure, int? Pulse,
    decimal? Temperature, int? RespiratoryRate, decimal? SpO2, int? PainScore, int? GcsTotal,
    string? InitialActions, string? Remarks);

public record RecordErNurseAssessmentRequest(
    string? BloodPressure, int? Pulse, decimal? Temperature, int? RespiratoryRate, decimal? SpO2,
    int? PainScore, int? GcsTotal, string? InitialActions, string? Remarks);

public record ErDoctorAssessmentDto(
    int Id, int ErVisitId, DateTime AssessedAt, string DoctorName, string? HistoryOfPresentIllness,
    string? ExaminationFindings, string? ProvisionalDiagnosis, string? TreatmentGiven, string Disposition, string? Remarks);

public record RecordErDoctorAssessmentRequest(
    string? HistoryOfPresentIllness, string? ExaminationFindings, string? ProvisionalDiagnosis,
    string? TreatmentGiven, string Disposition, string? Remarks);

public interface IErService
{
    Task<ErVisitDto> RegisterVisitAsync(RegisterErVisitRequest request, int branchId, int hospitalId, int registeredByUserId);
    Task<IReadOnlyList<ErVisitDto>> GetActiveVisitsAsync(int branchId);
    Task<ErVisitDto> GetVisitAsync(int id);
    Task<IReadOnlyList<ErVisitDto>> GetByPatientAsync(int patientId);
    Task UpdateDispositionAsync(int id, UpdateErDispositionRequest request);

    Task<ErNurseAssessmentDto> RecordNurseAssessmentAsync(int visitId, RecordErNurseAssessmentRequest request, int nurseUserId);
    Task<IReadOnlyList<ErNurseAssessmentDto>> GetNurseAssessmentsAsync(int visitId);

    Task<ErDoctorAssessmentDto> RecordDoctorAssessmentAsync(int visitId, RecordErDoctorAssessmentRequest request, int doctorId);
    Task<IReadOnlyList<ErDoctorAssessmentDto>> GetDoctorAssessmentsAsync(int visitId);
}
