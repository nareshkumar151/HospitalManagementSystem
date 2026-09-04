using HMS.Application.Common.Models;

namespace HMS.Application.Features.Vendors;

public record VendorDto(int Id, string Name, string GstNumber, string Contact, string? Address, bool IsActive);
public record UpsertVendorRequest(string Name, string GstNumber, string Contact, string? Address);

public record PurchaseOrderItemDto(string ItemDescription, int Quantity, decimal UnitPrice);
public record PurchaseOrderDto(int Id, string PoNumber, int VendorId, string VendorName, DateTime OrderDate, decimal TotalAmount, string Status, bool PaymentDone, IReadOnlyList<PurchaseOrderItemDto> Items);
public record CreatePurchaseOrderRequest(int VendorId, IReadOnlyList<PurchaseOrderItemDto> Items);

public interface IVendorService
{
    Task<PagedResult<VendorDto>> GetAllAsync(PagedRequest request);
    Task<VendorDto> GetByIdAsync(int id);
    Task<VendorDto> CreateAsync(UpsertVendorRequest request);
    Task UpdateAsync(int id, UpsertVendorRequest request);

    Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request);
    Task MarkReceivedAsync(int purchaseOrderId);
    Task MarkPaidAsync(int purchaseOrderId);
    Task<IReadOnlyList<PurchaseOrderDto>> GetPurchaseOrdersAsync(int? vendorId = null);
}
