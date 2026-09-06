USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   MODULE 19: EMERGENCY (ER)

   A walk-in/ambulance case triaged at the ER desk before OPD/IPD registration -
   digitizes the ER Doctor Assessment and ER Nurses Assessment paper forms.
   --------------------------------------------------------------------------- */
CREATE TABLE ErVisits (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    PatientId          INT NOT NULL REFERENCES Patients(Id),
    BranchId           INT NOT NULL REFERENCES Branches(Id),
    HospitalId         INT NOT NULL REFERENCES Hospitals(Id),
    ArrivalTime        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ModeOfArrival      NVARCHAR(20) NULL,   -- WalkIn | Ambulance | Referred
    BroughtBy          NVARCHAR(150) NULL,
    ChiefComplaint     NVARCHAR(400) NOT NULL,
    TriageCategory     NVARCHAR(10) NOT NULL DEFAULT 'Yellow',  -- Red | Yellow | Green
    Status             NVARCHAR(20) NOT NULL DEFAULT 'InTreatment', -- InTreatment | Admitted | Discharged | LAMA | Referred | DeceasedInEr
    RegisteredByUserId INT NOT NULL REFERENCES Users(Id),
    CreatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted          BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE ErNurseAssessments (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    ErVisitId          INT NOT NULL REFERENCES ErVisits(Id),
    NurseUserId        INT NOT NULL REFERENCES Users(Id),
    AssessedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    BloodPressure      NVARCHAR(20) NULL,
    Pulse              INT NULL,
    Temperature        DECIMAL(5,2) NULL,
    RespiratoryRate    INT NULL,
    SpO2               DECIMAL(5,2) NULL,
    PainScore          INT NULL,
    GcsTotal           INT NULL,
    InitialActions     NVARCHAR(400) NULL,
    Remarks            NVARCHAR(400) NULL,
    IsDeleted          BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE ErDoctorAssessments (
    Id                       INT IDENTITY(1,1) PRIMARY KEY,
    ErVisitId                INT NOT NULL REFERENCES ErVisits(Id),
    DoctorId                 INT NOT NULL REFERENCES Doctors(Id),
    AssessedAt               DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    HistoryOfPresentIllness  NVARCHAR(MAX) NULL,
    ExaminationFindings      NVARCHAR(MAX) NULL,
    ProvisionalDiagnosis     NVARCHAR(400) NULL,
    TreatmentGiven           NVARCHAR(MAX) NULL,
    Disposition              NVARCHAR(20) NOT NULL,  -- Admit | Discharge | LAMA | Refer | DeceasedInEr
    Remarks                  NVARCHAR(400) NULL,
    IsDeleted                BIT NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_ErVisits_Branch_Status ON ErVisits(BranchId, Status);
CREATE INDEX IX_ErNurseAssessments_Visit ON ErNurseAssessments(ErVisitId);
CREATE INDEX IX_ErDoctorAssessments_Visit ON ErDoctorAssessments(ErVisitId);
GO

/* ---------------------------------------------------------------------------
   NURSING CLINICAL CHART - early-warning log fields (MEWS/PEWS-style)
   --------------------------------------------------------------------------- */
ALTER TABLE NursingCharts ADD
    RespiratoryRate    INT NULL,
    PainScore          INT NULL,
    Consciousness      NVARCHAR(15) NULL,  -- AVPU: Alert | Verbal | Pain | Unresponsive
    EarlyWarningScore  INT NULL;
GO
