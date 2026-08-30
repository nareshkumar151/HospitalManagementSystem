using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    protected int CurrentUserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected int? CurrentLinkedProfileId
    {
        get
        {
            var value = User.FindFirstValue("linkedProfileId");
            return int.TryParse(value, out var id) ? id : null;
        }
    }

    protected int CurrentBranchId
    {
        get
        {
            var value = User.FindFirstValue("branchId");
            return int.TryParse(value, out var id) ? id : 1;
        }
    }
}
