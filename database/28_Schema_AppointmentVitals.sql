/* ============================================================================
   Incremental schema update: let a nurse record vitals against an OPD
   Appointment, not just an IPD admission's ongoing chart.

   NursingCharts.IpdAdmissionId was NOT NULL - every vitals row had to belong
   to an admission. Adds AppointmentId (nullable) alongside it, makes
   IpdAdmissionId nullable too, and a check constraint keeps exactly one of
   the two set per row - an OPD appointment's vitals are never mixed up with
   an IPD admission's chart.

   Unlike the IPD chart (a running log - one row per reading over a multi-day
   stay), an appointment's vitals are a single editable snapshot taken at
   check-in - see sp_NursingChart_UpsertForAppointment, which updates the
   existing row for that appointment instead of always inserting a new one.

   Run once against an already-provisioned HMS_DB (01_Schema.sql already
   applied). Safe to re-run - every step below is idempotent.
   ============================================================================ */
USE HMS_DB;
GO
-- Required for the filtered unique index below (same requirement noted in 27_SurgeryRecords.sql).
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('NursingCharts') AND name = 'AppointmentId')
    ALTER TABLE NursingCharts ADD AppointmentId INT NULL REFERENCES Appointments(Id);
GO

ALTER TABLE NursingCharts ALTER COLUMN IpdAdmissionId INT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_NursingCharts_OneContext')
    ALTER TABLE NursingCharts ADD CONSTRAINT CK_NursingCharts_OneContext
        CHECK ((IpdAdmissionId IS NOT NULL AND AppointmentId IS NULL) OR (IpdAdmissionId IS NULL AND AppointmentId IS NOT NULL));
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_NursingCharts_Appointment')
    CREATE UNIQUE INDEX IX_NursingCharts_Appointment ON NursingCharts(AppointmentId) WHERE AppointmentId IS NOT NULL;
GO

PRINT 'NursingCharts.AppointmentId added; IpdAdmissionId now nullable.';
GO
