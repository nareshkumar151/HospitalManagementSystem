USE HMS_DB;
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
    @SignedByName NVARCHAR(150), @RelationToPatient NVARCHAR(50) = NULL, @WitnessName NVARCHAR(150) = NULL,
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
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.TemplateId, t.Title AS TemplateTitle, t.Category,
           c.Context, c.ContextId, c.ProcedureName, c.Decision, c.SignedByName, c.RelationToPatient,
           c.WitnessName, wu.Username AS WitnessUserName, c.RefusalReason, c.Notes,
           ru.Username AS RecordedByName, c.SignedAt
    FROM ConsentRecords c
    JOIN Patients p ON p.Id = c.PatientId
    JOIN ConsentTemplates t ON t.Id = c.TemplateId
    JOIN Users ru ON ru.Id = c.RecordedByUserId
    LEFT JOIN Users wu ON wu.Id = c.WitnessUserId
    WHERE c.Id = @Id AND c.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_ConsentRecord_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.TemplateId, t.Title AS TemplateTitle, t.Category,
           c.Context, c.ContextId, c.ProcedureName, c.Decision, c.SignedByName, c.RelationToPatient,
           c.WitnessName, wu.Username AS WitnessUserName, c.RefusalReason, c.Notes,
           ru.Username AS RecordedByName, c.SignedAt
    FROM ConsentRecords c
    JOIN Patients p ON p.Id = c.PatientId
    JOIN ConsentTemplates t ON t.Id = c.TemplateId
    JOIN Users ru ON ru.Id = c.RecordedByUserId
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
    SELECT c.Id, c.PatientId, p.FullName AS PatientName, c.TemplateId, t.Title AS TemplateTitle, t.Category,
           c.Context, c.ContextId, c.ProcedureName, c.Decision, c.SignedByName, c.RelationToPatient,
           c.WitnessName, wu.Username AS WitnessUserName, c.RefusalReason, c.Notes,
           ru.Username AS RecordedByName, c.SignedAt
    FROM ConsentRecords c
    JOIN Patients p ON p.Id = c.PatientId
    JOIN ConsentTemplates t ON t.Id = c.TemplateId
    JOIN Users ru ON ru.Id = c.RecordedByUserId
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
