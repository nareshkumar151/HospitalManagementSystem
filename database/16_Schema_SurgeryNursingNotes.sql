USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   OT paperwork extension: Nursing Notes.

   A chronological, append-only log a nurse keeps against a scheduled surgery
   (separate from the Anesthesia Monitoring / Recovery records, which are the
   anesthetist's and recovery-room readings) - e.g. "patient positioned",
   "counts confirmed with surgeon", "specimen handed to lab". NoteText is
   NVARCHAR(MAX) so it can hold a HandwritingField capture (stylus signature/
   drawing stored as a data:image/png;base64,... string) as well as typed text,
   matching the convention set by 05_Schema_OpdHandwriting.sql.
   --------------------------------------------------------------------------- */
CREATE TABLE SurgeryNursingNotes (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    SurgeryId          INT NOT NULL REFERENCES Surgeries(Id),
    RecordedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    RecordedByUserId   INT NOT NULL REFERENCES Users(Id),
    NoteText           NVARCHAR(MAX) NOT NULL,
    IsDeleted          BIT NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_SurgeryNursingNotes_Surgery ON SurgeryNursingNotes(SurgeryId);
GO
