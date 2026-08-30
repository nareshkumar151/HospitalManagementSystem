namespace HMS.Application.Features.Reports;

public record DateRangeRequest(DateTime FromDate, DateTime ToDate);

public record PatientRegisterRow(string UHID, string FullName, string Mobile, DateTime RegisteredOn);
public record DailyVisitsRow(DateTime Date, int OpdCount, int IpdCount);
public record DoctorPerformanceRow(int DoctorId, string DoctorName, int ConsultationCount, decimal RevenueGenerated);
public record RevenueReportRow(DateTime Date, decimal Consultation, decimal Pharmacy, decimal Lab, decimal Admission, decimal Total);
public record PharmacyStockReportRow(string MedicineName, int Stock, DateTime ExpiryDate, decimal Value);
public record DepartmentRevenueRow(string DepartmentName, decimal Revenue);
public record BedOccupancyRow(string WardName, int TotalBeds, int Occupied, int Available);

public interface IReportService
{
    Task<IReadOnlyList<PatientRegisterRow>> GetPatientRegisterAsync(DateRangeRequest range);
    Task<IReadOnlyList<DailyVisitsRow>> GetDailyVisitsAsync(DateRangeRequest range);
    Task<IReadOnlyList<DoctorPerformanceRow>> GetDoctorPerformanceAsync(DateRangeRequest range);
    Task<IReadOnlyList<RevenueReportRow>> GetRevenueReportAsync(DateRangeRequest range);
    Task<IReadOnlyList<PharmacyStockReportRow>> GetPharmacyStockReportAsync();
    Task<IReadOnlyList<DepartmentRevenueRow>> GetDepartmentWiseRevenueAsync(DateRangeRequest range);
    Task<IReadOnlyList<BedOccupancyRow>> GetBedOccupancyReportAsync();
}
