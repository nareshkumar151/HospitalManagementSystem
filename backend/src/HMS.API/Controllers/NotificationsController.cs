using HMS.Application.Features.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class NotificationsController : ApiControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService) => _notificationService = notificationService;

    [HttpPost]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Receptionist)]
    public async Task<ActionResult<NotificationDto>> Queue(SendNotificationRequest request) => Ok(await _notificationService.QueueAsync(request));

    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> GetMine([FromQuery] bool unreadOnly = false)
        => Ok(await _notificationService.GetForUserAsync(CurrentUserId, unreadOnly));

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id)
    {
        await _notificationService.MarkReadAsync(id);
        return NoContent();
    }
}
