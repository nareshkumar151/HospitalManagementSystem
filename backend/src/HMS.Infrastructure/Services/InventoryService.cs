using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Common.Models;
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

    public async Task<PagedResult<InventoryItemDto>> GetAllAsync(int branchId, PagedRequest request, Domain.Enums.InventoryItemType? type = null)
    {
        var (items, counts) = await _db.QueryMultipleAsync<InventoryItemDto, int>("sp_InventoryItem_GetAll", new
        {
            BranchId = branchId,
            Type = type?.ToString(),
            request.PageNumber,
            request.PageSize,
            request.Search
        });

        return new PagedResult<InventoryItemDto>
        {
            Items = items,
            TotalCount = counts.FirstOrDefault(),
            PageNumber = request.PageNumber,
            PageSize = request.PageSize
        };
    }

    public async Task<InventoryItemDto> GetByIdAsync(int id)
        => await _db.QuerySingleOrDefaultAsync<InventoryItemDto>("sp_InventoryItem_GetById", new { Id = id })
           ?? throw new NotFoundException(nameof(Domain.Entities.InventoryItem), id);

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
        return await GetByIdAsync(newId);
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

    public Task<IReadOnlyList<InventoryItemDto>> GetLowStockAsync(int branchId)
        => _db.QueryAsync<InventoryItemDto>("sp_InventoryItem_GetLowStock", new { BranchId = branchId });

    public Task<IReadOnlyList<InventoryItemDto>> GetExpiringSoonAsync(int branchId, int withinDays = 30)
        => _db.QueryAsync<InventoryItemDto>("sp_InventoryItem_GetExpiringSoon", new { BranchId = branchId, WithinDays = withinDays });
}
