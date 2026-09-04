using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Dashboard;

namespace HMS.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ISqlDataAccess _db;

    public DashboardService(ISqlDataAccess db) => _db = db;

    public async Task<DashboardSummaryDto> GetSummaryAsync(int branchId, int? receptionistUserId = null)
    {
        var (headers, alerts) = await _db.QueryMultipleAsync<SummaryRow, PharmacyStockAlertDto>("sp_Dashboard_GetSummary", new { BranchId = branchId, ReceptionistUserId = receptionistUserId });
        var h = headers.First();
        return new DashboardSummaryDto(h.TodaysPatients, h.TodaysRevenue, h.TodaysOpdRevenue, h.TodaysIpdRevenue, (int)Math.Round(h.BedOccupancyPercent),
            h.PendingBillsCount, h.AvailableDoctorsCount, h.TodaysSurgeriesCount, alerts.ToList());
    }

    internal record SummaryRow(int TodaysPatients, decimal TodaysRevenue, decimal TodaysOpdRevenue, decimal TodaysIpdRevenue, decimal BedOccupancyPercent, int PendingBillsCount, int AvailableDoctorsCount, int TodaysSurgeriesCount);
}
