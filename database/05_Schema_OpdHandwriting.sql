/* ============================================================================
   Incremental schema update: widen OpdVisits.Symptoms/Diagnosis to NVARCHAR(MAX)
   so a stylus/handwriting capture (saved as a data:image/png;base64,... string)
   fits alongside typed text. ClinicalNotes/DoctorNotes were already MAX.
   Run once against an already-provisioned HMS_DB (01_Schema.sql already applied).
   Safe to re-run - ALTER COLUMN is idempotent (widening to the same type is a no-op).
   ============================================================================ */
USE HMS_DB;
GO

ALTER TABLE OpdVisits ALTER COLUMN Symptoms NVARCHAR(MAX) NULL;
GO
ALTER TABLE OpdVisits ALTER COLUMN Diagnosis NVARCHAR(MAX) NULL;
GO

PRINT 'OpdVisits.Symptoms / Diagnosis widened to NVARCHAR(MAX).';
GO
