using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using HMS.Application.Common.Interfaces;
using HMS.Domain.Enums;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HMS.Infrastructure.Identity;

/// <summary>
/// Issues short-lived JWT access tokens (RBAC claims baked in: role, branch, linked profile id)
/// plus a long-lived opaque refresh token. See SRS Security Requirements: JWT Token Authentication,
/// Role-Based Access Control, Session Timeout.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly JwtSettings _settings;

    public JwtTokenService(IOptions<JwtSettings> settings)
    {
        _settings = settings.Value;
    }

    public TokenResult GenerateTokens(int userId, string username, string email, RoleName role, int? hospitalId, int? branchId, int? linkedProfileId)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new(ClaimTypes.NameIdentifier, userId.ToString()),
            new(ClaimTypes.Name, username),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        // SuperAdmin sits above Administrator: rather than adding SuperAdmin to every
        // [Authorize(Roles = "...Administrator...")] check across the API, a SuperAdmin login also gets an
        // "Administrator" role claim, so every existing Administrator-gated endpoint already works for them.
        // RoleNames.SuperAdminOnly is used for the few actions Administrator itself must not reach
        // (creating/deleting Hospitals and Branches).
        if (role == RoleName.SuperAdmin)
            claims.Add(new Claim(ClaimTypes.Role, RoleName.Administrator.ToString()));

        if (hospitalId.HasValue) claims.Add(new Claim("hospitalId", hospitalId.Value.ToString()));
        if (branchId.HasValue) claims.Add(new Claim("branchId", branchId.Value.ToString()));
        if (linkedProfileId.HasValue) claims.Add(new Claim("linkedProfileId", linkedProfileId.Value.ToString()));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddMinutes(_settings.AccessTokenMinutes);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
        var refreshToken = GenerateSecureRandomToken();

        return new TokenResult(accessToken, expiresAt, refreshToken);
    }

    private static string GenerateSecureRandomToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }
}
