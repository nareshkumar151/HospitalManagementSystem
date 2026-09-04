using HMS.Application.Common.Models;
using HMS.Application.Features.Attendance;
using HMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary>
/// Check-in/out is HR/Admin-driven (front-desk or biometric, not self-service). Viewing attendance history
/// and applying for leave are self-service for any role with an Employees row - see
/// <see cref="RoleNames.EmployeeSelfService"/> - scoped to that person's own record; reviewing/approving
/// leave stays Admin/HR-only.
/// </summary>
public class AttendanceController : ApiControllerBase
{
    private readonly IAttendanceService _attendanceService;

    public AttendanceController(IAttendanceService attendanceService) => _attendanceService = attendanceService;

    [HttpPost("check-in")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
    public async Task<ActionResult<AttendanceDto>> CheckIn(CheckInRequest request) => Ok(await _attendanceService.CheckInAsync(request));

    [HttpPost("check-out")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
    public async Task<ActionResult<AttendanceDto>> CheckOut(CheckOutRequest request) => Ok(await _attendanceService.CheckOutAsync(request));

    [HttpGet("employee/{employeeId:int}")]
    [Authorize(Roles = RoleNames.EmployeeSelfService)]
    public async Task<ActionResult<IReadOnlyList<AttendanceDto>>> GetByEmployee(int employeeId, [FromQuery] DateTime? month)
    {
        if (!IsHrOrAdmin() && CurrentLinkedProfileId != employeeId) return Forbid();
        return Ok(await _attendanceService.GetByEmployeeAsync(employeeId, month));
    }

    [HttpGet("all")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
    public async Task<ActionResult<IReadOnlyList<AttendanceDto>>> GetAllForMonth([FromQuery] DateTime month)
        => Ok(await _attendanceService.GetAllForMonthAsync(month, CurrentBranchId));

    [HttpGet("summary")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
    public async Task<ActionResult<AttendanceSummaryDto>> GetSummary() => Ok(await _attendanceService.GetTodaySummaryAsync(CurrentBranchId));

    [HttpPost("leave-requests")]
    [Authorize(Roles = RoleNames.EmployeeSelfService)]
    public async Task<ActionResult<LeaveRequestDto>> ApplyLeave(ApplyLeaveRequest request)
    {
        if (IsHrOrAdmin())
            return Ok(await _attendanceService.ApplyLeaveAsync(request));

        // Self-service: always file against the caller's own employee record, regardless of what
        // EmployeeId the client sent, so nobody can submit leave on someone else's behalf.
        if (CurrentLinkedProfileId is not { } ownEmployeeId) return Forbid();
        return Ok(await _attendanceService.ApplyLeaveAsync(request with { EmployeeId = ownEmployeeId }));
    }

    [HttpPut("leave-requests/{id:int}/review")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
    public async Task<ActionResult<LeaveRequestDto>> ReviewLeave(int id, ReviewLeaveRequest request)
        => Ok(await _attendanceService.ReviewLeaveAsync(id, request, CurrentUserId));

    [HttpGet("leave-requests")]
    [Authorize(Roles = RoleNames.EmployeeSelfService)]
    public async Task<ActionResult<PagedResult<LeaveRequestDto>>> GetLeaveRequests([FromQuery] PagedRequest request, [FromQuery] LeaveStatus? status)
    {
        if (IsHrOrAdmin())
            return Ok(await _attendanceService.GetLeaveRequestsAsync(CurrentBranchId, request, status));

        if (CurrentLinkedProfileId is not { } ownEmployeeId) return Forbid();
        return Ok(await _attendanceService.GetLeaveRequestsAsync(CurrentBranchId, request, status, ownEmployeeId));
    }

    private bool IsHrOrAdmin() => User.IsInRole(RoleNames.Administrator) || User.IsInRole(RoleNames.HR);
}
