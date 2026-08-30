using HMS.Application.Common.Models;
using HMS.Application.Features.Pharmacy;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class PharmacyController : ApiControllerBase
{
    private readonly IPharmacyService _pharmacyService;

    public PharmacyController(IPharmacyService pharmacyService) => _pharmacyService = pharmacyService;

    [HttpGet("medicines")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist + "," + RoleNames.Doctor)]
    public async Task<ActionResult<PagedResult<MedicineDto>>> SearchMedicines([FromQuery] PagedRequest request) => Ok(await _pharmacyService.SearchAsync(request));

    [HttpGet("medicines/low-stock")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<IReadOnlyList<MedicineDto>>> LowStock() => Ok(await _pharmacyService.GetLowStockAsync());

    [HttpGet("medicines/expiring-soon")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<IReadOnlyList<MedicineDto>>> ExpiringSoon([FromQuery] int withinDays = 30) => Ok(await _pharmacyService.GetExpiringSoonAsync(withinDays));

    [HttpPost("medicines")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<MedicineDto>> CreateMedicine(UpsertMedicineRequest request) => Ok(await _pharmacyService.CreateAsync(request));

    [HttpPut("medicines/{id:int}")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<IActionResult> UpdateMedicine(int id, UpsertMedicineRequest request)
    {
        await _pharmacyService.UpdateAsync(id, request);
        return NoContent();
    }

    [HttpPost("medicines/purchase")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<IActionResult> Purchase(PurchaseMedicineRequest request)
    {
        await _pharmacyService.PurchaseAsync(request, CurrentUserId);
        return NoContent();
    }

    [HttpPost("medicines/adjust-stock")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<IActionResult> AdjustStock(AdjustStockRequest request)
    {
        await _pharmacyService.AdjustStockAsync(request, CurrentUserId);
        return NoContent();
    }

    [HttpPost("sales/dispense")]
    [Authorize(Roles = RoleNames.Pharmacist)]
    public async Task<ActionResult<PharmacySaleDto>> Dispense(DispenseSaleRequest request)
        => Ok(await _pharmacyService.DispenseAsync(request, CurrentUserId));

    [HttpPost("sales/return")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<IActionResult> Return(ReturnSaleItemRequest request)
    {
        await _pharmacyService.ReturnAsync(request, CurrentUserId);
        return NoContent();
    }

    [HttpGet("sales/{id:int}")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Pharmacist)]
    public async Task<ActionResult<PharmacySaleDto>> GetSale(int id) => Ok(await _pharmacyService.GetSaleByIdAsync(id));
}
