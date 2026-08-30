namespace HMS.Application.Features.OpdVisits;

public record OpdVisitDto(
    int Id, string OpdVisitNumber, int AppointmentId, int PatientId, string PatientName,
    int DoctorId, string DoctorName, decimal ConsultationFee, bool IsFreeFollowUp,
    string? Symptoms, string? Diagnosis, string? ClinicalNotes, string? DoctorNotes,
    bool AdmissionRecommended, int? ReferredToDepartmentId, string? TransferNotes, DateTime VisitDateTime);

/// <summary> Doctor completes consultation: diagnosis/notes, optionally prescribes, orders tests, or recommends admission. </summary>
public record StartConsultationRequest(int AppointmentId);

public record CompleteConsultationRequest(
    string? Symptoms,
    string Diagnosis,
    string? ClinicalNotes,
    string? DoctorNotes,
    bool AdmissionRecommended,
    int? ReferredToDepartmentId,
    string? TransferNotes);

public record OpdNursingNoteRequest(
    decimal? Temperature, int? Pulse, string? BloodPressure, decimal? Oxygen,
    decimal? Weight, decimal? SugarLevel, string? Notes);

public interface IOpdVisitService
{
    Task<OpdVisitDto> StartConsultationAsync(StartConsultationRequest request, int doctorId);
    Task<OpdVisitDto> CompleteConsultationAsync(int opdVisitId, CompleteConsultationRequest request);
    Task<OpdVisitDto> GetByIdAsync(int id);
    Task<IReadOnlyList<OpdVisitDto>> GetByPatientAsync(int patientId);
    Task<IReadOnlyList<OpdVisitDto>> GetByDoctorAsync(int doctorId, DateTime? date = null);
    Task AddNursingNoteAsync(int opdVisitId, OpdNursingNoteRequest request, int nurseUserId);
    Task<bool> IsFreeFollowUpEligibleAsync(int patientId, int doctorId);
}
