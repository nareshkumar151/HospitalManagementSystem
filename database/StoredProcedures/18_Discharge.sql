USE HMS_DB;
GO

/* Creates the discharge summary and, in the same transaction, marks the admission Discharged and frees the bed
   (mirrors "Bill Settlement -> Discharge Summary" in the SRS workflow diagram). */
CREATE OR ALTER PROCEDURE sp_DischargeSummary_Create
    @IpdAdmissionId INT, @TreatingDoctorId INT, @Diagnosis NVARCHAR(1000), @ChiefComplaint NVARCHAR(1000) = NULL,
    @PastHistory NVARCHAR(1000) = NULL, @PhysicalExamination NVARCHAR(1000) = NULL, @Investigation NVARCHAR(1000) = NULL,
    @CourseInHospital NVARCHAR(MAX) = NULL, @ConditionAtDischarge NVARCHAR(400), @MedicinesAdvised NVARCHAR(1000) = NULL,
    @DietAdvice NVARCHAR(400) = NULL, @FollowUpDate DATE = NULL, @DoctorDigitalSignature NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    INSERT INTO DischargeSummaries (IpdAdmissionId, TreatingDoctorId, Diagnosis, ChiefComplaint, PastHistory,
        PhysicalExamination, Investigation, CourseInHospital, ConditionAtDischarge, MedicinesAdvised, DietAdvice,
        FollowUpDate, DoctorDigitalSignature)
    VALUES (@IpdAdmissionId, @TreatingDoctorId, @Diagnosis, @ChiefComplaint, @PastHistory,
        @PhysicalExamination, @Investigation, @CourseInHospital, @ConditionAtDischarge, @MedicinesAdvised, @DietAdvice,
        @FollowUpDate, @DoctorDigitalSignature);
    DECLARE @NewId INT = CAST(SCOPE_IDENTITY() AS INT);

    DECLARE @BedId INT = (SELECT BedId FROM IpdAdmissions WHERE Id = @IpdAdmissionId);
    UPDATE IpdAdmissions SET Status = 'Discharged', DischargeDate = SYSUTCDATETIME(), UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @IpdAdmissionId;
    UPDATE Beds SET Status = 'Available' WHERE Id = @BedId;

    COMMIT TRANSACTION;
    SELECT @NewId AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_DischargeSummary_GetByAdmission
    @IpdAdmissionId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT d.Id, d.IpdAdmissionId, p.FullName AS PatientName, d.TreatingDoctorId, doc.FullName AS DoctorName,
           d.Diagnosis, d.ChiefComplaint, d.PastHistory, d.PhysicalExamination, d.Investigation, d.CourseInHospital,
           d.ConditionAtDischarge, d.MedicinesAdvised, d.DietAdvice, d.FollowUpDate, d.DischargedAt, d.DoctorDigitalSignature
    FROM DischargeSummaries d
    JOIN IpdAdmissions a ON a.Id = d.IpdAdmissionId
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = d.TreatingDoctorId
    WHERE d.IpdAdmissionId = @IpdAdmissionId AND d.IsDeleted = 0;
END
GO
