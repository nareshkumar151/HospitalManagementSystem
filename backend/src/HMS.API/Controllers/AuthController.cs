using HMS.Application.Features.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HMS.API.Controllers;

public class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService) => _authService = authService;

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request) => Ok(await _authService.LoginAsync(request));

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Refresh(RefreshTokenRequest request) => Ok(await _authService.RefreshAsync(request));

    [HttpPost("register-patient")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> RegisterPatient(RegisterPatientRequest request) => Ok(await _authService.RegisterPatientAsync(request));

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout(RefreshTokenRequest request)
    {
        await _authService.LogoutAsync(CurrentUserId, request.RefreshToken);
        return NoContent();
    }

    /// <summary> Administrator/HR provisions logins for staff (Doctor/Nurse/Pharmacist/LabTechnician/Receptionist/HR). </summary>
    [HttpPost("create-user")]
    [Authorize(Roles = RoleNames.Administrator + "," + RoleNames.HR)]
    public async Task<IActionResult> CreateUser(CreateUserRequest request)
    {
        var id = await _authService.CreateUserAsync(request);
        return CreatedAtAction(nameof(CreateUser), new { id }, new { id });
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        await _authService.ChangePasswordAsync(CurrentUserId, request);
        return NoContent();
    }
}
