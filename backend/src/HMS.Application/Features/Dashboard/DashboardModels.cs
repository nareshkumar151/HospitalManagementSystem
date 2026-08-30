namespace HMS.Application.Features.Dashboard;

/// <summary> Module 24: Dashboard - role-aware summary tiles. </summary>
public record DashboardSummaryDto(
    int TodaysPatients,
    decimal TodaysRevenue,
    int BedOccupancyPercent,
    int PendingBillsCount,
    int AvailableDoctorsCount,
    int TodaysSurgeriesCount,
    IReadOnlyList<PharmacyStockAlertDto> PharmacyStockAlerts);

public record PharmacyStockAlertDto(int MedicineId, string MedicineName, int Stock, int ReorderLevel);

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(int branchId);
}
