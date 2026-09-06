USE HMS_DB;
GO
SET QUOTED_IDENTIFIER ON;
GO

/* ---------------------------------------------------------------------------
   MODULE 13 EXTENSION: OT / SURGERY PAPERWORK

   Digitizes the remaining OT paper forms - Pre-Operative Checklist, Operative
   Instruments & Swab Check Sheet, OT Cleaning Checklist, Anesthesia Monitoring
   Record, and the Post-Op Recovery Room Record (with Aldrete Score) - all
   scoped to an existing Surgeries row.
   --------------------------------------------------------------------------- */
CREATE TABLE SurgeryChecklists (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    SurgeryId          INT NOT NULL REFERENCES Surgeries(Id),
    ChecklistType      NVARCHAR(30) NOT NULL,   -- PreOp | InstrumentSwabCount | OTCleaning
    ItemsJson          NVARCHAR(MAX) NOT NULL,  -- JSON array of {label, checked, remarks}
    Remarks            NVARCHAR(400) NULL,
    CompletedByUserId  INT NOT NULL REFERENCES Users(Id),
    CompletedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted          BIT NOT NULL DEFAULT 0
);
GO

-- One checklist of each type per surgery - re-saving the same type updates the existing document instead
-- of piling up duplicates (see sp_SurgeryChecklist_Upsert).
CREATE UNIQUE INDEX UX_SurgeryChecklists_Surgery_Type ON SurgeryChecklists(SurgeryId, ChecklistType) WHERE IsDeleted = 0;
GO

CREATE TABLE SurgeryAnesthesiaRecords (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    SurgeryId          INT NOT NULL REFERENCES Surgeries(Id),
    RecordedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RecordedByUserId   INT NOT NULL REFERENCES Users(Id),
    AnesthesiaType     NVARCHAR(100) NULL,
    BloodPressure      NVARCHAR(20) NULL,
    PulseRate          INT NULL,
    SpO2               DECIMAL(5,2) NULL,
    Temperature        DECIMAL(5,2) NULL,
    Remarks            NVARCHAR(400) NULL,
    IsDeleted          BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE SurgeryRecoveryRecords (
    Id                       INT IDENTITY(1,1) PRIMARY KEY,
    SurgeryId                INT NOT NULL REFERENCES Surgeries(Id),
    RecordedAt               DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RecordedByUserId         INT NOT NULL REFERENCES Users(Id),
    Activity                 INT NOT NULL,  -- Aldrete components, each scored 0-2
    Respiration              INT NOT NULL,
    Circulation              INT NOT NULL,
    Consciousness            INT NOT NULL,
    OxygenSaturation         INT NOT NULL,
    BloodPressure            NVARCHAR(20) NULL,
    Pulse                    INT NULL,
    SpO2                     DECIMAL(5,2) NULL,
    Remarks                  NVARCHAR(400) NULL,
    DischargedFromRecoveryAt DATETIME2 NULL,
    IsDeleted                BIT NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_SurgeryAnesthesiaRecords_Surgery ON SurgeryAnesthesiaRecords(SurgeryId);
CREATE INDEX IX_SurgeryRecoveryRecords_Surgery ON SurgeryRecoveryRecords(SurgeryId);
GO
