USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Doctor_Search
    @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL,
    @DepartmentId INT = NULL, @BranchId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT d.Id, d.DoctorCode, d.FullName, d.DepartmentId, dept.Name AS DepartmentName,
           d.Qualification, d.ExperienceYears, d.ConsultationFee, d.AvailableDays,
           d.Mobile, d.Email, d.DigitalSignatureUrl, d.BranchId, d.IsActive,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM Users u WHERE u.LinkedProfileId = d.Id AND u.RoleName = 'Doctor' AND u.IsDeleted = 0) THEN 1 ELSE 0 END AS BIT) AS HasLogin
    FROM Doctors d
    JOIN Departments dept ON dept.Id = d.DepartmentId
    WHERE d.IsDeleted = 0
      AND (@Search IS NULL OR d.FullName LIKE '%' + @Search + '%' OR d.DoctorCode LIKE '%' + @Search + '%')
      AND (@DepartmentId IS NULL OR d.DepartmentId = @DepartmentId)
      AND (@BranchId IS NULL OR d.BranchId = @BranchId)
    ORDER BY d.FullName
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM Doctors d
    WHERE d.IsDeleted = 0
      AND (@Search IS NULL OR d.FullName LIKE '%' + @Search + '%' OR d.DoctorCode LIKE '%' + @Search + '%')
      AND (@DepartmentId IS NULL OR d.DepartmentId = @DepartmentId)
      AND (@BranchId IS NULL OR d.BranchId = @BranchId);
END
GO

CREATE OR ALTER PROCEDURE sp_Doctor_GetByDepartment
    @DepartmentId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT d.Id, d.DoctorCode, d.FullName, d.DepartmentId, dept.Name AS DepartmentName,
           d.Qualification, d.ExperienceYears, d.ConsultationFee, d.AvailableDays,
           d.Mobile, d.Email, d.DigitalSignatureUrl, d.BranchId, d.IsActive,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM Users u WHERE u.LinkedProfileId = d.Id AND u.RoleName = 'Doctor' AND u.IsDeleted = 0) THEN 1 ELSE 0 END AS BIT) AS HasLogin
    FROM Doctors d JOIN Departments dept ON dept.Id = d.DepartmentId
    WHERE d.IsDeleted = 0 AND d.IsActive = 1 AND d.DepartmentId = @DepartmentId
    ORDER BY d.FullName;
END
GO

CREATE OR ALTER PROCEDURE sp_Doctor_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT d.Id, d.DoctorCode, d.FullName, d.DepartmentId, dept.Name AS DepartmentName,
           d.Qualification, d.ExperienceYears, d.ConsultationFee, d.AvailableDays,
           d.Mobile, d.Email, d.DigitalSignatureUrl, d.BranchId, d.IsActive,
           CAST(CASE WHEN EXISTS (SELECT 1 FROM Users u WHERE u.LinkedProfileId = d.Id AND u.RoleName = 'Doctor' AND u.IsDeleted = 0) THEN 1 ELSE 0 END AS BIT) AS HasLogin
    FROM Doctors d JOIN Departments dept ON dept.Id = d.DepartmentId
    WHERE d.Id = @Id AND d.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Doctor_Insert
    @DoctorCode NVARCHAR(30), @FullName NVARCHAR(150), @DepartmentId INT, @Qualification NVARCHAR(200),
    @ExperienceYears INT, @ConsultationFee DECIMAL(10,2), @AvailableDays NVARCHAR(100) = NULL,
    @Mobile NVARCHAR(20) = NULL, @Email NVARCHAR(150) = NULL, @BranchId INT, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Doctors (DoctorCode, FullName, DepartmentId, Qualification, ExperienceYears, ConsultationFee,
                          AvailableDays, Mobile, Email, BranchId, HospitalId, CreatedBy)
    VALUES (@DoctorCode, @FullName, @DepartmentId, @Qualification, @ExperienceYears, @ConsultationFee,
            @AvailableDays, @Mobile, @Email, @BranchId, (SELECT HospitalId FROM Branches WHERE Id = @BranchId), @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Doctor_Update
    @Id INT, @FullName NVARCHAR(150), @DepartmentId INT, @Qualification NVARCHAR(200),
    @ExperienceYears INT, @ConsultationFee DECIMAL(10,2), @AvailableDays NVARCHAR(100) = NULL,
    @Mobile NVARCHAR(20) = NULL, @Email NVARCHAR(150) = NULL, @UpdatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Doctors SET FullName=@FullName, DepartmentId=@DepartmentId, Qualification=@Qualification,
        ExperienceYears=@ExperienceYears, ConsultationFee=@ConsultationFee, AvailableDays=@AvailableDays,
        Mobile=@Mobile, Email=@Email, UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@UpdatedBy
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Doctor_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Doctors SET IsDeleted = 1, IsActive = 0 WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Doctor_UpdateSignature
    @Id INT, @DigitalSignatureUrl NVARCHAR(400)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Doctors SET DigitalSignatureUrl = @DigitalSignatureUrl, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Doctor_NextCode
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Next INT = (SELECT ISNULL(MAX(CAST(SUBSTRING(DoctorCode, 4, 10) AS INT)), 0) + 1 FROM Doctors WHERE DoctorCode LIKE 'DOC%');
    SELECT 'DOC' + RIGHT('00000' + CAST(@Next AS VARCHAR(10)), 5) AS NextCode;
END
GO
