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
