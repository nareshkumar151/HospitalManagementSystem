using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Attendance;

namespace HMS.Infrastructure.Services;

public class AttendanceService : IAttendanceService
{
    private readonly ISqlDataAccess _db;

    public AttendanceService(ISqlDataAccess db) => _db = db;

    public Task<AttendanceDto> CheckInAsync(CheckInRequest request)
        => _db.QuerySingleAsync<AttendanceDto>("sp_Attendance_CheckIn", request);

    public Task<AttendanceDto> CheckOutAsync(CheckOutRequest request)
        => _db.QuerySingleAsync<AttendanceDto>("sp_Attendance_CheckOut", request);

    public Task<IReadOnlyList<AttendanceDto>> GetByEmployeeAsync(int employeeId, DateTime? month = null)
        => _db.QueryAsync<AttendanceDto>("sp_Attendance_GetByEmployee", new { EmployeeId = employeeId, Month = month });

    public Task<IReadOnlyList<AttendanceDto>> GetAllForMonthAsync(DateTime month, int branchId)
        => _db.QueryAsync<AttendanceDto>("sp_Attendance_GetAllForMonth", new { Month = month, BranchId = branchId });

    public Task<AttendanceSummaryDto> GetTodaySummaryAsync(int branchId)
        => _db.QuerySingleAsync<AttendanceSummaryDto>("sp_Attendance_GetTodaySummary", new { BranchId = branchId });

    public async Task<LeaveRequestDto> ApplyLeaveAsync(ApplyLeaveRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_LeaveRequest_Insert", request);
        var all = await GetLeaveRequestByIdInternalAsync();
        return all.First(l => l.Id == newId);
    }

    public async Task<LeaveRequestDto> ReviewLeaveAsync(int leaveRequestId, ReviewLeaveRequest request, int reviewerUserId)
    {
        await _db.ExecuteAsync("sp_LeaveRequest_Review", new { Id = leaveRequestId, Status = request.Status.ToString(), ReviewerUserId = reviewerUserId });
        var all = await GetLeaveRequestByIdInternalAsync();
        return all.First(l => l.Id == leaveRequestId);
    }

    public Task<IReadOnlyList<LeaveRequestDto>> GetLeaveRequestsAsync(int branchId, Domain.Enums.LeaveStatus? status = null, int? employeeId = null)
        => _db.QueryAsync<LeaveRequestDto>("sp_LeaveRequest_GetAll", new { BranchId = branchId, Status = status?.ToString(), EmployeeId = employeeId });

    // Reads back a just-written row by its own id (apply/review), not a listing - the caller already knows
    // exactly which branch it belongs to via that id, so this deliberately bypasses branch filtering rather
    // than needing every call site to carry a branchId just to find the row it itself just touched.
    private Task<IReadOnlyList<LeaveRequestDto>> GetLeaveRequestByIdInternalAsync()
        => _db.QueryAsync<LeaveRequestDto>("sp_LeaveRequest_GetAll", new { BranchId = (int?)null, Status = (string?)null, EmployeeId = (int?)null });
}
