using HMS.Application.Common.Models;
using HMS.Domain.Enums;

namespace HMS.Application.Features.Inventory;

public record InventoryItemDto(
    int Id, string ItemName, InventoryItemType Type, string Unit, int Stock, int ReorderLevel,
    DateTime? ExpiryDate, int? VendorId, int BranchId);

public record UpsertInventoryItemRequest(
    string ItemName, InventoryItemType Type, string Unit, int Stock, int ReorderLevel,
    DateTime? ExpiryDate, int? VendorId, int BranchId);

public record RecordMovementRequest(StockMovementType MovementType, int Quantity, string? Reason);

public interface IInventoryService
{
    Task<PagedResult<InventoryItemDto>> GetAllAsync(int branchId, PagedRequest request, InventoryItemType? type = null);
    Task<InventoryItemDto> GetByIdAsync(int id);
    Task<InventoryItemDto> CreateAsync(UpsertInventoryItemRequest request);
    Task RecordMovementAsync(int itemId, RecordMovementRequest request, int userId);
    Task<IReadOnlyList<InventoryItemDto>> GetLowStockAsync(int branchId);
    Task<IReadOnlyList<InventoryItemDto>> GetExpiringSoonAsync(int branchId, int withinDays = 30);
}
