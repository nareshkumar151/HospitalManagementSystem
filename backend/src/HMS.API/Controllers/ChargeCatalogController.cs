using HMS.Application.Features.ChargeCatalog;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Rate master for Nurse Charges / General Service / Others - see ChargeCatalogModels.cs. Read by
/// Generate Bill (front desk) to prefill a line item; only Administrator can add/edit/remove a rate. </summary>
public class ChargeCatalogController : ApiControllerBase
{
    private readonly IChargeCatalogService _chargeCatalogService;

    public ChargeCatalogController(IChargeCatalogService chargeCatalogService) => _chargeCatalogService = chargeCatalogService;

    [HttpGet]
    [Authorize(Roles = RoleNames.FrontDesk)]
    public async Task<ActionResult<IReadOnlyList<ChargeCatalogItemDto>>> GetAll([FromQuery] string? category, [FromQuery] bool includeInactive = false)
        => Ok(await _chargeCatalogService.GetAllAsync(category, includeInactive));

    [HttpPost]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<ChargeCatalogItemDto>> Add(UpsertChargeCatalogItemRequest request)
        => Ok(await _chargeCatalogService.AddAsync(request));

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Update(int id, UpsertChargeCatalogItemRequest request)
    {
        await _chargeCatalogService.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        await _chargeCatalogService.DeleteAsync(id);
        return NoContent();
    }
}
