USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_IpdAdmission_NextNumber
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year VARCHAR(4) = CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4));
    DECLARE @Next INT = (
        SELECT ISNULL(MAX(CAST(SUBSTRING(AdmissionNumber, 8, 10) AS INT)), 0) + 1
        FROM IpdAdmissions WHERE AdmissionNumber LIKE 'IPD' + @Year + '%'
    );
    SELECT 'IPD' + @Year + RIGHT('000000' + CAST(@Next AS VARCHAR(10)), 6) AS NextNumber;
END
GO

/* Admits a patient and marks the bed Occupied in one transaction. */
CREATE OR ALTER PROCEDURE sp_IpdAdmission_Admit
    @AdmissionNumber NVARCHAR(30), @PatientId INT, @DoctorId INT, @BedId INT,
    @AdmissionType NVARCHAR(30), @ReasonForAdmission NVARCHAR(400) = NULL, @BranchId INT, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM Beds WHERE Id = @BedId AND Status <> 'Available')
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Selected bed is not available.', 16, 1);
        RETURN;
    END

    INSERT INTO IpdAdmissions (AdmissionNumber, PatientId, DoctorId, BedId, AdmissionType, ReasonForAdmission, BranchId, HospitalId, CreatedBy)
    VALUES (@AdmissionNumber, @PatientId, @DoctorId, @BedId, @AdmissionType, @ReasonForAdmission, @BranchId,
            (SELECT HospitalId FROM Branches WHERE Id = @BranchId), @CreatedBy);

    DECLARE @NewId INT = CAST(SCOPE_IDENTITY() AS INT);

    UPDATE Beds SET Status = 'Occupied' WHERE Id = @BedId;

    COMMIT TRANSACTION;
    SELECT @NewId AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_IpdAdmission_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.AdmissionNumber, a.PatientId, p.FullName AS PatientName, p.UHID, a.DoctorId, doc.FullName AS DoctorName,
           dept.Name AS DepartmentName, p.InsuranceCompany,
           a.NurseUserId, nurse.Username AS NurseName, a.BedId, b.BedNumber, r.RoomNumber, r.Type AS RoomType,
           a.AdmissionDate, a.AdmissionType, a.Status, a.ReasonForAdmission, a.DischargeDate, a.BranchId
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Departments dept ON dept.Id = doc.DepartmentId
    JOIN Beds b ON b.Id = a.BedId
    JOIN Rooms r ON r.Id = b.RoomId
    LEFT JOIN Users nurse ON nurse.Id = a.NurseUserId
    WHERE a.Id = @Id AND a.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_IpdAdmission_GetActive
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    -- Always scoped to one hospital - the active-admissions roster (and the IPD billing picker built on
    -- top of it) must never blend across hospitals.
    SELECT a.Id, a.AdmissionNumber, a.PatientId, p.FullName AS PatientName, p.UHID, a.DoctorId, doc.FullName AS DoctorName,
           dept.Name AS DepartmentName, p.InsuranceCompany,
           a.NurseUserId, nurse.Username AS NurseName, a.BedId, b.BedNumber, r.RoomNumber, r.Type AS RoomType,
           a.AdmissionDate, a.AdmissionType, a.Status, a.ReasonForAdmission, a.DischargeDate, a.BranchId
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Departments dept ON dept.Id = doc.DepartmentId
    JOIN Beds b ON b.Id = a.BedId
    JOIN Rooms r ON r.Id = b.RoomId
    LEFT JOIN Users nurse ON nurse.Id = a.NurseUserId
    WHERE a.Status = 'Admitted' AND a.IsDeleted = 0 AND a.BranchId = @BranchId
    ORDER BY a.AdmissionDate DESC;
END
GO

/* The IPD/Admissions list screen: searchable, date-filterable, paginated - unlike GetActive (which always
   means "who's admitted right now", used by the IPD billing picker), this browses the full admission
   history by default and lets the caller narrow it down. */
