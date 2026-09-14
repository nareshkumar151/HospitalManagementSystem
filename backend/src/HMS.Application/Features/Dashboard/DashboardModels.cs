namespace HMS.Application.Features.Dashboard;

/// <summary> Module 24: Dashboard - role-aware summary tiles. </summary>
public record DashboardSummaryDto(
    int TodaysPatients,
    decimal TodaysRevenue,
    /// <summary> Of TodaysRevenue, the portion collected on OPD bills (not linked to an IPD admission). </summary>
    decimal TodaysOpdRevenue,
    /// <summary> Of TodaysRevenue, the portion collected on IPD bills (linked to an IPD admission). </summary>
    decimal TodaysIpdRevenue,
    /// <summary> Branch-wide count of currently-admitted (Status = 'Admitted') IPD patients - unlike
    /// DoctorIpPatientsCount below, not scoped to any one doctor. Reception/Administrator's own IPD Patients
    /// tile. </summary>
    int IpdPatientsCount,
    int BedOccupancyPercent,
    int PendingBillsCount,
    int AvailableDoctorsCount,
    int TodaysSurgeriesCount,
    /// <summary> Branch-wide count of admissions discharged today - Nurse Dashboard's own "Planned
    /// Discharges" / "Discharged" tiles both read this: this app's discharge action is a single atomic step
    /// (see DischargeService.DischargeAsync), so there's no separate "initiated but not yet completed" state
    /// to tell the two apart - both tiles report the same real number rather than one being fabricated. </summary>
    int DischargedTodayCount,
    /// <summary> Branch-wide count of currently-admitted patients who have insurance on file (Patients.InsuranceCompany
    /// not blank) - Nurse Dashboard's own "Insurance Patients" tile. </summary>
    int InsurancePatientsCount,
    /// <summary> Doctor Dashboard tiles - populated only when a doctorId is passed to GetSummaryAsync (0 otherwise). </summary>
    int DoctorTodaysAppointments,
    int DoctorIpPatientsCount,
    int DoctorPlannedDischargesCount,
    int DoctorTodaysSurgeriesCount,
    /// <summary> Doctor Dashboard's own "Tomorrow Appointments" tile - a look-ahead so a doctor can gauge
    /// tomorrow's OPD load, not a count of anything happening today. </summary>
    int DoctorTomorrowAppointmentsCount,
    /// <summary> Doctor-scoped equivalent of InsurancePatientsCount above - currently admitted, under this
    /// doctor, with insurance on file. </summary>
    int DoctorInsurancePatientsCount,
    IReadOnlyList<PharmacyStockAlertDto> PharmacyStockAlerts);

public record PharmacyStockAlertDto(int MedicineId, string MedicineName, int Stock, int ReorderLevel);

/// <summary> SuperAdmin's dashboard - no single branch/hospital of their own, so platform-wide totals plus a
/// per-hospital breakdown instead of the branch-scoped DashboardSummaryDto above. </summary>
public record PlatformSummaryDto(
    int TotalHospitals, int TotalBranches, int TotalDoctors, int TotalPatients, int TotalEmployees,
    int TodaysAppointments, decimal TodaysRevenue, int PendingBillsCount,
    IReadOnlyList<HospitalBreakdownDto> Hospitals);

public record HospitalBreakdownDto(int HospitalId, string HospitalName, string? ThemeColor, int BranchCount, int DoctorCount, int PatientCount);

public interface IDashboardService
{
    /// <summary> `receptionistUserId` personalizes TodaysRevenue to that user's own collected payments;
    /// `doctorId` populates the Doctor-scoped tiles. Pass null for either to get the unscoped figures. </summary>
    Task<DashboardSummaryDto> GetSummaryAsync(int branchId, int? receptionistUserId = null, int? doctorId = null);
    Task<PlatformSummaryDto> GetPlatformSummaryAsync();
}
