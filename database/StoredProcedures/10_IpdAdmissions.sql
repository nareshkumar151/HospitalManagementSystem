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

    INSERT INTO IpdAdmissions (AdmissionNumber, PatientId, DoctorId, BedId, AdmissionType, ReasonForAdmission, BranchId, CreatedBy)
    VALUES (@AdmissionNumber, @PatientId, @DoctorId, @BedId, @AdmissionType, @ReasonForAdmission, @BranchId, @CreatedBy);

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
    SELECT a.Id, a.AdmissionNumber, a.PatientId, p.FullName AS PatientName, a.DoctorId, doc.FullName AS DoctorName,
           a.NurseUserId, nurse.Username AS NurseName, a.BedId, b.BedNumber, r.RoomNumber, r.Type AS RoomType,
           a.AdmissionDate, a.AdmissionType, a.Status, a.ReasonForAdmission, a.DischargeDate, a.BranchId
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Beds b ON b.Id = a.BedId
    JOIN Rooms r ON r.Id = b.RoomId
    LEFT JOIN Users nurse ON nurse.Id = a.NurseUserId
    WHERE a.Id = @Id AND a.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_IpdAdmission_GetActive
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.AdmissionNumber, a.PatientId, p.FullName AS PatientName, a.DoctorId, doc.FullName AS DoctorName,
           a.NurseUserId, nurse.Username AS NurseName, a.BedId, b.BedNumber, r.RoomNumber, r.Type AS RoomType,
           a.AdmissionDate, a.AdmissionType, a.Status, a.ReasonForAdmission, a.DischargeDate, a.BranchId
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Beds b ON b.Id = a.BedId
    JOIN Rooms r ON r.Id = b.RoomId
    LEFT JOIN Users nurse ON nurse.Id = a.NurseUserId
    WHERE a.Status = 'Admitted' AND a.IsDeleted = 0
    ORDER BY a.AdmissionDate DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_IpdAdmission_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.AdmissionNumber, a.PatientId, p.FullName AS PatientName, a.DoctorId, doc.FullName AS DoctorName,
           a.NurseUserId, nurse.Username AS NurseName, a.BedId, b.BedNumber, r.RoomNumber, r.Type AS RoomType,
           a.AdmissionDate, a.AdmissionType, a.Status, a.ReasonForAdmission, a.DischargeDate, a.BranchId
    FROM IpdAdmissions a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Beds b ON b.Id = a.BedId
    JOIN Rooms r ON r.Id = b.RoomId
    LEFT JOIN Users nurse ON nurse.Id = a.NurseUserId
    WHERE a.PatientId = @PatientId AND a.IsDeleted = 0
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
