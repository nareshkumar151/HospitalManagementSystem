/* ============================================================================
   Incremental schema update: widen ConsentRecords.SignedByName to NVARCHAR(MAX)
   so a stylus/handwriting capture (saved as a data:image/png;base64,... string,
   same convention as OpdVisits.Symptoms/Diagnosis - see 05_Schema_OpdHandwriting.sql)
   fits alongside a typed name. Lets the patient or family member who's actually
   signing draw their real signature instead of only typing their name.
   Run once against an already-provisioned HMS_DB (01_Schema.sql already applied).
   Safe to re-run - ALTER COLUMN is idempotent (widening to the same type is a no-op).
   ============================================================================ */
USE HMS_DB;
GO

ALTER TABLE ConsentRecords ALTER COLUMN SignedByName NVARCHAR(MAX) NOT NULL;
GO

PRINT 'ConsentRecords.SignedByName widened to NVARCHAR(MAX).';
GO
