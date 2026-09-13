namespace HMS.Application.Features.Discharge;

public record DischargeSummaryDto(
    int Id, int IpdAdmissionId, string PatientName, int TreatingDoctorId, string DoctorName,
    string Diagnosis, string? ChiefComplaint, string? PastHistory, string? PhysicalExamination,
    string? Investigation, string? CourseInHospital, string ConditionAtDischarge, string? MedicinesAdvised,
    string? DietAdvice, DateTime? FollowUpDate, DateTime DischargedAt, string? DoctorDigitalSignature);

public record CreateDischargeSummaryRequest(
    string Diagnosis, string? ChiefComplaint, string? PastHistory, string? PhysicalExamination,
    string? Investigation, string? CourseInHospital, string ConditionAtDischarge, string? MedicinesAdvised,
    string? DietAdvice, DateTime? FollowUpDate, string? DoctorDigitalSignature);

public interface IDischargeService
{
    /// <summary> Creates the summary, sets admission Status=Discharged, frees the bed, and (if requested)
    /// generates the final consolidated bill - mirrors the "Bill Settlement -> Discharge Summary" workflow
    /// diagram. The treating doctor recorded on the summary is always the admission's own attending doctor
    /// (IpdAdmissions.DoctorId), never the caller's identity - discharge is routinely processed by front
    /// desk/nursing on the attending doctor's behalf, not only by the doctor logging in themselves. </summary>
    Task<DischargeSummaryDto> DischargeAsync(int admissionId, CreateDischargeSummaryRequest request);
    Task<DischargeSummaryDto> GetByAdmissionIdAsync(int admissionId);
}
