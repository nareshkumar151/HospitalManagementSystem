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

/* "IP Patient list" operation - patients currently or previously admitted, with their latest admission. */
CREATE OR ALTER PROCEDURE sp_MedicalRecord_GetIpPatientList
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id AS PatientId, p.UHID, p.FullName, p.Mobile, a.AdmissionNumber, a.Status, a.AdmissionDate, a.DischargeDate
    FROM Patients p
    JOIN IpdAdmissions a ON a.PatientId = p.Id
    WHERE a.Id IN (SELECT MAX(Id) FROM IpdAdmissions GROUP BY PatientId)
    ORDER BY a.AdmissionDate DESC;
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
