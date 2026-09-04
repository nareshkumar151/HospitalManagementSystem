using HMS.Application.Common.Models;
using HMS.Application.Features.Vendors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.AdminOnly)]
public class VendorsController : ApiControllerBase
{
    private readonly IVendorService _vendorService;

    public VendorsController(IVendorService vendorService) => _vendorService = vendorService;

    [HttpGet]
    public async Task<ActionResult<PagedResult<VendorDto>>> GetAll([FromQuery] PagedRequest request) => Ok(await _vendorService.GetAllAsync(request));

    [HttpPost]
    public async Task<ActionResult<VendorDto>> Create(UpsertVendorRequest request) => Ok(await _vendorService.CreateAsync(request));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpsertVendorRequest request)
    {
        await _vendorService.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpPost("purchase-orders")]
    public async Task<ActionResult<PurchaseOrderDto>> CreatePurchaseOrder(CreatePurchaseOrderRequest request) => Ok(await _vendorService.CreatePurchaseOrderAsync(request));

    [HttpPut("purchase-orders/{id:int}/received")]
    public async Task<IActionResult> MarkReceived(int id)
    {
        await _vendorService.MarkReceivedAsync(id);
        return NoContent();
    }

    [HttpPut("purchase-orders/{id:int}/paid")]
    public async Task<IActionResult> MarkPaid(int id)
    {
        await _vendorService.MarkPaidAsync(id);
        return NoContent();
    }

    [HttpGet("purchase-orders")]
    public async Task<ActionResult<IReadOnlyList<PurchaseOrderDto>>> GetPurchaseOrders([FromQuery] int? vendorId) => Ok(await _vendorService.GetPurchaseOrdersAsync(vendorId));
}
