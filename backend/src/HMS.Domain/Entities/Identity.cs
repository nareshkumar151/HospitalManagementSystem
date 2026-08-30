using HMS.Domain.Common;
using HMS.Domain.Enums;

namespace HMS.Domain.Entities;

/// <summary>
/// Application login account. One User maps to exactly one Role, and optionally to a
/// Doctor/Employee/Patient profile row (LinkedProfileId) depending on the Role.
/// Passwords are BCrypt-hashed - never stored/transmitted in clear text (SRS Security Requirements).
/// </summary>
public class User : BaseEntity
{
    public string Username { get; set; } = default!;
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public int RoleId { get; set; }
    public RoleName RoleName { get; set; }
    public int? LinkedProfileId { get; set; }
    public int? BranchId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTime? LockedUntil { get; set; }
}

/// <summary> Master list of roles, seeded from SRS Section 5. </summary>
public class Role : BaseEntity
{
    public RoleName Name { get; set; }
    public string Description { get; set; } = default!;
}

/// <summary> Opaque refresh tokens for JWT renewal without re-login. </summary>
public class RefreshToken : BaseEntity
{
    public int UserId { get; set; }
    public string Token { get; set; } = default!;
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByToken { get; set; }
}

/// <summary> SRS Security Requirements: Audit Logs. </summary>
public class AuditLog
{
    public long Id { get; set; }
    public int? UserId { get; set; }
    public string? Username { get; set; }
    public string Action { get; set; } = default!;
    public string Entity { get; set; } = default!;
    public string? EntityId { get; set; }
    public string? Details { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
