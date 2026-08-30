using HMS.Domain.Enums;

namespace HMS.Application.Features.Attendance;

public record AttendanceDto(int Id, int EmployeeId, string EmployeeName, DateTime AttendanceDate, DateTime? CheckIn, DateTime? CheckOut, decimal OvertimeHours, string Shift);

public record CheckInRequest(int EmployeeId, string Shift);
public record CheckOutRequest(int EmployeeId);

public record LeaveRequestDto(int Id, int EmployeeId, string EmployeeName, DateTime FromDate, DateTime ToDate, string Reason, LeaveStatus Status);
public record ApplyLeaveRequest(int EmployeeId, DateTime FromDate, DateTime ToDate, string Reason);
public record ReviewLeaveRequest(LeaveStatus Status);

/// <summary> Module 24-style dashboard widgets for the Admin/HR attendance overview. </summary>
public record AttendanceSummaryDto(int TotalEmployees, int PresentToday, int OnLeaveToday, int PendingLeaveRequests);

public interface IAttendanceService
{
    Task<AttendanceDto> CheckInAsync(CheckInRequest request);
    Task<AttendanceDto> CheckOutAsync(CheckOutRequest request);
    Task<IReadOnlyList<AttendanceDto>> GetByEmployeeAsync(int employeeId, DateTime? month = null);
    /// <summary> Every employee's attendance rows for the month containing <paramref name="month"/> - the Admin/HR month-wise matrix. </summary>
    Task<IReadOnlyList<AttendanceDto>> GetAllForMonthAsync(DateTime month);
    Task<AttendanceSummaryDto> GetTodaySummaryAsync();

    Task<LeaveRequestDto> ApplyLeaveAsync(ApplyLeaveRequest request);
    Task<LeaveRequestDto> ReviewLeaveAsync(int leaveRequestId, ReviewLeaveRequest request, int reviewerUserId);
    /// <summary> Pass <paramref name="employeeId"/> to scope this to one employee's own requests (self-service); leave null for the full HR/Admin review queue. </summary>
    Task<IReadOnlyList<LeaveRequestDto>> GetLeaveRequestsAsync(LeaveStatus? status = null, int? employeeId = null);
}
