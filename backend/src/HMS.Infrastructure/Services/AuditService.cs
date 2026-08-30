using HMS.Application.Common.Interfaces;

namespace HMS.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly ISqlDataAccess _db;
    private readonly ICurrentUserService _currentUser;

    public AuditService(ISqlDataAccess db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public Task LogAsync(string action, string entity, string? entityId = null, string? details = null)
    {
        return _db.ExecuteAsync("sp_AuditLog_Insert", new
        {
            UserId = _currentUser.UserId,
            Username = _currentUser.Username,
            Action = action,
            Entity = entity,
            EntityId = entityId,
            Details = details,
            IpAddress = _currentUser.IpAddress
        });
    }
}
