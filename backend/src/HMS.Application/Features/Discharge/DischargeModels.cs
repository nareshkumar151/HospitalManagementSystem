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
    /// generates the final consolidated bill - mirrors the "Bill Settlement -> Discharge Summary" workflow diagram. </summary>
    Task<DischargeSummaryDto> DischargeAsync(int admissionId, CreateDischargeSummaryRequest request, int doctorId);
    Task<DischargeSummaryDto> GetByAdmissionIdAsync(int admissionId);
}
