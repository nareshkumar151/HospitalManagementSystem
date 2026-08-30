using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Reports;

namespace HMS.Infrastructure.Services;

public class ReportService : IReportService
{
    private readonly ISqlDataAccess _db;

    public ReportService(ISqlDataAccess db) => _db = db;

    public Task<IReadOnlyList<PatientRegisterRow>> GetPatientRegisterAsync(DateRangeRequest range)
        => _db.QueryAsync<PatientRegisterRow>("sp_Report_PatientRegister", new { range.FromDate, range.ToDate });

    public Task<IReadOnlyList<DailyVisitsRow>> GetDailyVisitsAsync(DateRangeRequest range)
        => _db.QueryAsync<DailyVisitsRow>("sp_Report_DailyVisits", new { range.FromDate, range.ToDate });

    public Task<IReadOnlyList<DoctorPerformanceRow>> GetDoctorPerformanceAsync(DateRangeRequest range)
        => _db.QueryAsync<DoctorPerformanceRow>("sp_Report_DoctorPerformance", new { range.FromDate, range.ToDate });

    public Task<IReadOnlyList<RevenueReportRow>> GetRevenueReportAsync(DateRangeRequest range)
        => _db.QueryAsync<RevenueReportRow>("sp_Report_Revenue", new { range.FromDate, range.ToDate });

    public Task<IReadOnlyList<PharmacyStockReportRow>> GetPharmacyStockReportAsync()
        => _db.QueryAsync<PharmacyStockReportRow>("sp_Report_PharmacyStock");

    public Task<IReadOnlyList<DepartmentRevenueRow>> GetDepartmentWiseRevenueAsync(DateRangeRequest range)
        => _db.QueryAsync<DepartmentRevenueRow>("sp_Report_DepartmentWiseRevenue", new { range.FromDate, range.ToDate });

    public Task<IReadOnlyList<BedOccupancyRow>> GetBedOccupancyReportAsync()
        => _db.QueryAsync<BedOccupancyRow>("sp_Report_BedOccupancy");
}
