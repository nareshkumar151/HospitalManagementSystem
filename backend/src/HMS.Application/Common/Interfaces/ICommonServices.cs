using System.Data;
using HMS.Domain.Enums;

namespace HMS.Application.Common.Interfaces;

/// <summary> Implemented in Infrastructure using Microsoft.Data.SqlClient (Windows Authentication). </summary>
public interface ISqlConnectionFactory
{
    IDbConnection CreateConnection();
}

/// <summary> Reads claims off the current HTTP request's JWT principal. Implemented in Infrastructure/API. </summary>
public interface ICurrentUserService
{
    int? UserId { get; }
    string? Username { get; }
    RoleName? Role { get; }
    int? BranchId { get; }
    int? LinkedProfileId { get; }
    bool IsAuthenticated { get; }
    string? IpAddress { get; }
}

public interface IPasswordHasher
{
    string Hash(string plainTextPassword);
    bool Verify(string plainTextPassword, string hash);
}

public record TokenResult(string AccessToken, DateTime AccessTokenExpiresAt, string RefreshToken);

public interface IJwtTokenService
{
    TokenResult GenerateTokens(int userId, string username, string email, RoleName role, int? hospitalId, int? branchId, int? linkedProfileId);
}

public interface IDateTimeProvider
{
    DateTime UtcNow { get; }
}

/// <summary> Writes to AuditLogs table (SRS Security Requirements). </summary>
public interface IAuditService
{
    Task LogAsync(string action, string entity, string? entityId = null, string? details = null);
}
