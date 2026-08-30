using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 2: Appointment. </summary>
public class Appointment : BaseEntity
{
    public int PatientId { get; set; }
    public int DoctorId { get; set; }
    public int DepartmentId { get; set; }
    public DateTime AppointmentDate { get; set; }
    public string TimeSlot { get; set; } = default!;
    public int TokenNumber { get; set; }
    public AppointmentType Type { get; set; }
    public AppointmentStatus Status { get; set; } = AppointmentStatus.Scheduled;
    public string? RescheduledFromSlot { get; set; }
    public string? CancellationReason { get; set; }
    public int BranchId { get; set; }
}
