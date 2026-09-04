USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   Multi-hospital / multi-branch hardening.

   Design:
   - Branches already belong to exactly one Hospital (Branches.HospitalId), so BranchId-based scoping is
     already hospital-safe by construction. This migration additionally stamps HospitalId directly onto
     the operational tables below so it's available without a join (for the JWT claim, reporting, and as
     defense-in-depth), and gives OpdVisits/Payments their own BranchId/HospitalId instead of relying on a
     join through Patients/Bills for every query.
   - Patients stay HOSPITAL-scoped (not branch-locked): the same patient can be treated at any branch of
     the hospital they first registered at, without creating a duplicate Patients row. Every visit/
     admission/appointment/bill still records exactly which branch performed it, for correct per-branch
     and per-receptionist revenue.
   - All changes are additive and backfilled - nothing existing is dropped or renamed, and every new
     column is nullable so already-running code paths keep working unchanged until each layer above is
     updated to populate/read it.
--------------------------------------------------------------------------- */

-- 1) Add HospitalId to every table that already has a BranchId, backfilled from Branches.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'HospitalId')
    ALTER TABLE Users ADD HospitalId INT NULL REFERENCES Hospitals(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'HospitalId')
    ALTER TABLE Employees ADD HospitalId INT NULL REFERENCES Hospitals(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Doctors') AND name = 'HospitalId')
    ALTER TABLE Doctors ADD HospitalId INT NULL REFERENCES Hospitals(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Patients') AND name = 'HospitalId')
    ALTER TABLE Patients ADD HospitalId INT NULL REFERENCES Hospitals(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Appointments') AND name = 'HospitalId')
    ALTER TABLE Appointments ADD HospitalId INT NULL REFERENCES Hospitals(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('IpdAdmissions') AND name = 'HospitalId')
    ALTER TABLE IpdAdmissions ADD HospitalId INT NULL REFERENCES Hospitals(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Bills') AND name = 'HospitalId')
    ALTER TABLE Bills ADD HospitalId INT NULL REFERENCES Hospitals(Id);
GO

UPDATE u SET u.HospitalId = br.HospitalId FROM Users u JOIN Branches br ON br.Id = u.BranchId WHERE u.HospitalId IS NULL;
UPDATE e SET e.HospitalId = br.HospitalId FROM Employees e JOIN Branches br ON br.Id = e.BranchId WHERE e.HospitalId IS NULL;
UPDATE d SET d.HospitalId = br.HospitalId FROM Doctors d JOIN Branches br ON br.Id = d.BranchId WHERE d.HospitalId IS NULL;
UPDATE p SET p.HospitalId = br.HospitalId FROM Patients p JOIN Branches br ON br.Id = p.BranchId WHERE p.HospitalId IS NULL;
UPDATE a SET a.HospitalId = br.HospitalId FROM Appointments a JOIN Branches br ON br.Id = a.BranchId WHERE a.HospitalId IS NULL;
UPDATE ip SET ip.HospitalId = br.HospitalId FROM IpdAdmissions ip JOIN Branches br ON br.Id = ip.BranchId WHERE ip.HospitalId IS NULL;
UPDATE bl SET bl.HospitalId = br.HospitalId FROM Bills bl JOIN Branches br ON br.Id = bl.BranchId WHERE bl.HospitalId IS NULL;
GO

-- 2) OpdVisits and Payments never had their own Branch/Hospital at all - they always required a join
--    through Patients/Bills for scoping. Give them real columns too, backfilled from that same parent.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('OpdVisits') AND name = 'BranchId')
    ALTER TABLE OpdVisits ADD BranchId INT NULL REFERENCES Branches(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('OpdVisits') AND name = 'HospitalId')
    ALTER TABLE OpdVisits ADD HospitalId INT NULL REFERENCES Hospitals(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Payments') AND name = 'BranchId')
    ALTER TABLE Payments ADD BranchId INT NULL REFERENCES Branches(Id);
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Payments') AND name = 'HospitalId')
    ALTER TABLE Payments ADD HospitalId INT NULL REFERENCES Hospitals(Id);
GO

UPDATE v SET v.BranchId = p.BranchId, v.HospitalId = p.HospitalId
FROM OpdVisits v JOIN Patients p ON p.Id = v.PatientId WHERE v.BranchId IS NULL;

UPDATE pay SET pay.BranchId = b.BranchId, pay.HospitalId = b.HospitalId
FROM Payments pay JOIN Bills b ON b.Id = pay.BillId WHERE pay.BranchId IS NULL;
GO

PRINT 'Multi-hospital isolation columns added and backfilled.';
