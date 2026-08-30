USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_OpdVisit_NextNumber
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year VARCHAR(4) = CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4));
    DECLARE @Next INT = (
        SELECT ISNULL(MAX(CAST(SUBSTRING(OpdVisitNumber, 8, 10) AS INT)), 0) + 1
        FROM OpdVisits WHERE OpdVisitNumber LIKE 'OPD' + @Year + '%'
    );
    SELECT 'OPD' + @Year + RIGHT('000000' + CAST(@Next AS VARCHAR(10)), 6) AS NextNumber;
END
GO

CREATE OR ALTER PROCEDURE sp_OpdVisit_CountFollowUpsSince
    @PatientId INT, @DoctorId INT, @SinceDate DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS VisitCount FROM OpdVisits
    WHERE PatientId = @PatientId AND DoctorId = @DoctorId AND VisitDateTime >= @SinceDate AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_OpdVisit_Insert
    @OpdVisitNumber NVARCHAR(30), @AppointmentId INT, @PatientId INT, @DoctorId INT,
    @ConsultationFee DECIMAL(10,2), @IsFreeFollowUp BIT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO OpdVisits (OpdVisitNumber, AppointmentId, PatientId, DoctorId, ConsultationFee, IsFreeFollowUp)
    VALUES (@OpdVisitNumber, @AppointmentId, @PatientId, @DoctorId, @ConsultationFee, @IsFreeFollowUp);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_OpdVisit_CompleteConsultation
    @Id INT, @Symptoms NVARCHAR(MAX) = NULL, @Diagnosis NVARCHAR(MAX), @ClinicalNotes NVARCHAR(MAX) = NULL,
    @DoctorNotes NVARCHAR(MAX) = NULL, @AdmissionRecommended BIT, @ReferredToDepartmentId INT = NULL,
    @TransferNotes NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE OpdVisits SET Symptoms=@Symptoms, Diagnosis=@Diagnosis, ClinicalNotes=@ClinicalNotes,
        DoctorNotes=@DoctorNotes, AdmissionRecommended=@AdmissionRecommended,
        ReferredToDepartmentId=@ReferredToDepartmentId, TransferNotes=@TransferNotes, UpdatedAt=SYSUTCDATETIME()
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_OpdVisit_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.Id, v.OpdVisitNumber, v.AppointmentId, v.PatientId, p.FullName AS PatientName, v.DoctorId,
           doc.FullName AS DoctorName, v.ConsultationFee, v.IsFreeFollowUp, v.Symptoms, v.Diagnosis,
           v.ClinicalNotes, v.DoctorNotes, v.AdmissionRecommended, v.ReferredToDepartmentId, v.TransferNotes, v.VisitDateTime
    FROM OpdVisits v JOIN Patients p ON p.Id = v.PatientId JOIN Doctors doc ON doc.Id = v.DoctorId
    WHERE v.Id = @Id AND v.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_OpdVisit_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.Id, v.OpdVisitNumber, v.AppointmentId, v.PatientId, p.FullName AS PatientName, v.DoctorId,
           doc.FullName AS DoctorName, v.ConsultationFee, v.IsFreeFollowUp, v.Symptoms, v.Diagnosis,
           v.ClinicalNotes, v.DoctorNotes, v.AdmissionRecommended, v.ReferredToDepartmentId, v.TransferNotes, v.VisitDateTime
    FROM OpdVisits v JOIN Patients p ON p.Id = v.PatientId JOIN Doctors doc ON doc.Id = v.DoctorId
    WHERE v.PatientId = @PatientId AND v.IsDeleted = 0
    ORDER BY v.VisitDateTime DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_OpdVisit_GetByDoctor
    @DoctorId INT, @Date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.Id, v.OpdVisitNumber, v.AppointmentId, v.PatientId, p.FullName AS PatientName, v.DoctorId,
           doc.FullName AS DoctorName, v.ConsultationFee, v.IsFreeFollowUp, v.Symptoms, v.Diagnosis,
           v.ClinicalNotes, v.DoctorNotes, v.AdmissionRecommended, v.ReferredToDepartmentId, v.TransferNotes, v.VisitDateTime
    FROM OpdVisits v JOIN Patients p ON p.Id = v.PatientId JOIN Doctors doc ON doc.Id = v.DoctorId
    WHERE v.DoctorId = @DoctorId AND v.IsDeleted = 0 AND (@Date IS NULL OR CAST(v.VisitDateTime AS DATE) = @Date)
    ORDER BY v.VisitDateTime DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_OpdNursingNote_Insert
    @OpdVisitId INT, @NurseUserId INT, @Temperature DECIMAL(5,2) = NULL, @Pulse INT = NULL,
    @BloodPressure NVARCHAR(20) = NULL, @Oxygen DECIMAL(5,2) = NULL, @Weight DECIMAL(6,2) = NULL,
    @SugarLevel DECIMAL(6,2) = NULL, @Notes NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO OpdNursingNotes (OpdVisitId, NurseUserId, Temperature, Pulse, BloodPressure, Oxygen, Weight, SugarLevel, Notes)
    VALUES (@OpdVisitId, @NurseUserId, @Temperature, @Pulse, @BloodPressure, @Oxygen, @Weight, @SugarLevel, @Notes);
END
GO
