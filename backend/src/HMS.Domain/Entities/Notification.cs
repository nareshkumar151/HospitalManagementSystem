using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary> Module 23: Notifications (SMS/Email/Push). </summary>
public class Notification : BaseEntity
{
    public int? UserId { get; set; }
    public int? PatientId { get; set; }
    public NotificationChannel Channel { get; set; }
    public NotificationCategory Category { get; set; }
    public string Message { get; set; } = default!;
    public bool IsSent { get; set; }
    public DateTime? SentAt { get; set; }
    public bool IsRead { get; set; }
}
