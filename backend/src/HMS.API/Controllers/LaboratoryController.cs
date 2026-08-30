using HMS.Application.Features.Laboratory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class LaboratoryController : ApiControllerBase
{
    private readonly ILaboratoryService _laboratoryService;

    public LaboratoryController(ILaboratoryService laboratoryService) => _laboratoryService = laboratoryService;

    [HttpGet("catalog")]
    public async Task<ActionResult<IReadOnlyList<LabTestCatalogDto>>> GetCatalog() => Ok(await _laboratoryService.GetCatalogAsync());

    [HttpPost("catalog")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<LabTestCatalogDto>> AddCatalogItem(UpsertLabTestCatalogRequest request)
        => Ok(await _laboratoryService.AddCatalogItemAsync(request));

    [HttpPut("catalog/{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> UpdateCatalogItem(int id, UpsertLabTestCatalogRequest request)
    {
        await _laboratoryService.UpdateCatalogItemAsync(id, request);
        return NoContent();
    }

    [HttpDelete("catalog/{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> DeleteCatalogItem(int id)
    {
        await _laboratoryService.DeleteCatalogItemAsync(id);
        return NoContent();
    }

    [HttpPost("orders")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<LabTestOrderDto>> OrderTest(OrderLabTestRequest request)
        => Ok(await _laboratoryService.OrderTestAsync(request, CurrentLinkedProfileId!.Value));

    [HttpPut("orders/{orderId:int}/collect-sample")]
    [Authorize(Roles = RoleNames.LabTechnician)]
    public async Task<ActionResult<LabTestOrderDto>> CollectSample(int orderId)
        => Ok(await _laboratoryService.CollectSampleAsync(orderId, CurrentUserId));

    [HttpPost("orders/{orderId:int}/report")]
    [Authorize(Roles = RoleNames.LabTechnician)]
    public async Task<ActionResult<LabTestOrderDto>> UploadReport(int orderId, UploadLabReportRequest request)
        => Ok(await _laboratoryService.UploadReportAsync(orderId, request, CurrentUserId));

    [HttpPut("orders/{orderId:int}/review")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<LabTestOrderDto>> Review(int orderId, ReviewLabReportRequest request)
        => Ok(await _laboratoryService.ReviewReportAsync(orderId, request));

    [HttpGet("orders/pending")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.LabTechnician + "," + RoleNames.Doctor)]
    public async Task<ActionResult<IReadOnlyList<LabTestOrderDto>>> GetPending() => Ok(await _laboratoryService.GetPendingAsync(CurrentBranchId));

    [HttpGet("orders/patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<LabTestOrderDto>>> GetByPatient(int patientId)
    {
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != patientId) return Forbid();
        return Ok(await _laboratoryService.GetByPatientAsync(patientId));
    }
}
