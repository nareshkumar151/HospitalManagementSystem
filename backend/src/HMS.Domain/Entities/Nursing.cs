using HMS.Domain.Common;

namespace HMS.Domain.Entities;

/// <summary> Module 7: Nursing Module - IPD vitals/monitoring chart. </summary>
public class NursingChart : BaseEntity
{
    public int IpdAdmissionId { get; set; }
    public int NurseUserId { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public decimal? Temperature { get; set; }
    public int? Pulse { get; set; }
    public string? BloodPressure { get; set; }
    public decimal? Oxygen { get; set; }
    public decimal? Weight { get; set; }
    public decimal? SugarLevel { get; set; }
    public string? MedicationSchedule { get; set; }
    public string? DailyNotes { get; set; }
    public string? PatientMonitoring { get; set; }

    // Added to match the paper Clinical Chart's early-warning log (MEWS/PEWS-style track-and-trigger).
    public int? RespiratoryRate { get; set; }
    public int? PainScore { get; set; } // 0-10
    public string? Consciousness { get; set; } // AVPU: Alert | Verbal | Pain | Unresponsive
    /// <summary> Derived 0-9 early-warning score (see NursingService.CalculateEarlyWarningScore) - stored
    /// alongside the vitals it was computed from so historical rows don't shift if the scoring rule changes. </summary>
    public int? EarlyWarningScore { get; set; }
}

/// <summary> Nurse "Raise investigations" / "Order medicines" actions on behalf of an admitted patient. </summary>
public class NursingRequest : BaseEntity
{
    public int IpdAdmissionId { get; set; }
    public int NurseUserId { get; set; }
    public string RequestType { get; set; } = default!; // Investigation | Medicine | Refund
    public string Details { get; set; } = default!;
    public string Status { get; set; } = "Pending";
}
