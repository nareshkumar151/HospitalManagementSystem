using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
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
        // which calls sp_Notification_MarkSent once delivered - not sent yet, so IsSent/SentAt are always
        // false/null at the moment of this response regardless.
        return new NotificationDto(newId, request.UserId, request.PatientId, request.Channel, request.Category, request.Message, false, null, false, DateTime.UtcNow);
    }

    public async Task<PagedResult<NotificationDto>> GetForUserAsync(int userId, PagedRequest request, bool unreadOnly = false)
    {
        var (items, counts) = await _db.QueryMultipleAsync<NotificationDto, int>("sp_Notification_GetForUser", new
        {
            UserId = userId,
            UnreadOnly = unreadOnly,
            request.PageNumber,
            request.PageSize,
            request.Search
        });

        return new PagedResult<NotificationDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public Task MarkReadAsync(int id) => _db.ExecuteAsync("sp_Notification_MarkRead", new { Id = id });
}
