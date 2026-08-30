using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 14: Discharge Summary. </summary>
public class DischargeSummary : BaseEntity
{
    public int IpdAdmissionId { get; set; }
    public int TreatingDoctorId { get; set; }
    public string Diagnosis { get; set; } = default!;
    public string? ChiefComplaint { get; set; }
    public string? PastHistory { get; set; }
    public string? PhysicalExamination { get; set; }
    public string? Investigation { get; set; }
    public string? CourseInHospital { get; set; }
    public string ConditionAtDischarge { get; set; } = default!;
    public string? MedicinesAdvised { get; set; }
    public string? DietAdvice { get; set; }
    public DateTime? FollowUpDate { get; set; }
    public DateTime DischargedAt { get; set; } = DateTime.UtcNow;
    public string? DoctorDigitalSignature { get; set; }
}
