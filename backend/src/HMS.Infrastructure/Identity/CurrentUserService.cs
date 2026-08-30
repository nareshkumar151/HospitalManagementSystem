using System.Security.Claims;
using HMS.Application.Common.Interfaces;
using HMS.Domain.Enums;
using Microsoft.AspNetCore.Http;

namespace HMS.Infrastructure.Identity;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    private ClaimsPrincipal? Principal => _httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;

    public int? UserId
    {
        get
        {
            var value = Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public string? Username => Principal?.FindFirstValue(ClaimTypes.Name);

    public RoleName? Role
    {
        get
        {
            var value = Principal?.FindFirstValue(ClaimTypes.Role);
            return Enum.TryParse<RoleName>(value, out var role) ? role : null;
        }
    }

    public int? BranchId
    {
        get
        {
            var value = Principal?.FindFirstValue("branchId");
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public int? LinkedProfileId
    {
        get
        {
            var value = Principal?.FindFirstValue("linkedProfileId");
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    public string? IpAddress => _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
}
