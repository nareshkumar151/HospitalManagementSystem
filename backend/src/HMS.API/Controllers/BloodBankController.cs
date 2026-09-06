using HMS.Application.Features.BloodBank;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Module 20: Blood Bank - digitizes the Transfusion Reaction Form. </summary>
[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse + "," + RoleNames.LabTechnician)]
public class BloodBankController : ApiControllerBase
{
    private readonly IBloodBankService _bloodBankService;

    public BloodBankController(IBloodBankService bloodBankService) => _bloodBankService = bloodBankService;

    [HttpPost("transfusion-reactions")]
    public async Task<ActionResult<TransfusionReactionDto>> Record(RecordTransfusionReactionRequest request)
        => Ok(await _bloodBankService.RecordAsync(request, CurrentUserId));

    [HttpGet("transfusion-reactions/patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<TransfusionReactionDto>>> GetByPatient(int patientId)
        => Ok(await _bloodBankService.GetByPatientAsync(patientId));
}
