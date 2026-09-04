/* ============================================================================
   Incremental schema update: track which user registered a patient / booked an
   appointment, so a receptionist's dashboard can show revenue attributable to
   their own work today rather than the whole branch's total.
   Run once against an already-provisioned HMS_DB (01_Schema.sql already applied).
   Safe to re-run - guarded by IF NOT EXISTS.
   ============================================================================ */
USE HMS_DB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Patients') AND name = 'RegisteredByUserId')
BEGIN
    ALTER TABLE Patients ADD RegisteredByUserId INT NULL REFERENCES Users(Id);
    PRINT 'Added Patients.RegisteredByUserId.';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Appointments') AND name = 'BookedByUserId')
BEGIN
    ALTER TABLE Appointments ADD BookedByUserId INT NULL REFERENCES Users(Id);
    PRINT 'Added Appointments.BookedByUserId.';
END
GO
