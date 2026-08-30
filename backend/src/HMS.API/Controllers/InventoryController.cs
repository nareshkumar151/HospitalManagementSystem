using HMS.Application.Features.Inventory;
using HMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.AdminOnly)]
public class InventoryController : ApiControllerBase
{
    private readonly IInventoryService _inventoryService;

    public InventoryController(IInventoryService inventoryService) => _inventoryService = inventoryService;

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InventoryItemDto>>> GetAll([FromQuery] InventoryItemType? type) => Ok(await _inventoryService.GetAllAsync(CurrentBranchId, type));

    [HttpPost]
    public async Task<ActionResult<InventoryItemDto>> Create(UpsertInventoryItemRequest request) => Ok(await _inventoryService.CreateAsync(request));

    [HttpPost("{id:int}/movements")]
    public async Task<IActionResult> RecordMovement(int id, RecordMovementRequest request)
    {
        await _inventoryService.RecordMovementAsync(id, request, CurrentUserId);
        return NoContent();
    }

    [HttpGet("low-stock")]
    public async Task<ActionResult<IReadOnlyList<InventoryItemDto>>> LowStock() => Ok(await _inventoryService.GetLowStockAsync(CurrentBranchId));

    [HttpGet("expiring-soon")]
    public async Task<ActionResult<IReadOnlyList<InventoryItemDto>>> ExpiringSoon([FromQuery] int withinDays = 30) => Ok(await _inventoryService.GetExpiringSoonAsync(CurrentBranchId, withinDays));
}
