USE HMS_DB;
GO

-- "Recorded by" on a consent record showed the capturing staff member's login Username (e.g. "nurse.neha")
-- rather than their actual name - looks wrong on what is, in effect, a legal document. Resolves the real
-- display name instead: Doctors.FullName for a Doctor login, Employees.FullName for every other staff role
-- (Administrator/Nurse/Pharmacist/LabTechnician/HR/Receptionist all have their profile there - see
-- AuthService.CreateUserAsync), falling back to Username only for a login with no linked profile row
-- (e.g. a bare Administrator account) or the login has since been removed.
CREATE OR ALTER FUNCTION dbo.fn_UserDisplayName(@UserId INT)
RETURNS NVARCHAR(200)
AS
BEGIN
    DECLARE @Name NVARCHAR(200);
    SELECT @Name = CASE WHEN u.RoleName = 'Doctor' THEN d.FullName ELSE e.FullName END
    FROM Users u
    LEFT JOIN Doctors d ON d.Id = u.LinkedProfileId AND u.RoleName = 'Doctor'
    LEFT JOIN Employees e ON e.Id = u.LinkedProfileId AND u.RoleName <> 'Doctor'
    WHERE u.Id = @UserId;
    RETURN ISNULL(@Name, (SELECT Username FROM Users WHERE Id = @UserId));
END
GO

CREATE OR ALTER PROCEDURE sp_ConsentTemplate_GetAll
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Code, Title, Category, BodyText, IsActive
    FROM ConsentTemplates
    WHERE IsDeleted = 0 AND (@IncludeInactive = 1 OR IsActive = 1)
    ORDER BY Category, Title;
END
GO

CREATE OR ALTER PROCEDURE sp_ConsentTemplate_Insert
    @Code NVARCHAR(50), @Title NVARCHAR(200), @Category NVARCHAR(30), @BodyText NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ConsentTemplates (Code, Title, Category, BodyText) VALUES (@Code, @Title, @Category, @BodyText);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_ConsentTemplate_Update
    @Id INT, @Title NVARCHAR(200), @BodyText NVARCHAR(MAX), @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ConsentTemplates SET Title = @Title, BodyText = @BodyText, IsActive = @IsActive WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_ConsentRecord_Insert
    @PatientId INT, @TemplateId INT, @HospitalId INT, @BranchId INT, @Context NVARCHAR(20),
    @ContextId INT = NULL, @ProcedureName NVARCHAR(200) = NULL, @Decision NVARCHAR(10),
    @SignedByName NVARCHAR(MAX), @RelationToPatient NVARCHAR(50) = NULL, @WitnessName NVARCHAR(150) = NULL,
    @WitnessUserId INT = NULL, @RefusalReason NVARCHAR(400) = NULL, @Notes NVARCHAR(400) = NULL,
    @RecordedByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ConsentRecords (
        HospitalId, BranchId, PatientId, TemplateId, Context, ContextId, ProcedureName, Decision,
        SignedByName, RelationToPatient, WitnessName, WitnessUserId, RefusalReason, Notes, RecordedByUserId)
    VALUES (
        @HospitalId, @BranchId, @PatientId, @TemplateId, @Context, @ContextId, @ProcedureName, @Decision,
        @SignedByName, @RelationToPatient, @WitnessName, @WitnessUserId, @RefusalReason, @Notes, @RecordedByUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_ConsentRecord_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.TemplateId, t.Title AS TemplateTitle, t.Category, t.BodyText AS TemplateBodyText,
           c.Context, c.ContextId, c.ProcedureName, c.Decision, c.SignedByName, c.RelationToPatient,
           c.WitnessName, wu.Username AS WitnessUserName, c.RefusalReason, c.Notes,
           dbo.fn_UserDisplayName(c.RecordedByUserId) AS RecordedByName, c.SignedAt
    FROM ConsentRecords c
    JOIN Patients p ON p.Id = c.PatientId
    JOIN ConsentTemplates t ON t.Id = c.TemplateId
    LEFT JOIN Users wu ON wu.Id = c.WitnessUserId
    WHERE c.Id = @Id AND c.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_ConsentRecord_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.TemplateId, t.Title AS TemplateTitle, t.Category, t.BodyText AS TemplateBodyText,
           c.Context, c.ContextId, c.ProcedureName, c.Decision, c.SignedByName, c.RelationToPatient,
           c.WitnessName, wu.Username AS WitnessUserName, c.RefusalReason, c.Notes,
           dbo.fn_UserDisplayName(c.RecordedByUserId) AS RecordedByName, c.SignedAt
    FROM ConsentRecords c
    JOIN Patients p ON p.Id = c.PatientId
    JOIN ConsentTemplates t ON t.Id = c.TemplateId
    LEFT JOIN Users wu ON wu.Id = c.WitnessUserId
    WHERE c.PatientId = @PatientId AND c.IsDeleted = 0
    ORDER BY c.SignedAt DESC;
END
GO

-- @HospitalId scopes the audit/search view to one hospital so Hospital A's admins never see Hospital B's
-- consent records, matching every other cross-branch search proc introduced in 07_Schema_MultiHospitalIsolation.
CREATE OR ALTER PROCEDURE sp_ConsentRecord_Search
    @HospitalId INT, @Category NVARCHAR(30) = NULL, @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.TemplateId, t.Title AS TemplateTitle, t.Category, t.BodyText AS TemplateBodyText,
           c.Context, c.ContextId, c.ProcedureName, c.Decision, c.SignedByName, c.RelationToPatient,
           c.WitnessName, wu.Username AS WitnessUserName, c.RefusalReason, c.Notes,
           dbo.fn_UserDisplayName(c.RecordedByUserId) AS RecordedByName, c.SignedAt
    FROM ConsentRecords c
    JOIN Patients p ON p.Id = c.PatientId
    JOIN ConsentTemplates t ON t.Id = c.TemplateId
    LEFT JOIN Users wu ON wu.Id = c.WitnessUserId
    WHERE c.HospitalId = @HospitalId AND c.IsDeleted = 0
      AND (@Category IS NULL OR t.Category = @Category)
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%' OR c.ProcedureName LIKE '%' + @Search + '%')
    ORDER BY c.SignedAt DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM ConsentRecords c
    JOIN Patients p ON p.Id = c.PatientId
    JOIN ConsentTemplates t ON t.Id = c.TemplateId
    WHERE c.HospitalId = @HospitalId AND c.IsDeleted = 0
      AND (@Category IS NULL OR t.Category = @Category)
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%' OR c.ProcedureName LIKE '%' + @Search + '%');
END
GO
