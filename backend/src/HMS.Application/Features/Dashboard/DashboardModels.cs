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
    /// <summary> Doctor Dashboard tiles - populated only when a doctorId is passed to GetSummaryAsync (0 otherwise). </summary>
    int DoctorTodaysAppointments,
    int DoctorIpPatientsCount,
    int DoctorPlannedDischargesCount,
    int DoctorTodaysSurgeriesCount,
    IReadOnlyList<PharmacyStockAlertDto> PharmacyStockAlerts);

public record PharmacyStockAlertDto(int MedicineId, string MedicineName, int Stock, int ReorderLevel);

public interface IDashboardService
{
    /// <summary> `receptionistUserId` personalizes TodaysRevenue to that user's own collected payments;
    /// `doctorId` populates the Doctor-scoped tiles. Pass null for either to get the unscoped figures. </summary>
    Task<DashboardSummaryDto> GetSummaryAsync(int branchId, int? receptionistUserId = null, int? doctorId = null);
}
