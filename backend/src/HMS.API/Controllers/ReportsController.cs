using HMS.Application.Features.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.AdminOnly)]
public class ReportsController : ApiControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService) => _reportService = reportService;

    [HttpGet("patient-register")]
    public async Task<ActionResult<IReadOnlyList<PatientRegisterRow>>> PatientRegister([FromQuery] DateRangeRequest range) => Ok(await _reportService.GetPatientRegisterAsync(range, CurrentBranchId));

    [HttpGet("daily-visits")]
    public async Task<ActionResult<IReadOnlyList<DailyVisitsRow>>> DailyVisits([FromQuery] DateRangeRequest range) => Ok(await _reportService.GetDailyVisitsAsync(range, CurrentBranchId));

    [HttpGet("doctor-performance")]
    public async Task<ActionResult<IReadOnlyList<DoctorPerformanceRow>>> DoctorPerformance([FromQuery] DateRangeRequest range) => Ok(await _reportService.GetDoctorPerformanceAsync(range, CurrentBranchId));

    [HttpGet("revenue")]
    public async Task<ActionResult<IReadOnlyList<RevenueReportRow>>> Revenue([FromQuery] DateRangeRequest range) => Ok(await _reportService.GetRevenueReportAsync(range, CurrentBranchId));

    [HttpGet("pharmacy-stock")]
    public async Task<ActionResult<IReadOnlyList<PharmacyStockReportRow>>> PharmacyStock() => Ok(await _reportService.GetPharmacyStockReportAsync(CurrentBranchId));

    [HttpGet("department-wise-revenue")]
    public async Task<ActionResult<IReadOnlyList<DepartmentRevenueRow>>> DepartmentWiseRevenue([FromQuery] DateRangeRequest range) => Ok(await _reportService.GetDepartmentWiseRevenueAsync(range, CurrentBranchId));

    [HttpGet("bed-occupancy")]
    public async Task<ActionResult<IReadOnlyList<BedOccupancyRow>>> BedOccupancy() => Ok(await _reportService.GetBedOccupancyReportAsync(CurrentBranchId));
}
