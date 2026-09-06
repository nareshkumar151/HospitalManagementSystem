using HMS.Application.Common.Interfaces;
using HMS.Application.Features.BloodBank;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Module 20: Blood Bank - digitizes the Transfusion Reaction Form. </summary>
[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse + "," + RoleNames.LabTechnician)]
public class BloodBankController : ApiControllerBase
{
    private readonly IBloodBankService _bloodBankService;
    private readonly IPdfService _pdfService;

    public BloodBankController(IBloodBankService bloodBankService, IPdfService pdfService)
    {
        _bloodBankService = bloodBankService;
        _pdfService = pdfService;
    }

    [HttpPost("transfusion-reactions")]
    public async Task<ActionResult<TransfusionReactionDto>> Record(RecordTransfusionReactionRequest request)
        => Ok(await _bloodBankService.RecordAsync(request, CurrentUserId));

    [HttpGet("transfusion-reactions/patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<TransfusionReactionDto>>> GetByPatient(int patientId)
        => Ok(await _bloodBankService.GetByPatientAsync(patientId));

    [HttpGet("transfusion-reactions/{id:int}/pdf")]
    public async Task<IActionResult> DownloadPdf(int id)
    {
        var record = await _bloodBankService.GetByIdAsync(id);
        var pdfBytes = _pdfService.GenerateTransfusionReactionPdf(record);
        return File(pdfBytes, "application/pdf", $"TransfusionReaction-{id}.pdf");
    }
}
