using HMS.Application.Features.Dashboard;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class DashboardController : ApiControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService) => _dashboardService = dashboardService;

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary() => Ok(await _dashboardService.GetSummaryAsync(CurrentBranchId));
}
