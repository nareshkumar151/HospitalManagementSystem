USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_MedicalRecord_Insert
    @PatientId INT, @RecordType NVARCHAR(50), @Title NVARCHAR(200), @FileUrl NVARCHAR(400) = NULL, @Notes NVARCHAR(1000) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO MedicalRecords (PatientId, RecordType, Title, FileUrl, Notes)
    VALUES (@PatientId, @RecordType, @Title, @FileUrl, @Notes);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_MedicalRecord_GetByPatient
    @PatientId INT, @RecordType NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, PatientId, RecordType, Title, FileUrl, Notes, RecordDate
    FROM MedicalRecords
    WHERE PatientId = @PatientId AND IsDeleted = 0 AND (@RecordType IS NULL OR RecordType = @RecordType)
    ORDER BY RecordDate DESC;
END
GO

/* "IP Patient list" operation - patients currently or previously admitted, with their latest admission.
   @BranchId keeps one hospital's medical-records list from including another hospital's admissions. */
CREATE OR ALTER PROCEDURE sp_MedicalRecord_GetIpPatientList
    @BranchId INT, @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id AS PatientId, p.UHID, p.FullName, p.Mobile, a.AdmissionNumber, a.Status, a.AdmissionDate, a.DischargeDate
    FROM Patients p
    JOIN IpdAdmissions a ON a.PatientId = p.Id
    WHERE a.Id IN (SELECT MAX(Id) FROM IpdAdmissions GROUP BY PatientId) AND a.BranchId = @BranchId
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%' OR p.Mobile LIKE '%' + @Search + '%' OR a.AdmissionNumber LIKE '%' + @Search + '%')
    ORDER BY a.AdmissionDate DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM Patients p
    JOIN IpdAdmissions a ON a.PatientId = p.Id
    WHERE a.Id IN (SELECT MAX(Id) FROM IpdAdmissions GROUP BY PatientId) AND a.BranchId = @BranchId
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%' OR p.Mobile LIKE '%' + @Search + '%' OR a.AdmissionNumber LIKE '%' + @Search + '%');
END
GO

CREATE OR ALTER PROCEDURE sp_MedicalRecord_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE MedicalRecords SET IsDeleted = 1 WHERE Id = @Id;
END
GO
