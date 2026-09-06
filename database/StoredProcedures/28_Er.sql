USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_ErVisit_Insert
    @PatientId INT, @BranchId INT, @HospitalId INT, @ModeOfArrival NVARCHAR(20) = NULL,
    @BroughtBy NVARCHAR(150) = NULL, @ChiefComplaint NVARCHAR(400), @TriageCategory NVARCHAR(10),
    @RegisteredByUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ErVisits (PatientId, BranchId, HospitalId, ModeOfArrival, BroughtBy, ChiefComplaint, TriageCategory, RegisteredByUserId)
    VALUES (@PatientId, @BranchId, @HospitalId, @ModeOfArrival, @BroughtBy, @ChiefComplaint, @TriageCategory, @RegisteredByUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_ErVisit_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.Id, v.PatientId, p.FullName AS PatientName, p.UHID AS Uhid, v.ArrivalTime, v.ModeOfArrival,
           v.BroughtBy, v.ChiefComplaint, v.TriageCategory, v.Status, u.Username AS RegisteredByName
    FROM ErVisits v JOIN Patients p ON p.Id = v.PatientId JOIN Users u ON u.Id = v.RegisteredByUserId
    WHERE v.Id = @Id AND v.IsDeleted = 0;
END
GO

-- @BranchId scopes the ER worklist to one branch, matching every other cross-branch isolation added in
-- 07_Schema_MultiHospitalIsolation.
CREATE OR ALTER PROCEDURE sp_ErVisit_GetActive
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT v.Id, v.PatientId, p.FullName AS PatientName, p.UHID AS Uhid, v.ArrivalTime, v.ModeOfArrival,
           v.BroughtBy, v.ChiefComplaint, v.TriageCategory, v.Status, u.Username AS RegisteredByName
    FROM ErVisits v JOIN Patients p ON p.Id = v.PatientId JOIN Users u ON u.Id = v.RegisteredByUserId
    WHERE v.BranchId = @BranchId AND v.Status = 'InTreatment' AND v.IsDeleted = 0
    ORDER BY CASE v.TriageCategory WHEN 'Red' THEN 0 WHEN 'Yellow' THEN 1 ELSE 2 END, v.ArrivalTime;
END
GO

CREATE OR ALTER PROCEDURE sp_ErVisit_UpdateStatus
    @Id INT, @Status NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ErVisits SET Status = @Status WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_ErNurseAssessment_Insert
    @ErVisitId INT, @BloodPressure NVARCHAR(20) = NULL, @Pulse INT = NULL, @Temperature DECIMAL(5,2) = NULL,
    @RespiratoryRate INT = NULL, @SpO2 DECIMAL(5,2) = NULL, @PainScore INT = NULL, @GcsTotal INT = NULL,
    @InitialActions NVARCHAR(400) = NULL, @Remarks NVARCHAR(400) = NULL, @NurseUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ErNurseAssessments (
        ErVisitId, BloodPressure, Pulse, Temperature, RespiratoryRate, SpO2, PainScore, GcsTotal,
        InitialActions, Remarks, NurseUserId)
    VALUES (
        @ErVisitId, @BloodPressure, @Pulse, @Temperature, @RespiratoryRate, @SpO2, @PainScore, @GcsTotal,
        @InitialActions, @Remarks, @NurseUserId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_ErNurseAssessment_GetByVisit
    @ErVisitId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.ErVisitId, a.AssessedAt, u.Username AS NurseName, a.BloodPressure, a.Pulse, a.Temperature,
           a.RespiratoryRate, a.SpO2, a.PainScore, a.GcsTotal, a.InitialActions, a.Remarks
    FROM ErNurseAssessments a JOIN Users u ON u.Id = a.NurseUserId
    WHERE a.ErVisitId = @ErVisitId AND a.IsDeleted = 0
    ORDER BY a.AssessedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_ErDoctorAssessment_Insert
    @ErVisitId INT, @HistoryOfPresentIllness NVARCHAR(MAX) = NULL, @ExaminationFindings NVARCHAR(MAX) = NULL,
    @ProvisionalDiagnosis NVARCHAR(400) = NULL, @TreatmentGiven NVARCHAR(MAX) = NULL, @Disposition NVARCHAR(20),
    @Remarks NVARCHAR(400) = NULL, @DoctorId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ErDoctorAssessments (
        ErVisitId, HistoryOfPresentIllness, ExaminationFindings, ProvisionalDiagnosis, TreatmentGiven,
        Disposition, Remarks, DoctorId)
    VALUES (
        @ErVisitId, @HistoryOfPresentIllness, @ExaminationFindings, @ProvisionalDiagnosis, @TreatmentGiven,
        @Disposition, @Remarks, @DoctorId);

    -- The doctor's disposition is the source of truth for how the ER episode ends, so it also settles the
    -- visit's own status (mirrors what a receptionist/nurse can otherwise set via sp_ErVisit_UpdateStatus).
    UPDATE ErVisits
    SET Status = CASE @Disposition WHEN 'Admit' THEN 'Admitted' WHEN 'Discharge' THEN 'Discharged'
                                    WHEN 'LAMA' THEN 'LAMA' WHEN 'Refer' THEN 'Referred'
                                    WHEN 'DeceasedInEr' THEN 'DeceasedInEr' ELSE Status END
    WHERE Id = @ErVisitId;

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_ErDoctorAssessment_GetByVisit
    @ErVisitId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.ErVisitId, a.AssessedAt, doc.FullName AS DoctorName, a.HistoryOfPresentIllness,
           a.ExaminationFindings, a.ProvisionalDiagnosis, a.TreatmentGiven, a.Disposition, a.Remarks
    FROM ErDoctorAssessments a JOIN Doctors doc ON doc.Id = a.DoctorId
    WHERE a.ErVisitId = @ErVisitId AND a.IsDeleted = 0
    ORDER BY a.AssessedAt DESC;
END
GO
