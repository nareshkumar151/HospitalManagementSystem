using HMS.Application.Features.Dashboard;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class DashboardController : ApiControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
    {
        // A receptionist's "Today's Revenue" tile is their own collected payments, not the whole branch's -
        // every other role keeps seeing the branch-wide figure.
        var receptionistUserId = User.IsInRole(RoleNames.Receptionist) ? CurrentUserId : (int?)null;
        return Ok(await _dashboardService.GetSummaryAsync(CurrentBranchId, receptionistUserId));
    }
}
