using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Inventory;

namespace HMS.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly ISqlDataAccess _db;
    private readonly IAuditService _auditService;

    public InventoryService(ISqlDataAccess db, IAuditService auditService)
    {
        _db = db;
        _auditService = auditService;
    }

    public Task<IReadOnlyList<InventoryItemDto>> GetAllAsync(Domain.Enums.InventoryItemType? type = null)
        => _db.QueryAsync<InventoryItemDto>("sp_InventoryItem_GetAll", new { Type = type?.ToString() });

    public async Task<InventoryItemDto> CreateAsync(UpsertInventoryItemRequest request)
    {
        var newId = await _db.QuerySingleAsync<int>("sp_InventoryItem_Insert", new
        {
            request.ItemName,
            Type = request.Type.ToString(),
            request.Unit,
            request.Stock,
            request.ReorderLevel,
            request.ExpiryDate,
            request.VendorId,
            request.BranchId
        });
        await _auditService.LogAsync("InventoryItemCreated", "InventoryItem", newId.ToString());
        var all = await GetAllAsync();
        return all.First(i => i.Id == newId);
    }

    public async Task RecordMovementAsync(int itemId, RecordMovementRequest request, int userId)
    {
        await _db.ExecuteAsync("sp_InventoryItem_RecordMovement", new
        {
            InventoryItemId = itemId,
            MovementType = request.MovementType.ToString(),
            request.Quantity,
            request.Reason,
            UserId = userId
        });
        await _auditService.LogAsync("InventoryMovementRecorded", "InventoryItem", itemId.ToString(), request.MovementType.ToString());
    }

    public Task<IReadOnlyList<InventoryItemDto>> GetLowStockAsync() => _db.QueryAsync<InventoryItemDto>("sp_InventoryItem_GetLowStock");

    public Task<IReadOnlyList<InventoryItemDto>> GetExpiringSoonAsync(int withinDays = 30)
        => _db.QueryAsync<InventoryItemDto>("sp_InventoryItem_GetExpiringSoon", new { WithinDays = withinDays });
}
