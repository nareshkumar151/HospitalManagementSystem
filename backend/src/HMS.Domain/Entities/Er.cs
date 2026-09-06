using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary>
/// Module 19: Emergency (ER). A walk-in/ambulance case that hasn't gone through OPD/IPD registration yet -
/// triaged at the ER desk, assessed by the ER nurse and doctor, then disposed to Admit/Discharge/LAMA/Refer.
/// </summary>
public class ErVisit : BaseEntity
{
    public int PatientId { get; set; }
    public int BranchId { get; set; }
    public int HospitalId { get; set; }
    public DateTime ArrivalTime { get; set; } = DateTime.UtcNow;
    public string? ModeOfArrival { get; set; } // WalkIn | Ambulance | Referred
    public string? BroughtBy { get; set; }
    public string ChiefComplaint { get; set; } = default!;
    public string TriageCategory { get; set; } = "Yellow"; // Red | Yellow | Green
    public string Status { get; set; } = "InTreatment"; // InTreatment | Admitted | Discharged | LAMA | Referred | DeceasedInEr
    public int RegisteredByUserId { get; set; }
}

/// <summary> ER Nurses Assessment paper form. </summary>
public class ErNurseAssessment : BaseEntity
{
    public int ErVisitId { get; set; }
    public int NurseUserId { get; set; }
    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
    public string? BloodPressure { get; set; }
    public int? Pulse { get; set; }
    public decimal? Temperature { get; set; }
    public int? RespiratoryRate { get; set; }
    public decimal? SpO2 { get; set; }
    public int? PainScore { get; set; } // 0-10
    public int? GcsTotal { get; set; } // 3-15
    public string? InitialActions { get; set; }
    public string? Remarks { get; set; }
}

/// <summary> ER Doctor Assessment paper form (2-page: history/exam + diagnosis/treatment/disposition). </summary>
public class ErDoctorAssessment : BaseEntity
{
    public int ErVisitId { get; set; }
    public int DoctorId { get; set; }
    public DateTime AssessedAt { get; set; } = DateTime.UtcNow;
    public string? HistoryOfPresentIllness { get; set; }
    public string? ExaminationFindings { get; set; }
    public string? ProvisionalDiagnosis { get; set; }
    public string? TreatmentGiven { get; set; }
    public string Disposition { get; set; } = default!; // Admit | Discharge | LAMA | Refer | DeceasedInEr
    public string? Remarks { get; set; }
}
