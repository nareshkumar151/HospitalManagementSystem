using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Reports;

namespace HMS.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly ISqlDataAccess _db;

    public ReportService(ISqlDataAccess db) => _db = db;

    public Task<IReadOnlyList<PatientRegisterRow>> GetPatientRegisterAsync(DateRangeRequest range, int branchId)
        => _db.QueryAsync<PatientRegisterRow>("sp_Report_PatientRegister", new { range.FromDate, range.ToDate, BranchId = branchId });

    public Task<IReadOnlyList<DailyVisitsRow>> GetDailyVisitsAsync(DateRangeRequest range, int branchId)
        => _db.QueryAsync<DailyVisitsRow>("sp_Report_DailyVisits", new { range.FromDate, range.ToDate, BranchId = branchId });

    public Task<IReadOnlyList<DoctorPerformanceRow>> GetDoctorPerformanceAsync(DateRangeRequest range, int branchId)
        => _db.QueryAsync<DoctorPerformanceRow>("sp_Report_DoctorPerformance", new { range.FromDate, range.ToDate, BranchId = branchId });

    public Task<IReadOnlyList<RevenueReportRow>> GetRevenueReportAsync(DateRangeRequest range, int branchId)
        => _db.QueryAsync<RevenueReportRow>("sp_Report_Revenue", new { range.FromDate, range.ToDate, BranchId = branchId });

    public Task<IReadOnlyList<PharmacyStockReportRow>> GetPharmacyStockReportAsync(int branchId)
        => _db.QueryAsync<PharmacyStockReportRow>("sp_Report_PharmacyStock", new { BranchId = branchId });

    public Task<IReadOnlyList<DepartmentRevenueRow>> GetDepartmentWiseRevenueAsync(DateRangeRequest range, int branchId)
        => _db.QueryAsync<DepartmentRevenueRow>("sp_Report_DepartmentWiseRevenue", new { range.FromDate, range.ToDate, BranchId = branchId });

    public Task<IReadOnlyList<BedOccupancyRow>> GetBedOccupancyReportAsync(int branchId)
        => _db.QueryAsync<BedOccupancyRow>("sp_Report_BedOccupancy", new { BranchId = branchId });
}
