using HMS.Application.Features.Nutrition;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

/// <summary> Module 22: Nutrition/Dietetics - digitizes the Initial Assessment by Nutrition paper form. </summary>
[Authorize(Roles = RoleNames.Administrator + "," + RoleNames.Doctor + "," + RoleNames.Nurse)]
public class NutritionController : ApiControllerBase
{
    private readonly INutritionService _nutritionService;

    public NutritionController(INutritionService nutritionService) => _nutritionService = nutritionService;

    [HttpPost("assessments")]
    public async Task<ActionResult<NutritionAssessmentDto>> Record(RecordNutritionAssessmentRequest request)
        => Ok(await _nutritionService.RecordAsync(request, CurrentUserId));

    [HttpGet("assessments/patient/{patientId:int}")]
    public async Task<ActionResult<IReadOnlyList<NutritionAssessmentDto>>> GetByPatient(int patientId)
        => Ok(await _nutritionService.GetByPatientAsync(patientId));
}
