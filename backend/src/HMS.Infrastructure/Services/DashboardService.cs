using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Dashboard;

namespace HMS.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ISqlDataAccess _db;

    public DashboardService(ISqlDataAccess db) => _db = db;

    public async Task<DashboardSummaryDto> GetSummaryAsync(int branchId, int? receptionistUserId = null, int? doctorId = null)
    {
        var (headers, alerts) = await _db.QueryMultipleAsync<SummaryRow, PharmacyStockAlertDto>("sp_Dashboard_GetSummary", new { BranchId = branchId, ReceptionistUserId = receptionistUserId, DoctorId = doctorId });
        var h = headers.First();
        return new DashboardSummaryDto(h.TodaysPatients, h.TodaysRevenue, h.TodaysOpdRevenue, h.TodaysIpdRevenue,
            h.IpdPatientsCount, (int)Math.Round(h.BedOccupancyPercent),
            h.PendingBillsCount, h.AvailableDoctorsCount, h.TodaysSurgeriesCount,
            h.DoctorTodaysAppointments, h.DoctorIpPatientsCount, h.DoctorPlannedDischargesCount, h.DoctorTodaysSurgeriesCount,
            alerts.ToList());
    }

    internal record SummaryRow(
        int TodaysPatients, decimal TodaysRevenue, decimal TodaysOpdRevenue, decimal TodaysIpdRevenue,
        int IpdPatientsCount, decimal BedOccupancyPercent,
        int PendingBillsCount, int AvailableDoctorsCount, int TodaysSurgeriesCount,
        int DoctorTodaysAppointments, int DoctorIpPatientsCount, int DoctorPlannedDischargesCount, int DoctorTodaysSurgeriesCount);

    public async Task<PlatformSummaryDto> GetPlatformSummaryAsync()
    {
        var (headers, hospitals) = await _db.QueryMultipleAsync<PlatformSummaryRow, HospitalBreakdownDto>("sp_Dashboard_GetPlatformSummary");
        var h = headers.First();
        return new PlatformSummaryDto(h.TotalHospitals, h.TotalBranches, h.TotalDoctors, h.TotalPatients, h.TotalEmployees,
            h.TodaysAppointments, h.TodaysRevenue, h.PendingBillsCount, hospitals.ToList());
    }

    internal record PlatformSummaryRow(
        int TotalHospitals, int TotalBranches, int TotalDoctors, int TotalPatients, int TotalEmployees,
        int TodaysAppointments, decimal TodaysRevenue, int PendingBillsCount);
}
