USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   SuperAdmin can now set a brand color per Hospital (Hospitals admin page),
   which repaints the whole app's brand-* palette for every staff/patient
   session belonging to that hospital. Nullable and additive - hospitals
   without one keep the app's default teal, exactly as before.
--------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Hospitals') AND name = 'ThemeColor')
    ALTER TABLE Hospitals ADD ThemeColor NVARCHAR(9) NULL;
GO
