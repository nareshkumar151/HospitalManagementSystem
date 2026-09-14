USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   Lets a doctor hand-write (stylus) any field of an ER Doctor Assessment, not
   just type it - same convention as 05_Schema_OpdHandwriting.sql: a captured
   signature/drawing is a data:image/png;base64,... string stored in the same
   text column a typed value would use, so every free-text field that may hold
   one needs to be NVARCHAR(MAX). HistoryOfPresentIllness/ExaminationFindings/
   TreatmentGiven were already NVARCHAR(MAX); ProvisionalDiagnosis and Remarks
   were NVARCHAR(400) - too small for a captured image - so widen those two.

   Safe to re-run - ALTER COLUMN to the same type is a no-op.
   --------------------------------------------------------------------------- */
ALTER TABLE ErDoctorAssessments ALTER COLUMN ProvisionalDiagnosis NVARCHAR(MAX) NULL;
GO
ALTER TABLE ErDoctorAssessments ALTER COLUMN Remarks NVARCHAR(MAX) NULL;
GO

PRINT 'ErDoctorAssessments.ProvisionalDiagnosis/Remarks widened to NVARCHAR(MAX).';
GO
