using HMS.Application.Common.Models;

namespace HMS.Application.Features.Pharmacy;

public record MedicineDto(
    int Id, string MedicineName, string GenericName, string BatchNumber, DateTime ExpiryDate,
    string Manufacturer, decimal PurchasePrice, decimal SellingPrice, int Stock, int ReorderLevel, int BranchId);

public record UpsertMedicineRequest(
    string MedicineName, string GenericName, string BatchNumber, DateTime ExpiryDate,
    string Manufacturer, decimal PurchasePrice, decimal SellingPrice, int Stock, int ReorderLevel, int BranchId);

public record PurchaseMedicineRequest(int MedicineId, int Quantity, decimal UnitCost);
public record AdjustStockRequest(int MedicineId, int Quantity, string Reason); // +/- quantity

public record DispenseSaleItemRequest(int MedicineId, int Quantity);
public record DispenseSaleRequest(int PatientId, int? PrescriptionId, IReadOnlyList<DispenseSaleItemRequest> Items);

public record PharmacySaleItemDto(int MedicineId, string MedicineName, int Quantity, decimal UnitPrice, decimal LineTotal);
public record PharmacySaleDto(int Id, string InvoiceNumber, int PatientId, string PatientName, decimal TotalAmount, DateTime SaleDate, IReadOnlyList<PharmacySaleItemDto> Items);

public record ReturnSaleItemRequest(int SaleId, int MedicineId, int Quantity);

public interface IPharmacyService
{
    Task<PagedResult<MedicineDto>> SearchAsync(PagedRequest request);
    Task<IReadOnlyList<MedicineDto>> GetLowStockAsync();
    Task<IReadOnlyList<MedicineDto>> GetExpiringSoonAsync(int withinDays = 30);
    Task<MedicineDto> CreateAsync(UpsertMedicineRequest request);
    Task UpdateAsync(int id, UpsertMedicineRequest request);
    Task PurchaseAsync(PurchaseMedicineRequest request, int userId);
    Task AdjustStockAsync(AdjustStockRequest request, int userId);

    Task<PharmacySaleDto> DispenseAsync(DispenseSaleRequest request, int pharmacistUserId);
    Task ReturnAsync(ReturnSaleItemRequest request, int userId);
    Task<PharmacySaleDto> GetSaleByIdAsync(int id);
}
