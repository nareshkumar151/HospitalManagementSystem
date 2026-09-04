using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.Notifications;

public record NotificationDto(
    int Id, int? UserId, int? PatientId, NotificationChannel Channel, NotificationCategory Category,
    string Message, bool IsSent, DateTime? SentAt, bool IsRead, DateTime CreatedAt);

public record SendNotificationRequest(int? UserId, int? PatientId, NotificationChannel Channel, NotificationCategory Category, string Message);

public interface INotificationService
{
    /// <summary> Queues a notification; actual SMS/Email/Push dispatch runs via a Hangfire background job (see NFR). </summary>
    Task<NotificationDto> QueueAsync(SendNotificationRequest request);
    Task<PagedResult<NotificationDto>> GetForUserAsync(int userId, PagedRequest request, bool unreadOnly = false);
    Task MarkReadAsync(int id);
}
