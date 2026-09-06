USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   MODULE 18: CONSENT FORMS

   Digitizes the hospital's paper consent forms (General/Surgery/Anesthesia/
   Transfusion/LAMA + many procedure-specific bilingual consents such as
   URSL, Circumcision, Cystolithotripsy). Rather than one hardcoded table per
   procedure, ConsentTemplates holds the handful of distinct legal texts and
   ConsentRecords.ProcedureName carries the per-procedure variant, so adding a
   new procedure-specific consent never requires a schema change.
   --------------------------------------------------------------------------- */
CREATE TABLE ConsentTemplates (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    Code          NVARCHAR(50) NOT NULL UNIQUE,
    Title         NVARCHAR(200) NOT NULL,
    Category      NVARCHAR(30) NOT NULL,   -- Registration | Surgery | Anesthesia | Transfusion | LAMA | Procedure
    BodyText      NVARCHAR(MAX) NOT NULL,
    IsActive      BIT NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted     BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE ConsentRecords (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    HospitalId         INT NOT NULL REFERENCES Hospitals(Id),
    BranchId           INT NOT NULL REFERENCES Branches(Id),
    PatientId          INT NOT NULL REFERENCES Patients(Id),
    TemplateId         INT NOT NULL REFERENCES ConsentTemplates(Id),
    Context            NVARCHAR(20) NOT NULL,   -- Registration | OPD | IPD | Surgery
    ContextId          INT NULL,                -- e.g. IpdAdmissions.Id or Surgeries.Id, depending on Context
    ProcedureName      NVARCHAR(200) NULL,
    Decision           NVARCHAR(10) NOT NULL,   -- Accepted | Refused
    SignedByName       NVARCHAR(150) NOT NULL,
    RelationToPatient  NVARCHAR(50) NULL,       -- Self | Spouse | Parent | Guardian | ...
    WitnessName        NVARCHAR(150) NULL,
    WitnessUserId      INT NULL REFERENCES Users(Id),
    RefusalReason      NVARCHAR(400) NULL,
    Notes              NVARCHAR(400) NULL,
    RecordedByUserId   INT NOT NULL REFERENCES Users(Id),
    SignedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted          BIT NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_ConsentRecords_Patient ON ConsentRecords(PatientId);
CREATE INDEX IX_ConsentRecords_Hospital ON ConsentRecords(HospitalId);
GO

-- Seed the standard templates found across the paper forms. Administrator can add more via the Consents
-- screen (e.g. a bespoke procedure consent) without needing another migration.
INSERT INTO ConsentTemplates (Code, Title, Category, BodyText) VALUES
('GENERAL_CONSENT', 'General Consent for Treatment & Admission', 'Registration',
 N'I hereby consent to admission and to the medical, diagnostic and routine treatment procedures considered necessary by the treating team during my/the patient''s stay.'),
('SURGERY_CONSENT', 'Consent for Surgery / Procedure', 'Surgery',
 N'I have been explained the nature of the proposed surgery/procedure, its risks, benefits and alternatives, and I voluntarily consent to it being performed, including any additional procedures the surgical team considers necessary.'),
('ANESTHESIA_CONSENT', 'Consent for Anesthesia', 'Anesthesia',
 N'I have been explained the type of anesthesia planned, its risks and complications, and I voluntarily consent to the administration of anesthesia as deemed appropriate by the anesthetist.'),
('TRANSFUSION_CONSENT', 'Informed Consent for Blood / Blood Product Transfusion', 'Transfusion',
 N'I have been explained the need for, risks of and alternatives to blood/blood product transfusion, and I voluntarily consent to receive the same if required.'),
('TRANSFUSION_REFUSAL', 'Refusal of Blood / Blood Product Transfusion', 'Transfusion',
 N'I have been explained the risks of refusing blood/blood product transfusion, including risk to life, and I voluntarily refuse to receive the same.'),
('LAMA_CONSENT', 'Consent for Leaving Against Medical Advice', 'LAMA',
 N'I am leaving the hospital against the advice of the treating doctor, having been explained the risks involved including risk to life, and I take full responsibility for this decision.'),
('PROCEDURE_CONSENT', 'Procedure-Specific Consent', 'Procedure',
 N'I have been explained the nature, risks, benefits and alternatives of the specific procedure named below, and I voluntarily consent to it being performed.');
GO
