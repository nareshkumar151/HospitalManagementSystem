using HMS.Application.Features.Insurance;
using HMS.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

[Authorize(Roles = RoleNames.FrontDesk)]
public class InsuranceController : ApiControllerBase
{
    private readonly IInsuranceService _insuranceService;

    public InsuranceController(IInsuranceService insuranceService) => _insuranceService = insuranceService;

    [HttpPost]
    public async Task<ActionResult<InsuranceClaimDto>> Submit(SubmitClaimRequest request) => Ok(await _insuranceService.SubmitAsync(request));

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<InsuranceClaimDto>> UpdateStatus(int id, UpdateClaimStatusRequest request)
        => Ok(await _insuranceService.UpdateStatusAsync(id, request));

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<InsuranceClaimDto>>> GetByPatient(int patientId) => Ok(await _insuranceService.GetByPatientAsync(patientId));

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<InsuranceClaimDto>>> GetAll([FromQuery] ClaimStatus? status) => Ok(await _insuranceService.GetAllAsync(status));
}
