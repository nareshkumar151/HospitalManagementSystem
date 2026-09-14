USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   IPD/Admissions widget: a doctor's own running note against the admission
   (separate from the discharge summary and from OpdVisit.DoctorNotes, which
   belongs to a single OPD visit, not an ongoing inpatient stay). A single
   editable field - overwritten in place each save (see
   sp_IpdAdmission_UpdateDoctorNotes), not an append-only log - matching the
   "(editable option)" the paper mock calls out.

   NVARCHAR(MAX) from the start so it can hold a HandwritingField stylus
   capture (data:image/png;base64,...) as well as typed text, per the
   convention set by 05_Schema_OpdHandwriting.sql.
   --------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('IpdAdmissions') AND name = 'DoctorNotes')
    ALTER TABLE IpdAdmissions ADD DoctorNotes NVARCHAR(MAX) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('IpdAdmissions') AND name = 'DoctorNotesUpdatedAt')
    ALTER TABLE IpdAdmissions ADD DoctorNotesUpdatedAt DATETIME2 NULL;
GO

PRINT 'IpdAdmissions.DoctorNotes/DoctorNotesUpdatedAt added.';
GO
