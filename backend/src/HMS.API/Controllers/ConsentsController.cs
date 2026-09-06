using HMS.Application.Common.Models;
using HMS.Application.Features.Consents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Module 18: Consent Forms - digitizes the hospital's General/Surgery/Anesthesia/Transfusion/LAMA/
/// procedure-specific paper consents behind one flexible template+record model. </summary>
[Authorize(Roles = RoleNames.ConsentCapture)]
public class ConsentsController : ApiControllerBase
{
    private readonly IConsentService _consentService;

    public ConsentsController(IConsentService consentService) => _consentService = consentService;

    [HttpGet("templates")]
    public async Task<ActionResult<IReadOnlyList<ConsentTemplateDto>>> GetTemplates([FromQuery] bool includeInactive = false)
        => Ok(await _consentService.GetTemplatesAsync(includeInactive));

    [HttpPost("templates")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<ConsentTemplateDto>> CreateTemplate(UpsertConsentTemplateRequest request)
        => Ok(await _consentService.CreateTemplateAsync(request));

    [HttpPut("templates/{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<ActionResult<ConsentTemplateDto>> UpdateTemplate(int id, UpdateConsentTemplateRequest request)
        => Ok(await _consentService.UpdateTemplateAsync(id, request));

    [HttpPost]
    public async Task<ActionResult<ConsentRecordDto>> Capture(CaptureConsentRequest request)
        => Ok(await _consentService.CaptureAsync(request, CurrentHospitalId, CurrentBranchId, CurrentUserId));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConsentRecordDto>> GetById(int id) => Ok(await _consentService.GetByIdAsync(id));

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<ConsentRecordDto>>> GetByPatient(int patientId)
        => Ok(await _consentService.GetByPatientAsync(patientId));

    [HttpGet("search")]
    public async Task<ActionResult<PagedResult<ConsentRecordDto>>> Search([FromQuery] PagedRequest request, [FromQuery] string? category = null)
        => Ok(await _consentService.SearchAsync(CurrentHospitalId, request, category));
}
