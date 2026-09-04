using HMS.Application.Common.Exceptions;
using HMS.Application.Common.Interfaces;
using HMS.Application.Features.Auth;
using HMS.Domain.Enums;

namespace HMS.Infrastructure.Services;

/// <summary> Row shape matching sp_User_GetByUsernameOrEmail / sp_User_GetById. </summary>
internal record UserRow(
    int Id, string Username, string Email, string PasswordHash, int RoleId, string RoleName,
    int? LinkedProfileId, int? BranchId, int? HospitalId, bool IsActive, DateTime? LastLoginAt, int FailedLoginAttempts, DateTime? LockedUntil);

internal record RoleRow(int Id, string Name, string Description);

internal record RefreshTokenRow(int Id, int UserId, string Token, DateTime ExpiresAt, DateTime? RevokedAt);

public class AuthService : IAuthService
{
    private readonly ISqlDataAccess _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IAuditService _auditService;

    public AuthService(ISqlDataAccess db, IPasswordHasher passwordHasher, IJwtTokenService jwtTokenService, IAuditService auditService)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _auditService = auditService;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _db.QuerySingleOrDefaultAsync<UserRow>("sp_User_GetByUsernameOrEmail", new { request.UsernameOrEmail });
        if (user is null)
            throw new UnauthorizedAppException("Invalid username/email or password.");

        if (!user.IsActive)
            throw new ForbiddenAccessException("This account has been deactivated. Contact the administrator.");

        if (user.LockedUntil.HasValue && user.LockedUntil.Value > DateTime.UtcNow)
            throw new ForbiddenAccessException($"Account locked until {user.LockedUntil.Value:u} due to repeated failed logins.");

        if (!_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            await _db.ExecuteAsync("sp_User_RegisterFailedLogin", new { user.Id });
            await _auditService.LogAsync("LoginFailed", "User", user.Id.ToString());
            throw new UnauthorizedAppException("Invalid username/email or password.");
        }

        await _db.ExecuteAsync("sp_User_UpdateLoginSuccess", new { user.Id });
        await _auditService.LogAsync("LoginSucceeded", "User", user.Id.ToString());

        return await IssueTokensAsync(user);
    }

    public async Task<LoginResponse> RefreshAsync(RefreshTokenRequest request)
    {
        var tokenRow = await _db.QuerySingleOrDefaultAsync<RefreshTokenRow>("sp_RefreshToken_GetActive", new { Token = request.RefreshToken });

        if (tokenRow is null)
            throw new UnauthorizedAppException("Refresh token is invalid or has expired.");

        var user = await _db.QuerySingleOrDefaultAsync<UserRow>("sp_User_GetById", new { Id = tokenRow.UserId });
        if (user is null || !user.IsActive)
            throw new UnauthorizedAppException("Refresh token is invalid or has expired.");

        var response = await IssueTokensAsync(user);
        await _db.ExecuteAsync("sp_RefreshToken_Revoke", new { Token = request.RefreshToken, ReplacedByToken = response.RefreshToken });
        return response;
    }

    public Task LogoutAsync(int userId, string refreshToken)
    {
        return _db.ExecuteAsync("sp_RefreshToken_Revoke", new { Token = refreshToken, ReplacedByToken = (string?)null });
    }

    public async Task<int> CreateUserAsync(CreateUserRequest request)
    {
        var roleId = await GetRoleIdAsync(request.Role);
        var hash = _passwordHasher.Hash(request.Password);

        var newId = await _db.QuerySingleAsync<int>("sp_User_Insert", new
        {
            request.Username,
            request.Email,
            PasswordHash = hash,
            RoleId = roleId,
            RoleName = request.Role.ToString(),
            request.LinkedProfileId,
            request.BranchId
        });

        await _auditService.LogAsync("UserCreated", "User", newId.ToString(), $"Role={request.Role}");
        return newId;
    }

    public async Task<LoginResponse> RegisterPatientAsync(RegisterPatientRequest request)
    {
        // Falls back to branch 1 only when the caller doesn't specify one, so single-branch deployments
        // (and any older client that predates the branch picker) keep working exactly as before.
        var branchId = request.BranchId ?? 1;

        var uhid = await _db.ExecuteScalarAsync<string>("sp_Patient_NextUhid");
        var patientId = await _db.QuerySingleAsync<int>("sp_Patient_Insert", new
        {
            UHID = uhid,
            AadhaarNumber = (string?)null,
            request.FullName,
            Gender = request.Gender.ToString(),
            request.DateOfBirth,
            Age = (int?)null,
            request.Mobile,
            request.Email,
            Address = (string?)null,
            BloodGroup = BloodGroup.Unknown.ToString(),
            EmergencyContactName = (string?)null,
            EmergencyContactNumber = (string?)null,
            ReferredByDoctorName = (string?)null,
            ReferralHospital = (string?)null,
            ReferralNotes = (string?)null,
            InsuranceCompany = (string?)null,
            InsurancePolicyNumber = (string?)null,
            Allergies = (string?)null,
            BranchId = branchId,
            RegisteredByUserId = (int?)null,
            CreatedBy = "self-registration"
        });

        var username = request.Email.Split('@')[0] + patientId;
        await CreateUserAsync(new CreateUserRequest(username, request.Email, request.Password, RoleName.Patient, patientId, branchId));

        return await LoginAsync(new LoginRequest(request.Email, request.Password));
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordRequest request)
    {
        var user = await _db.QuerySingleOrDefaultAsync<UserRow>("sp_User_GetById", new { Id = userId })
            ?? throw new NotFoundException(nameof(Domain.Entities.User), userId);

        if (!_passwordHasher.Verify(request.CurrentPassword, user.PasswordHash))
            throw new ValidationAppException("Current password is incorrect.");

        var newHash = _passwordHasher.Hash(request.NewPassword);
        await _db.ExecuteAsync("sp_User_ChangePassword", new { Id = userId, NewPasswordHash = newHash });
        await _auditService.LogAsync("PasswordChanged", "User", userId.ToString());
    }

    private async Task<LoginResponse> IssueTokensAsync(UserRow user)
    {
        var role = Enum.Parse<RoleName>(user.RoleName);
        var tokens = _jwtTokenService.GenerateTokens(user.Id, user.Username, user.Email, role, user.HospitalId, user.BranchId, user.LinkedProfileId);

        await _db.ExecuteAsync("sp_RefreshToken_Insert", new
        {
            UserId = user.Id,
            Token = tokens.RefreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        });

        return new LoginResponse(tokens.AccessToken, tokens.AccessTokenExpiresAt, tokens.RefreshToken,
            user.Id, user.Username, user.Email, role, user.HospitalId, user.BranchId, user.LinkedProfileId);
    }

    private async Task<int> GetRoleIdAsync(RoleName role)
    {
        var roles = await _db.QueryAsync<RoleRow>("sp_Role_GetAll");
        var match = roles.FirstOrDefault(r => r.Name == role.ToString())
            ?? throw new NotFoundException("Role", role);
        return match.Id;
    }
}
