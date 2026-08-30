using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Notifications;

namespace HMS.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ISqlDataAccess _db;

    public NotificationService(ISqlDataAccess db) => _db = db;

    public async Task<NotificationDto> QueueAsync(SendNotificationRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_Notification_Insert", new
        {
            request.UserId,
            request.PatientId,
            Channel = request.Channel.ToString(),
            Category = request.Category.ToString(),
            request.Message
        });

        // Actual SMS/Email/Push dispatch is picked up by a Hangfire background job (see NFR: Background Jobs)
        // which calls sp_Notification_MarkSent once delivered - kept out of the request/response cycle.
        var list = request.UserId.HasValue ? await GetForUserAsync(request.UserId.Value) : Array.Empty<NotificationDto>();
        return list.FirstOrDefault(n => n.Id == newId) ?? new NotificationDto(newId, request.UserId, request.PatientId, request.Channel, request.Category, request.Message, false, null, false, DateTime.UtcNow);
    }

    public Task<IReadOnlyList<NotificationDto>> GetForUserAsync(int userId, bool unreadOnly = false)
        => _db.QueryAsync<NotificationDto>("sp_Notification_GetForUser", new { UserId = userId, UnreadOnly = unreadOnly });

    public Task MarkReadAsync(int id) => _db.ExecuteAsync("sp_Notification_MarkRead", new { Id = id });
}