CREATE OR ALTER PROCEDURE sp_IpdAdmission_Search
    @BranchId INT, @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL,
    @FromDate DATE = NULL, @ToDate DATE = NULL, @Status NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.AdmissionNumber, a.PatientId, p.FullName AS PatientName, p.UHID, a.DoctorId, doc.FullName AS DoctorName,
           dept.Name AS DepartmentName, p.InsuranceCompany,
           a.NurseUserId, nurse.Username AS NurseName, a.BedId, b.BedNumber, r.RoomNumber, r.Type AS RoomType,
           a.AdmissionDate, a.AdmissionType, a.Status, a.ReasonForAdmission, a.DischargeDate, a.BranchId
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Departments dept ON dept.Id = doc.DepartmentId
    JOIN Beds b ON b.Id = a.BedId
    JOIN Rooms r ON r.Id = b.RoomId
    LEFT JOIN Users nurse ON nurse.Id = a.NurseUserId
    WHERE a.IsDeleted = 0 AND a.BranchId = @BranchId
      AND (@Status IS NULL OR a.Status = @Status)
      AND (@FromDate IS NULL OR CAST(a.AdmissionDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(a.AdmissionDate AS DATE) <= @ToDate)
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%'
           OR a.AdmissionNumber LIKE '%' + @Search + '%' OR p.Mobile LIKE '%' + @Search + '%')
    ORDER BY a.AdmissionDate DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    WHERE a.IsDeleted = 0 AND a.BranchId = @BranchId
      AND (@Status IS NULL OR a.Status = @Status)
      AND (@FromDate IS NULL OR CAST(a.AdmissionDate AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(a.AdmissionDate AS DATE) <= @ToDate)
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%'
           OR a.AdmissionNumber LIKE '%' + @Search + '%' OR p.Mobile LIKE '%' + @Search + '%');
END
GO

CREATE OR ALTER PROCEDURE sp_IpdAdmission_GetByPatient
    @PatientId INT, @BranchId INT = NULL, @HospitalId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- Pass @BranchId for the operational "this branch's admissions for this patient" use (IPD
    -- admissions screen); pass @HospitalId instead for the patient-360 history view, which should show
    -- every admission across every branch of the hospital, not just the branch currently viewing it.
    SELECT a.Id, a.AdmissionNumber, a.PatientId, p.FullName AS PatientName, p.UHID, a.DoctorId, doc.FullName AS DoctorName,
           dept.Name AS DepartmentName, p.InsuranceCompany,
           a.NurseUserId, nurse.Username AS NurseName, a.BedId, b.BedNumber, r.RoomNumber, r.Type AS RoomType,
           a.AdmissionDate, a.AdmissionType, a.Status, a.ReasonForAdmission, a.DischargeDate, a.BranchId
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Departments dept ON dept.Id = doc.DepartmentId
    JOIN Beds b ON b.Id = a.BedId
    JOIN Rooms r ON r.Id = b.RoomId
    LEFT JOIN Users nurse ON nurse.Id = a.NurseUserId
    WHERE a.PatientId = @PatientId AND a.IsDeleted = 0
      AND (@BranchId IS NULL OR a.BranchId = @BranchId)
      AND (@HospitalId IS NULL OR a.HospitalId = @HospitalId)
    ORDER BY a.AdmissionDate DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_IpdAdmission_AssignNurse
    @Id INT, @NurseUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE IpdAdmissions SET NurseUserId = @NurseUserId, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO

/* Moves an admitted patient to a new bed; frees the old one. */
CREATE OR ALTER PROCEDURE sp_IpdAdmission_TransferBed
    @Id INT, @NewBedId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    IF EXISTS (SELECT 1 FROM Beds WHERE Id = @NewBedId AND Status <> 'Available')
    BEGIN
        ROLLBACK TRANSACTION;
        RAISERROR('Target bed is not available.', 16, 1);
        RETURN;
    END

    DECLARE @OldBedId INT = (SELECT BedId FROM IpdAdmissions WHERE Id = @Id);

    UPDATE IpdAdmissions SET BedId = @NewBedId, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
    UPDATE Beds SET Status = 'Available' WHERE Id = @OldBedId;
    UPDATE Beds SET Status = 'Occupied' WHERE Id = @NewBedId;

    COMMIT TRANSACTION;
END
GO

/* Marks admission discharged and frees the bed; called by sp_Discharge_Create as part of the same workflow. */
CREATE OR ALTER PROCEDURE sp_IpdAdmission_Discharge
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    DECLARE @BedId INT = (SELECT BedId FROM IpdAdmissions WHERE Id = @Id);

    UPDATE IpdAdmissions SET Status = 'Discharged', DischargeDate = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
    UPDATE Beds SET Status = 'Available' WHERE Id = @BedId;

    COMMIT TRANSACTION;
END
GO
