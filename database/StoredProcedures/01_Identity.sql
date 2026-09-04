USE HMS_DB;
GO

/* ==================== Roles ==================== */
CREATE OR ALTER PROCEDURE sp_Role_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Description FROM Roles WHERE IsDeleted = 0 ORDER BY Id;
END
GO

/* ==================== Users ==================== */
CREATE OR ALTER PROCEDURE sp_User_GetByUsernameOrEmail
    @UsernameOrEmail NVARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 Id, Username, Email, PasswordHash, RoleId, RoleName, LinkedProfileId, BranchId, HospitalId,
           IsActive, LastLoginAt, FailedLoginAttempts, LockedUntil
    FROM Users
    WHERE IsDeleted = 0 AND (Username = @UsernameOrEmail OR Email = @UsernameOrEmail);
END
GO

CREATE OR ALTER PROCEDURE sp_User_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Username, Email, PasswordHash, RoleId, RoleName, LinkedProfileId, BranchId, HospitalId,
           IsActive, LastLoginAt, FailedLoginAttempts, LockedUntil
    FROM Users WHERE Id = @Id AND IsDeleted = 0;
END
GO

-- Resolves a role-holder's login (e.g. a Doctors.Id) to their Users.Id, for features that need to notify
-- "whoever can log in as this profile" (appointment alerts, etc). Returns no rows if that profile has no
-- login yet - callers must treat that as "nobody to notify", not an error.
CREATE OR ALTER PROCEDURE sp_User_GetIdByLinkedProfile
    @LinkedProfileId INT, @RoleName NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 Id FROM Users
    WHERE LinkedProfileId = @LinkedProfileId AND RoleName = @RoleName AND IsDeleted = 0 AND IsActive = 1;
END
GO

-- All active logins holding a given role (optionally scoped to one branch) - used to fan a single event
-- (e.g. "this medicine just went out of stock") out to everyone who should see it, not just one user.
CREATE OR ALTER PROCEDURE sp_User_GetIdsByRole
    @RoleName NVARCHAR(50), @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id FROM Users
    WHERE RoleName = @RoleName AND IsDeleted = 0 AND IsActive = 1 AND (@BranchId IS NULL OR BranchId = @BranchId);
END
GO

CREATE OR ALTER PROCEDURE sp_User_Insert
    @Username NVARCHAR(50), @Email NVARCHAR(150), @PasswordHash NVARCHAR(300),
    @RoleId INT, @RoleName NVARCHAR(50), @LinkedProfileId INT = NULL, @BranchId INT = NULL,
    @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Users WHERE (Username = @Username OR Email = @Email) AND IsDeleted = 0)
    BEGIN
        RAISERROR('Username or Email already exists.', 16, 1);
        RETURN;
    END
    -- HospitalId is always derived from the branch being assigned, never a separate client-supplied value -
    -- a user can never be stamped with a hospital that doesn't match their own branch.
    INSERT INTO Users (Username, Email, PasswordHash, RoleId, RoleName, LinkedProfileId, BranchId, HospitalId, CreatedBy)
    VALUES (@Username, @Email, @PasswordHash, @RoleId, @RoleName, @LinkedProfileId, @BranchId,
            (SELECT HospitalId FROM Branches WHERE Id = @BranchId), @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_User_UpdateLoginSuccess
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users SET LastLoginAt = SYSUTCDATETIME(), FailedLoginAttempts = 0, LockedUntil = NULL WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_User_RegisterFailedLogin
    @Id INT, @LockThreshold INT = 5, @LockMinutes INT = 15
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users
    SET FailedLoginAttempts = FailedLoginAttempts + 1,
        LockedUntil = CASE WHEN FailedLoginAttempts + 1 >= @LockThreshold
                           THEN DATEADD(MINUTE, @LockMinutes, SYSUTCDATETIME()) ELSE LockedUntil END
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_User_ChangePassword
    @Id INT, @NewPasswordHash NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users SET PasswordHash = @NewPasswordHash, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO

/* ==================== Refresh Tokens ==================== */
CREATE OR ALTER PROCEDURE sp_RefreshToken_Insert
    @UserId INT, @Token NVARCHAR(500), @ExpiresAt DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO RefreshTokens (UserId, Token, ExpiresAt) VALUES (@UserId, @Token, @ExpiresAt);
END
GO

CREATE OR ALTER PROCEDURE sp_RefreshToken_GetActive
    @Token NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 Id, UserId, Token, ExpiresAt, RevokedAt
    FROM RefreshTokens
    WHERE Token = @Token AND IsDeleted = 0 AND RevokedAt IS NULL AND ExpiresAt > SYSUTCDATETIME();
END
GO

CREATE OR ALTER PROCEDURE sp_RefreshToken_Revoke
    @Token NVARCHAR(500), @ReplacedByToken NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE RefreshTokens SET RevokedAt = SYSUTCDATETIME(), ReplacedByToken = @ReplacedByToken WHERE Token = @Token;
END
GO

/* ==================== Audit Logs ==================== */
CREATE OR ALTER PROCEDURE sp_AuditLog_Insert
    @UserId INT = NULL, @Username NVARCHAR(50) = NULL, @Action NVARCHAR(100),
    @Entity NVARCHAR(100), @EntityId NVARCHAR(50) = NULL, @Details NVARCHAR(MAX) = NULL, @IpAddress NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO AuditLogs (UserId, Username, Action, Entity, EntityId, Details, IpAddress)
    VALUES (@UserId, @Username, @Action, @Entity, @EntityId, @Details, @IpAddress);
END
GO

CREATE OR ALTER PROCEDURE sp_AuditLog_Search
    @PageNumber INT = 1, @PageSize INT = 50, @Entity NVARCHAR(100) = NULL, @UserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, Username, Action, Entity, EntityId, Details, IpAddress, CreatedAt
    FROM AuditLogs
    WHERE (@Entity IS NULL OR Entity = @Entity) AND (@UserId IS NULL OR UserId = @UserId)
    ORDER BY Id DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM AuditLogs
    WHERE (@Entity IS NULL OR Entity = @Entity) AND (@UserId IS NULL OR UserId = @UserId);
END
GO
