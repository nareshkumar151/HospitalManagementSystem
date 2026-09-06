USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   MODULE 20: BLOOD BANK - Transfusion Reaction Form
   --------------------------------------------------------------------------- */
CREATE TABLE TransfusionReactions (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    PatientId           INT NOT NULL REFERENCES Patients(Id),
    IpdAdmissionId      INT NULL REFERENCES IpdAdmissions(Id),
    BloodGroup          NVARCHAR(15) NULL,
    ComponentTransfused NVARCHAR(30) NOT NULL,  -- WholeBlood | PRBC | FFP | Platelets | Cryoprecipitate
    UnitsTransfused     DECIMAL(5,2) NULL,
    ReactionType        NVARCHAR(30) NOT NULL,  -- Allergic | Febrile | Hemolytic | Anaphylactic | TRALI | Other
    Symptoms            NVARCHAR(400) NULL,
    OnsetTime           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ActionTaken         NVARCHAR(400) NULL,
    Outcome             NVARCHAR(20) NOT NULL DEFAULT 'Ongoing', -- Resolved | Ongoing | Fatal
    Remarks             NVARCHAR(400) NULL,
    ReportedByUserId    INT NOT NULL REFERENCES Users(Id),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   MODULE 21: NEPHROLOGY / DIALYSIS - Dialysis Record
   --------------------------------------------------------------------------- */
CREATE TABLE DialysisSessions (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    PatientId           INT NOT NULL REFERENCES Patients(Id),
    IpdAdmissionId      INT NULL REFERENCES IpdAdmissions(Id),
    SessionDate         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DialysisType        NVARCHAR(20) NOT NULL,  -- Hemodialysis | Peritoneal
    DurationMinutes     INT NULL,
    PreWeight           DECIMAL(6,2) NULL,
    PostWeight          DECIMAL(6,2) NULL,
    PreBloodPressure    NVARCHAR(20) NULL,
    PostBloodPressure   NVARCHAR(20) NULL,
    DialyzerType        NVARCHAR(100) NULL,
    BloodFlowRate       DECIMAL(6,2) NULL,
    UfGoal              DECIMAL(6,2) NULL,
    UfAchieved          DECIMAL(6,2) NULL,
    Complications       NVARCHAR(400) NULL,
    Remarks             NVARCHAR(400) NULL,
    PerformedByUserId   INT NOT NULL REFERENCES Users(Id),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   MODULE 22: NUTRITION / DIETETICS - Initial Assessment by Nutrition
   --------------------------------------------------------------------------- */
CREATE TABLE NutritionAssessments (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    PatientId           INT NOT NULL REFERENCES Patients(Id),
    IpdAdmissionId      INT NULL REFERENCES IpdAdmissions(Id),
    AssessedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    HeightCm            DECIMAL(5,2) NULL,
    WeightKg            DECIMAL(6,2) NULL,
    DietType            NVARCHAR(30) NOT NULL,  -- Normal | Diabetic | Renal | Liquid | SoftDiet | HighProtein | Other
    NutritionalRisk     NVARCHAR(10) NOT NULL DEFAULT 'Low', -- Low | Medium | High
    DietaryHistory      NVARCHAR(400) NULL,
    Allergies           NVARCHAR(400) NULL,
    Recommendations     NVARCHAR(400) NULL,
    ReassessmentDate    DATETIME2 NULL,
    AssessedByUserId    INT NOT NULL REFERENCES Users(Id),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_TransfusionReactions_Patient ON TransfusionReactions(PatientId);
CREATE INDEX IX_DialysisSessions_Patient ON DialysisSessions(PatientId);
CREATE INDEX IX_NutritionAssessments_Patient ON NutritionAssessments(PatientId);
GO
