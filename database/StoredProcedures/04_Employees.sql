USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Employee_Search
    @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL, @DepartmentId INT = NULL, @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT e.Id, e.EmployeeCode, e.FullName, e.DepartmentId, dept.Name AS DepartmentName, e.Designation,
           e.Salary, e.JoiningDate, e.Shift, e.Contact, e.EmailId, e.EmergencyContact, e.BranchId, e.IsActive,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM Users u WHERE u.LinkedProfileId = e.Id
                AND u.RoleName IN ('Nurse','Pharmacist','LabTechnician','HR','Receptionist') AND u.IsDeleted = 0)
                THEN 1 ELSE 0 END AS BIT) AS HasLogin
    FROM Employees e JOIN Departments dept ON dept.Id = e.DepartmentId
    WHERE e.IsDeleted = 0
      AND (@Search IS NULL OR e.FullName LIKE '%' + @Search + '%' OR e.EmployeeCode LIKE '%' + @Search + '%')
      AND (@DepartmentId IS NULL OR e.DepartmentId = @DepartmentId)
      AND (@BranchId IS NULL OR e.BranchId = @BranchId)
    ORDER BY e.FullName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM Employees e
    WHERE e.IsDeleted = 0
      AND (@Search IS NULL OR e.FullName LIKE '%' + @Search + '%' OR e.EmployeeCode LIKE '%' + @Search + '%')
      AND (@DepartmentId IS NULL OR e.DepartmentId = @DepartmentId)
      AND (@BranchId IS NULL OR e.BranchId = @BranchId);
END
GO

CREATE OR ALTER PROCEDURE sp_Employee_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT e.Id, e.EmployeeCode, e.FullName, e.DepartmentId, dept.Name AS DepartmentName, e.Designation,
           e.Salary, e.JoiningDate, e.Shift, e.Contact, e.EmailId, e.EmergencyContact, e.BranchId, e.IsActive,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM Users u WHERE u.LinkedProfileId = e.Id
                AND u.RoleName IN ('Nurse','Pharmacist','LabTechnician','HR','Receptionist') AND u.IsDeleted = 0)
                THEN 1 ELSE 0 END AS BIT) AS HasLogin
    FROM Employees e JOIN Departments dept ON dept.Id = e.DepartmentId
    WHERE e.Id = @Id AND e.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Employee_Insert
    @EmployeeCode NVARCHAR(30), @FullName NVARCHAR(150), @DepartmentId INT, @Designation NVARCHAR(100),
    @Salary DECIMAL(12,2), @JoiningDate DATE, @Shift NVARCHAR(50), @Contact NVARCHAR(20),
    @EmailId NVARCHAR(150), @EmergencyContact NVARCHAR(20) = NULL, @BranchId INT, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Employees (EmployeeCode, FullName, DepartmentId, Designation, Salary, JoiningDate, Shift,
                            Contact, EmailId, EmergencyContact, BranchId, CreatedBy)
    VALUES (@EmployeeCode, @FullName, @DepartmentId, @Designation, @Salary, @JoiningDate, @Shift,
            @Contact, @EmailId, @EmergencyContact, @BranchId, @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Employee_Update
    @Id INT, @FullName NVARCHAR(150), @DepartmentId INT, @Designation NVARCHAR(100),
    @Salary DECIMAL(12,2), @JoiningDate DATE, @Shift NVARCHAR(50), @Contact NVARCHAR(20),
    @EmailId NVARCHAR(150), @EmergencyContact NVARCHAR(20) = NULL, @UpdatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Employees SET FullName=@FullName, DepartmentId=@DepartmentId, Designation=@Designation,
        Salary=@Salary, JoiningDate=@JoiningDate, Shift=@Shift, Contact=@Contact, EmailId=@EmailId,
        EmergencyContact=@EmergencyContact, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@UpdatedBy
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Employee_Deactivate
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Employees SET IsActive = 0, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Employee_NextCode
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Next INT = (SELECT ISNULL(MAX(CAST(SUBSTRING(EmployeeCode, 4, 10) AS INT)), 0) + 1 FROM Employees WHERE EmployeeCode LIKE 'EMP%');
    SELECT 'EMP' + RIGHT('00000' + CAST(@Next AS VARCHAR(10)), 5) AS NextCode;
END
GO
