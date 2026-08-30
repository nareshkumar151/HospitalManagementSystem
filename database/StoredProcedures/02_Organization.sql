USE HMS_DB;
GO

/* ==================== Hospitals ==================== */
CREATE OR ALTER PROCEDURE sp_Hospital_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, RegistrationNumber, Address, ContactNumber, Email, LogoUrl FROM Hospitals WHERE IsDeleted = 0 ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_Hospital_Insert
    @Name NVARCHAR(200), @RegistrationNumber NVARCHAR(100), @Address NVARCHAR(400),
    @ContactNumber NVARCHAR(20), @Email NVARCHAR(150) = NULL, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Hospitals (Name, RegistrationNumber, Address, ContactNumber, Email, CreatedBy)
    VALUES (@Name, @RegistrationNumber, @Address, @ContactNumber, @Email, @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Hospital_Update
    @Id INT, @Name NVARCHAR(200), @RegistrationNumber NVARCHAR(100), @Address NVARCHAR(400),
    @ContactNumber NVARCHAR(20), @Email NVARCHAR(150) = NULL, @UpdatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Hospitals SET Name=@Name, RegistrationNumber=@RegistrationNumber, Address=@Address,
        ContactNumber=@ContactNumber, Email=@Email, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@UpdatedBy
    WHERE Id = @Id;
END
GO

/* Refuses to delete a hospital that still has active branches - deactivate/move those first. */
CREATE OR ALTER PROCEDURE sp_Hospital_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Branches WHERE HospitalId = @Id AND IsDeleted = 0)
    BEGIN
        RAISERROR('Cannot delete a hospital that still has active branches.', 16, 1);
        RETURN;
    END
    UPDATE Hospitals SET IsDeleted = 1 WHERE Id = @Id;
END
GO

/* ==================== Branches ==================== */
CREATE OR ALTER PROCEDURE sp_Branch_GetAll
    @HospitalId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, HospitalId, Name, Address, City, ContactNumber, IsActive
    FROM Branches WHERE IsDeleted = 0 AND (@HospitalId IS NULL OR HospitalId = @HospitalId)
    ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_Branch_Insert
    @HospitalId INT, @Name NVARCHAR(200), @Address NVARCHAR(400), @City NVARCHAR(100),
    @ContactNumber NVARCHAR(20), @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Branches (HospitalId, Name, Address, City, ContactNumber, CreatedBy)
    VALUES (@HospitalId, @Name, @Address, @City, @ContactNumber, @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Branch_Update
    @Id INT, @Name NVARCHAR(200), @Address NVARCHAR(400), @City NVARCHAR(100),
    @ContactNumber NVARCHAR(20), @UpdatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Branches SET Name=@Name, Address=@Address, City=@City, ContactNumber=@ContactNumber,
        UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@UpdatedBy
    WHERE Id = @Id;
END
GO

/* Refuses to delete a branch that still has active departments, doctors, employees, or patients. */
CREATE OR ALTER PROCEDURE sp_Branch_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Departments WHERE BranchId = @Id AND IsDeleted = 0)
       OR EXISTS (SELECT 1 FROM Doctors WHERE BranchId = @Id AND IsDeleted = 0)
       OR EXISTS (SELECT 1 FROM Employees WHERE BranchId = @Id AND IsDeleted = 0)
       OR EXISTS (SELECT 1 FROM Patients WHERE BranchId = @Id AND IsDeleted = 0)
    BEGIN
        RAISERROR('Cannot delete a branch that still has active departments, doctors, employees, or patients.', 16, 1);
        RETURN;
    END
    UPDATE Branches SET IsDeleted = 1 WHERE Id = @Id;
END
GO

/* ==================== Departments ==================== */
CREATE OR ALTER PROCEDURE sp_Department_GetAll
    @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, BranchId, Name, Description, IsActive
    FROM Departments WHERE IsDeleted = 0 AND (@BranchId IS NULL OR BranchId = @BranchId)
    ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_Department_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, BranchId, Name, Description, IsActive FROM Departments WHERE Id = @Id AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Department_Insert
    @BranchId INT, @Name NVARCHAR(150), @Description NVARCHAR(400) = NULL, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Departments (BranchId, Name, Description, CreatedBy) VALUES (@BranchId, @Name, @Description, @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Department_Update
    @Id INT, @BranchId INT, @Name NVARCHAR(150), @Description NVARCHAR(400) = NULL, @UpdatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Departments SET BranchId=@BranchId, Name=@Name, Description=@Description,
        UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@UpdatedBy
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Department_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Departments SET IsDeleted = 1 WHERE Id = @Id;
END
GO
