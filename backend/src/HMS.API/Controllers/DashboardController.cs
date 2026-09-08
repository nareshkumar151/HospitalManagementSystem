using HMS.Application.Features.Dashboard;
using Microsoft.AspNetCore.Authorization;
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
        // A doctor's dashboard tiles (appointments/IP patients/discharges/surgeries) are scoped to their own
        // Doctors.Id (their linkedProfileId), not the whole branch's.
        var doctorId = User.IsInRole(RoleNames.Doctor) ? CurrentLinkedProfileId : null;
        return Ok(await _dashboardService.GetSummaryAsync(CurrentBranchId, receptionistUserId, doctorId));
    }

    // SuperAdmin has no single branch/hospital of their own, so the branch-scoped summary above (which
    // would silently default to branch/hospital #1) doesn't apply - this is their platform-wide view.
    [HttpGet("platform-summary")]
    [Authorize(Roles = RoleNames.SuperAdminOnly)]
    public async Task<ActionResult<PlatformSummaryDto>> GetPlatformSummary() => Ok(await _dashboardService.GetPlatformSummaryAsync());
}
