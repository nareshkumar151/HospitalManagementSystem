using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 3 (Doctor Consultation) + Module 4 (OPD Management). </summary>
public class OpdVisit : BaseEntity
{
    public string OpdVisitNumber { get; set; } = default!;
    public int AppointmentId { get; set; }
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public decimal ConsultationFee { get; set; }
    public bool IsFreeFollowUp { get; set; } // free follow-up within 3 days of a prior visit

    public string? Symptoms { get; set; }
    public string? Diagnosis { get; set; }
    public string? ClinicalNotes { get; set; }
    public string? DoctorNotes { get; set; }

    public bool AdmissionRecommended { get; set; }
    public int? ReferredToDepartmentId { get; set; }
    public string? TransferNotes { get; set; }

    public DateTime VisitDateTime { get; set; } = DateTime.UtcNow;
}

/// <summary> OPD Nursing Notes captured before doctor consultation, when necessary. </summary>
public class OpdNursingNote : BaseEntity
{
    public int OpdVisitId { get; set; }
    public int NurseUserId { get; set; }
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public string? BloodPressure { get; set; }
    public decimal? Oxygen { get; set; }
    public decimal? Weight { get; set; }
    public decimal? SugarLevel { get; set; }
    public string? Notes { get; set; }
}
