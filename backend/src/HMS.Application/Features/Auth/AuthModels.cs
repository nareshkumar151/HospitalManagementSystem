using HMS.Domain.Enums;

namespace HMS.Application.Features.Auth;

public record LoginRequest(string UsernameOrEmail, string Password);

public record LoginResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAt,
    string RefreshToken,
    int UserId,
    string Username,
    string Email,
    RoleName Role,
    int? HospitalId,
    int? BranchId,
    int? LinkedProfileId);

public record RefreshTokenRequest(string RefreshToken);

/// <summary> Only Administrator/HR can create logins for staff; Patients self-register via RegisterPatientRequest. </summary>
public record CreateUserRequest(
    string Username,
    string Email,
    string Password,
    RoleName Role,
    int? LinkedProfileId,
    int? BranchId);

/// <summary> `BranchId` is optional - the public registration page lets a patient pick which branch they're
/// registering at (via GET /organization/branches); omitted, it falls back to the system's first branch so
/// existing single-branch deployments keep working unchanged. </summary>
public record RegisterPatientRequest(
    string FullName,
    string Mobile,
    string Email,
    string Password,
    Gender Gender,
    DateTime? DateOfBirth,
    int? BranchId = null);

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<LoginResponse> RefreshAsync(RefreshTokenRequest request);
    Task LogoutAsync(int userId, string refreshToken);
    Task<int> CreateUserAsync(CreateUserRequest request);
    Task<LoginResponse> RegisterPatientAsync(RegisterPatientRequest request);
    Task ChangePasswordAsync(int userId, ChangePasswordRequest request);
}
