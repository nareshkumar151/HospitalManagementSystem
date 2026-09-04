namespace HMS.Application.Features.Reports;

public record DateRangeRequest(DateTime FromDate, DateTime ToDate);

public record PatientRegisterRow(string UHID, string FullName, string Mobile, DateTime RegisteredOn);
public record DailyVisitsRow(DateTime Date, int OpdCount, int IpdCount);
public record DoctorPerformanceRow(int DoctorId, string DoctorName, int ConsultationCount, decimal RevenueGenerated);
public record RevenueReportRow(DateTime Date, decimal Consultation, decimal Pharmacy, decimal Lab, decimal Admission, decimal Opd, decimal Ipd, decimal Total);
public record PharmacyStockReportRow(string MedicineName, int Stock, DateTime ExpiryDate, decimal Value);
public record DepartmentRevenueRow(string DepartmentName, decimal Revenue);
public record BedOccupancyRow(string WardName, int TotalBeds, int Occupied, int Available);

public interface IReportService
{
    Task<IReadOnlyList<PatientRegisterRow>> GetPatientRegisterAsync(DateRangeRequest range, int branchId);
    Task<IReadOnlyList<DailyVisitsRow>> GetDailyVisitsAsync(DateRangeRequest range, int branchId);
    Task<IReadOnlyList<DoctorPerformanceRow>> GetDoctorPerformanceAsync(DateRangeRequest range, int branchId);
    Task<IReadOnlyList<RevenueReportRow>> GetRevenueReportAsync(DateRangeRequest range, int branchId);
    Task<IReadOnlyList<PharmacyStockReportRow>> GetPharmacyStockReportAsync(int branchId);
    Task<IReadOnlyList<DepartmentRevenueRow>> GetDepartmentWiseRevenueAsync(DateRangeRequest range, int branchId);
    Task<IReadOnlyList<BedOccupancyRow>> GetBedOccupancyReportAsync(int branchId);
}
