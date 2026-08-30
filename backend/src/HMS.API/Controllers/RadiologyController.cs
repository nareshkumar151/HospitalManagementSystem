using HMS.Application.Features.Radiology;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class RadiologyController : ApiControllerBase
{
    private readonly IRadiologyService _radiologyService;

    public RadiologyController(IRadiologyService radiologyService) => _radiologyService = radiologyService;

    [HttpPost("orders")]
    [Authorize(Roles = RoleNames.Doctor)]
    public async Task<ActionResult<RadiologyOrderDto>> Order(OrderRadiologyRequest request)
        => Ok(await _radiologyService.OrderAsync(request, CurrentLinkedProfileId!.Value));

    [HttpPost("orders/{orderId:int}/report")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.LabTechnician)]
    public async Task<ActionResult<RadiologyOrderDto>> UploadReport(int orderId, UploadRadiologyReportRequest request)
        => Ok(await _radiologyService.UploadReportAsync(orderId, request, CurrentUserId));

    [HttpGet("orders/pending")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.LabTechnician + "," + RoleNames.Doctor)]
    public async Task<ActionResult<IReadOnlyList<RadiologyOrderDto>>> GetPending() => Ok(await _radiologyService.GetPendingAsync());

    [HttpGet("orders/patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<RadiologyOrderDto>>> GetByPatient(int patientId)
    {
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != patientId) return Forbid();
        return Ok(await _radiologyService.GetByPatientAsync(patientId));
    }
}
