using HMS.Application.Features.MedicalRecords;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class MedicalRecordsController : ApiControllerBase
{
    private readonly IMedicalRecordService _medicalRecordService;

    public MedicalRecordsController(IMedicalRecordService medicalRecordService) => _medicalRecordService = medicalRecordService;

    [HttpPost]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse + "," + RoleNames.LabTechnician)]
    public async Task<ActionResult<MedicalRecordDto>> Add(CreateMedicalRecordRequest request) => Ok(await _medicalRecordService.AddAsync(request));

    [HttpGet("patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<MedicalRecordDto>>> GetByPatient(int patientId, [FromQuery] string? recordType)
    {
        if (User.IsInRole(RoleNames.Patient) && CurrentLinkedProfileId != patientId) return Forbid();
        return Ok(await _medicalRecordService.GetByPatientAsync(patientId, recordType));
    }

    [HttpGet("ip-patient-list")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
    public async Task<ActionResult<IReadOnlyList<IpPatientListRowDto>>> GetIpPatientList() => Ok(await _medicalRecordService.GetIpPatientListAsync(CurrentBranchId));

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.AdminOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        await _medicalRecordService.DeleteAsync(id);
        return NoContent();
    }
}
