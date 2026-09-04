namespace HMS.Application.Features.Dashboard;

/// <summary> Module 24: Dashboard - role-aware summary tiles. </summary>
public record DashboardSummaryDto(
    int TodaysPatients,
    decimal TodaysRevenue,
    /// <summary> Of TodaysRevenue, the portion collected on OPD bills (not linked to an IPD admission). </summary>
    decimal TodaysOpdRevenue,
    /// <summary> Of TodaysRevenue, the portion collected on IPD bills (linked to an IPD admission). </summary>
    decimal TodaysIpdRevenue,
    int BedOccupancyPercent,
    int PendingBillsCount,
    int AvailableDoctorsCount,
    int TodaysSurgeriesCount,
    IReadOnlyList<PharmacyStockAlertDto> PharmacyStockAlerts);

public record PharmacyStockAlertDto(int MedicineId, string MedicineName, int Stock, int ReorderLevel);

public interface IDashboardService
{
    /// <summary> `receptionistUserId` personalizes TodaysRevenue to that user's own collected payments;
    /// pass null for the unscoped, branch-wide figure. </summary>
    Task<DashboardSummaryDto> GetSummaryAsync(int branchId, int? receptionistUserId = null);
}
