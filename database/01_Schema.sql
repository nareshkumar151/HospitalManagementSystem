/* ============================================================================
   Hospital Management System - Database Schema
   Target: SQL Server on DESKTOP-HALGV0I (Windows Authentication)
   Run order: 01_Schema.sql, then all files under 02_StoredProcedures, then 03_Seed.sql
   ============================================================================ */

IF DB_ID('HMS_DB') IS NULL
BEGIN
    CREATE DATABASE HMS_DB;
END
GO

USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   1. ORGANIZATION (Multi Hospital / Multi Branch / Multi Department)
   --------------------------------------------------------------------------- */
CREATE TABLE Hospitals (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    Name                NVARCHAR(200)   NOT NULL,
    RegistrationNumber  NVARCHAR(100)   NOT NULL,
    Address             NVARCHAR(400)   NOT NULL,
    ContactNumber       NVARCHAR(20)    NOT NULL,
    Email               NVARCHAR(150)   NULL,
    LogoUrl             NVARCHAR(400)   NULL,
    CreatedAt           DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy           NVARCHAR(100)   NULL,
    UpdatedAt           DATETIME2       NULL,
    UpdatedBy           NVARCHAR(100)   NULL,
    IsDeleted           BIT             NOT NULL DEFAULT 0
);
GO

CREATE TABLE Branches (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    HospitalId      INT NOT NULL REFERENCES Hospitals(Id),
    Name            NVARCHAR(200) NOT NULL,
    Address         NVARCHAR(400) NOT NULL,
    City            NVARCHAR(100) NOT NULL,
    ContactNumber   NVARCHAR(20)  NOT NULL,
    IsActive        BIT NOT NULL DEFAULT 1,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy       NVARCHAR(100) NULL,
    UpdatedAt       DATETIME2 NULL,
    UpdatedBy       NVARCHAR(100) NULL,
    IsDeleted       BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE Departments (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    BranchId     INT NOT NULL REFERENCES Branches(Id),
    Name         NVARCHAR(150) NOT NULL,
    Description  NVARCHAR(400) NULL,
    IsActive     BIT NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy    NVARCHAR(100) NULL,
    UpdatedAt    DATETIME2 NULL,
    UpdatedBy    NVARCHAR(100) NULL,
    IsDeleted    BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   2. IDENTITY / RBAC
   --------------------------------------------------------------------------- */
CREATE TABLE Roles (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Name         NVARCHAR(50)  NOT NULL UNIQUE, -- matches RoleName enum
    Description  NVARCHAR(200) NULL,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted    BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE Users (
    Id                    INT IDENTITY(1,1) PRIMARY KEY,
    Username              NVARCHAR(50)  NOT NULL UNIQUE,
    Email                 NVARCHAR(150) NOT NULL UNIQUE,
    PasswordHash          NVARCHAR(300) NOT NULL,
    RoleId                INT NOT NULL REFERENCES Roles(Id),
    RoleName              NVARCHAR(50) NOT NULL,
    LinkedProfileId       INT NULL,     -- points to Doctors.Id / Employees.Id / Patients.Id depending on RoleName
    BranchId              INT NULL REFERENCES Branches(Id),
    IsActive              BIT NOT NULL DEFAULT 1,
    LastLoginAt           DATETIME2 NULL,
    FailedLoginAttempts   INT NOT NULL DEFAULT 0,
    LockedUntil           DATETIME2 NULL,
    CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy             NVARCHAR(100) NULL,
    UpdatedAt             DATETIME2 NULL,
    UpdatedBy             NVARCHAR(100) NULL,
    IsDeleted             BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE RefreshTokens (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    UserId             INT NOT NULL REFERENCES Users(Id),
    Token              NVARCHAR(500) NOT NULL,
    ExpiresAt          DATETIME2 NOT NULL,
    RevokedAt          DATETIME2 NULL,
    ReplacedByToken    NVARCHAR(500) NULL,
    CreatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted          BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_RefreshTokens_Token ON RefreshTokens(Token);
GO

CREATE TABLE AuditLogs (
    Id         BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId     INT NULL,
    Username   NVARCHAR(50) NULL,
    Action     NVARCHAR(100) NOT NULL,
    Entity     NVARCHAR(100) NOT NULL,
    EntityId   NVARCHAR(50) NULL,
    Details    NVARCHAR(MAX) NULL,
    IpAddress  NVARCHAR(50) NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------------------------------------------------------------------------
   3. DOCTORS / EMPLOYEES
   --------------------------------------------------------------------------- */
CREATE TABLE Doctors (
    Id                    INT IDENTITY(1,1) PRIMARY KEY,
    DoctorCode            NVARCHAR(30) NOT NULL UNIQUE,
    FullName              NVARCHAR(150) NOT NULL,
    DepartmentId          INT NOT NULL REFERENCES Departments(Id),
    Qualification         NVARCHAR(200) NOT NULL,
    ExperienceYears       INT NOT NULL DEFAULT 0,
    ConsultationFee       DECIMAL(10,2) NOT NULL DEFAULT 0,
    AvailableDays         NVARCHAR(100) NULL,
    Mobile                NVARCHAR(20) NULL,
    Email                 NVARCHAR(150) NULL,
    DigitalSignatureUrl   NVARCHAR(400) NULL,
    BranchId              INT NOT NULL REFERENCES Branches(Id),
    IsActive              BIT NOT NULL DEFAULT 1,
    CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy             NVARCHAR(100) NULL,
    UpdatedAt             DATETIME2 NULL,
    UpdatedBy             NVARCHAR(100) NULL,
    IsDeleted             BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE Employees (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeCode      NVARCHAR(30) NOT NULL UNIQUE,
    FullName          NVARCHAR(150) NOT NULL,
    DepartmentId      INT NOT NULL REFERENCES Departments(Id),
    Designation       NVARCHAR(100) NOT NULL,
    Salary            DECIMAL(12,2) NOT NULL DEFAULT 0,
    JoiningDate       DATE NOT NULL,
    Shift             NVARCHAR(50) NOT NULL,
    Contact           NVARCHAR(20) NOT NULL,
    EmailId           NVARCHAR(150) NOT NULL,
    EmergencyContact  NVARCHAR(20) NULL,
    BranchId          INT NOT NULL REFERENCES Branches(Id),
    IsActive          BIT NOT NULL DEFAULT 1,
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy         NVARCHAR(100) NULL,
    UpdatedAt         DATETIME2 NULL,
    UpdatedBy         NVARCHAR(100) NULL,
    IsDeleted         BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   4. PATIENTS
   --------------------------------------------------------------------------- */
CREATE TABLE Patients (
    Id                        INT IDENTITY(1,1) PRIMARY KEY,
    UHID                      NVARCHAR(30) NOT NULL UNIQUE,
    AadhaarNumber             NVARCHAR(12) NULL,
    FullName                  NVARCHAR(150) NOT NULL,
    Gender                    NVARCHAR(10) NOT NULL,
    DateOfBirth               DATE NULL,
    Age                       INT NULL,
    Mobile                    NVARCHAR(20) NOT NULL,
    Email                     NVARCHAR(150) NULL,
    Address                   NVARCHAR(400) NULL,
    BloodGroup                NVARCHAR(15) NOT NULL DEFAULT 'Unknown',
    EmergencyContactName      NVARCHAR(150) NULL,
    EmergencyContactNumber    NVARCHAR(20) NULL,
    ReferredByDoctorName      NVARCHAR(150) NULL,
    ReferralHospital          NVARCHAR(200) NULL,
    ReferralNotes             NVARCHAR(400) NULL,
    InsuranceCompany          NVARCHAR(150) NULL,
    InsurancePolicyNumber     NVARCHAR(100) NULL,
    Allergies                 NVARCHAR(400) NULL,
    BranchId                  INT NOT NULL REFERENCES Branches(Id),
    RegisteredByUserId        INT NULL REFERENCES Users(Id), -- front-desk attribution for the receptionist's own-revenue dashboard tile
    CreatedAt                 DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy                 NVARCHAR(100) NULL,
    UpdatedAt                 DATETIME2 NULL,
    UpdatedBy                 NVARCHAR(100) NULL,
    IsDeleted                 BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Patients_Mobile ON Patients(Mobile);
CREATE INDEX IX_Patients_FullName ON Patients(FullName);
GO

/* ---------------------------------------------------------------------------
   5. APPOINTMENTS
   --------------------------------------------------------------------------- */
CREATE TABLE Appointments (
    Id                      INT IDENTITY(1,1) PRIMARY KEY,
    PatientId               INT NOT NULL REFERENCES Patients(Id),
    DoctorId                INT NOT NULL REFERENCES Doctors(Id),
    DepartmentId            INT NOT NULL REFERENCES Departments(Id),
    AppointmentDate         DATE NOT NULL,
    TimeSlot                NVARCHAR(20) NOT NULL,
    TokenNumber             INT NOT NULL,
    Type                    NVARCHAR(20) NOT NULL,
    Status                  NVARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    RescheduledFromSlot     NVARCHAR(20) NULL,
    CancellationReason      NVARCHAR(300) NULL,
    BranchId                INT NOT NULL REFERENCES Branches(Id),
    BookedByUserId          INT NULL REFERENCES Users(Id), -- front-desk attribution for the receptionist's own-revenue dashboard tile; null for patient self-bookings
    CreatedAt               DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy               NVARCHAR(100) NULL,
    UpdatedAt               DATETIME2 NULL,
    UpdatedBy               NVARCHAR(100) NULL,
    IsDeleted               BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Appointments_DoctorDate ON Appointments(DoctorId, AppointmentDate);
CREATE INDEX IX_Appointments_PatientId ON Appointments(PatientId);
GO

/* ---------------------------------------------------------------------------
   6. OPD (Consultation + Management)
   --------------------------------------------------------------------------- */
CREATE TABLE OpdVisits (
    Id                        INT IDENTITY(1,1) PRIMARY KEY,
    OpdVisitNumber            NVARCHAR(30) NOT NULL UNIQUE,
    AppointmentId             INT NOT NULL REFERENCES Appointments(Id),
    PatientId                 INT NOT NULL REFERENCES Patients(Id),
    DoctorId                  INT NOT NULL REFERENCES Doctors(Id),
    ConsultationFee           DECIMAL(10,2) NOT NULL DEFAULT 0,
    IsFreeFollowUp            BIT NOT NULL DEFAULT 0,
    Symptoms                  NVARCHAR(MAX) NULL, -- plain text OR a data:image/png;base64,... handwriting capture
    Diagnosis                 NVARCHAR(MAX) NULL, -- plain text OR a data:image/png;base64,... handwriting capture
    ClinicalNotes             NVARCHAR(MAX) NULL, -- plain text OR a data:image/png;base64,... handwriting capture
    DoctorNotes               NVARCHAR(MAX) NULL,
    AdmissionRecommended      BIT NOT NULL DEFAULT 0,
    ReferredToDepartmentId    INT NULL REFERENCES Departments(Id),
    TransferNotes             NVARCHAR(400) NULL,
    VisitDateTime             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt                 DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy                 NVARCHAR(100) NULL,
    UpdatedAt                 DATETIME2 NULL,
    UpdatedBy                 NVARCHAR(100) NULL,
    IsDeleted                 BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_OpdVisits_PatientId ON OpdVisits(PatientId);
CREATE INDEX IX_OpdVisits_DoctorId ON OpdVisits(DoctorId);
GO

CREATE TABLE OpdNursingNotes (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    OpdVisitId    INT NOT NULL REFERENCES OpdVisits(Id),
    NurseUserId   INT NOT NULL REFERENCES Users(Id),
    Temperature   DECIMAL(5,2) NULL,
    Pulse         INT NULL,
    BloodPressure NVARCHAR(20) NULL,
    Oxygen        DECIMAL(5,2) NULL,
    Weight        DECIMAL(6,2) NULL,
    SugarLevel    DECIMAL(6,2) NULL,
    Notes         NVARCHAR(400) NULL,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted     BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   7. PRESCRIPTIONS
   --------------------------------------------------------------------------- */
CREATE TABLE Prescriptions (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    PatientId         INT NOT NULL REFERENCES Patients(Id),
    DoctorId          INT NOT NULL REFERENCES Doctors(Id),
    OpdVisitId        INT NULL REFERENCES OpdVisits(Id),
    IpdAdmissionId    INT NULL, -- FK added after IpdAdmissions table is created
    PrescribedDate    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Status            NVARCHAR(20) NOT NULL DEFAULT 'Active',
    DigitalSignature  NVARCHAR(400) NULL,
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted         BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE PrescriptionItems (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    PrescriptionId    INT NOT NULL REFERENCES Prescriptions(Id),
    MedicineId        INT NOT NULL, -- FK added after Medicines table is created
    Dosage            NVARCHAR(100) NOT NULL,
    Frequency         NVARCHAR(100) NOT NULL,
    DurationDays      INT NOT NULL,
    Instructions      NVARCHAR(300) NULL
);
GO

/* ---------------------------------------------------------------------------
   8. BED MANAGEMENT
   --------------------------------------------------------------------------- */
CREATE TABLE Wards (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    Name       NVARCHAR(100) NOT NULL,
    Type       NVARCHAR(20) NOT NULL,
    BranchId   INT NOT NULL REFERENCES Branches(Id),
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted  BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE Rooms (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    WardId        INT NOT NULL REFERENCES Wards(Id),
    RoomNumber    NVARCHAR(20) NOT NULL,
    Type          NVARCHAR(20) NOT NULL,
    DailyCharge   DECIMAL(10,2) NOT NULL DEFAULT 0,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted     BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE Beds (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    RoomId      INT NOT NULL REFERENCES Rooms(Id),
    BedNumber   NVARCHAR(20) NOT NULL,
    Status      NVARCHAR(20) NOT NULL DEFAULT 'Available',
    IsIcu       BIT NOT NULL DEFAULT 0,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted   BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   9. IPD ADMISSIONS
   --------------------------------------------------------------------------- */
CREATE TABLE IpdAdmissions (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    AdmissionNumber     NVARCHAR(30) NOT NULL UNIQUE,
    PatientId           INT NOT NULL REFERENCES Patients(Id),
    DoctorId            INT NOT NULL REFERENCES Doctors(Id),
    NurseUserId         INT NULL REFERENCES Users(Id),
    BedId               INT NOT NULL REFERENCES Beds(Id),
    AdmissionDate       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    AdmissionType       NVARCHAR(30) NOT NULL,
    Status              NVARCHAR(20) NOT NULL DEFAULT 'Admitted',
    ReasonForAdmission  NVARCHAR(400) NULL,
    DischargeDate       DATETIME2 NULL,
    BranchId            INT NOT NULL REFERENCES Branches(Id),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy           NVARCHAR(100) NULL,
    UpdatedAt           DATETIME2 NULL,
    UpdatedBy           NVARCHAR(100) NULL,
    IsDeleted           BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_IpdAdmissions_PatientId ON IpdAdmissions(PatientId);
GO

ALTER TABLE Prescriptions ADD CONSTRAINT FK_Prescriptions_IpdAdmissions FOREIGN KEY (IpdAdmissionId) REFERENCES IpdAdmissions(Id);
GO

/* ---------------------------------------------------------------------------
   10. NURSING MODULE
   --------------------------------------------------------------------------- */
CREATE TABLE NursingCharts (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    IpdAdmissionId      INT NOT NULL REFERENCES IpdAdmissions(Id),
    NurseUserId         INT NOT NULL REFERENCES Users(Id),
    RecordedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Temperature         DECIMAL(5,2) NULL,
    Pulse               INT NULL,
    BloodPressure       NVARCHAR(20) NULL,
    Oxygen              DECIMAL(5,2) NULL,
    Weight              DECIMAL(6,2) NULL,
    SugarLevel          DECIMAL(6,2) NULL,
    MedicationSchedule  NVARCHAR(400) NULL,
    DailyNotes          NVARCHAR(MAX) NULL,
    PatientMonitoring   NVARCHAR(MAX) NULL,
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_NursingCharts_Admission ON NursingCharts(IpdAdmissionId);
GO

CREATE TABLE NursingRequests (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    IpdAdmissionId    INT NOT NULL REFERENCES IpdAdmissions(Id),
    NurseUserId       INT NOT NULL REFERENCES Users(Id),
    RequestType       NVARCHAR(30) NOT NULL,
    Details           NVARCHAR(400) NOT NULL,
    Status            NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted         BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   11. LABORATORY
   --------------------------------------------------------------------------- */
CREATE TABLE LabTestCatalog (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    TestName     NVARCHAR(150) NOT NULL,
    Category     NVARCHAR(50) NOT NULL,
    Price        DECIMAL(10,2) NOT NULL DEFAULT 0,
    NormalRange  NVARCHAR(200) NULL,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted    BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE LabTestOrders (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    PatientId           INT NOT NULL REFERENCES Patients(Id),
    DoctorId            INT NOT NULL REFERENCES Doctors(Id),
    LabTestCatalogId    INT NOT NULL REFERENCES LabTestCatalog(Id),
    OpdVisitId          INT NULL REFERENCES OpdVisits(Id),
    IpdAdmissionId      INT NULL REFERENCES IpdAdmissions(Id),
    Status              NVARCHAR(30) NOT NULL DEFAULT 'Ordered',
    OrderedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SampleCollectedAt   DATETIME2 NULL,
    CollectedByUserId   INT NULL REFERENCES Users(Id),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_LabTestOrders_PatientId ON LabTestOrders(PatientId);
GO

CREATE TABLE LabReports (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    LabTestOrderId      INT NOT NULL REFERENCES LabTestOrders(Id),
    ResultSummary       NVARCHAR(MAX) NULL,
    ReportFileUrl       NVARCHAR(400) NULL,
    UploadedByUserId    INT NOT NULL REFERENCES Users(Id),
    UploadedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReviewedByDoctor    BIT NOT NULL DEFAULT 0,
    DoctorRemarks       NVARCHAR(400) NULL,
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   12. RADIOLOGY
   --------------------------------------------------------------------------- */
CREATE TABLE RadiologyOrders (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    PatientId         INT NOT NULL REFERENCES Patients(Id),
    DoctorId          INT NOT NULL REFERENCES Doctors(Id),
    ScanType          NVARCHAR(50) NOT NULL,
    OpdVisitId        INT NULL REFERENCES OpdVisits(Id),
    IpdAdmissionId    INT NULL REFERENCES IpdAdmissions(Id),
    Status            NVARCHAR(30) NOT NULL DEFAULT 'Ordered',
    OrderedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Price             DECIMAL(10,2) NOT NULL DEFAULT 0,
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted         BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE RadiologyReports (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    RadiologyOrderId    INT NOT NULL REFERENCES RadiologyOrders(Id),
    ImageUrl            NVARCHAR(400) NULL,
    ReportFileUrl       NVARCHAR(400) NULL,
    DoctorNotes         NVARCHAR(MAX) NULL,
    UploadedByUserId    INT NOT NULL REFERENCES Users(Id),
    UploadedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   13. PHARMACY
   --------------------------------------------------------------------------- */
CREATE TABLE Medicines (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    MedicineName    NVARCHAR(150) NOT NULL,
    GenericName     NVARCHAR(150) NOT NULL,
    BatchNumber     NVARCHAR(50) NOT NULL,
    ExpiryDate      DATE NOT NULL,
    Manufacturer    NVARCHAR(150) NOT NULL,
    PurchasePrice   DECIMAL(10,2) NOT NULL DEFAULT 0,
    SellingPrice    DECIMAL(10,2) NOT NULL DEFAULT 0,
    Stock           INT NOT NULL DEFAULT 0,
    ReorderLevel    INT NOT NULL DEFAULT 10,
    BranchId        INT NOT NULL REFERENCES Branches(Id),
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedBy       NVARCHAR(100) NULL,
    UpdatedAt       DATETIME2 NULL,
    UpdatedBy       NVARCHAR(100) NULL,
    IsDeleted       BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Medicines_Name ON Medicines(MedicineName);
GO

ALTER TABLE PrescriptionItems ADD CONSTRAINT FK_PrescriptionItems_Medicines FOREIGN KEY (MedicineId) REFERENCES Medicines(Id);
GO

CREATE TABLE PharmacySales (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    InvoiceNumber       NVARCHAR(30) NOT NULL UNIQUE,
    PatientId           INT NOT NULL REFERENCES Patients(Id),
    PrescriptionId      INT NULL REFERENCES Prescriptions(Id),
    DispensedByUserId   INT NOT NULL REFERENCES Users(Id),
    TotalAmount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    SaleDate            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE PharmacySaleItems (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    PharmacySaleId    INT NOT NULL REFERENCES PharmacySales(Id),
    MedicineId        INT NOT NULL REFERENCES Medicines(Id),
    Quantity          INT NOT NULL,
    UnitPrice         DECIMAL(10,2) NOT NULL,
    LineTotal         DECIMAL(12,2) NOT NULL
);
GO

CREATE TABLE MedicineStockTransactions (
    Id                    INT IDENTITY(1,1) PRIMARY KEY,
    MedicineId            INT NOT NULL REFERENCES Medicines(Id),
    TransactionType       NVARCHAR(20) NOT NULL,
    Quantity              INT NOT NULL,
    Reason                NVARCHAR(300) NULL,
    PerformedByUserId     INT NOT NULL REFERENCES Users(Id),
    CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted             BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   14. BILLING
   --------------------------------------------------------------------------- */
CREATE TABLE Bills (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    BillNumber          NVARCHAR(30) NOT NULL UNIQUE,
    PatientId           INT NOT NULL REFERENCES Patients(Id),
    OpdVisitId          INT NULL REFERENCES OpdVisits(Id),
    IpdAdmissionId      INT NULL REFERENCES IpdAdmissions(Id),
    Type                NVARCHAR(20) NOT NULL,
    SubTotal            DECIMAL(12,2) NOT NULL DEFAULT 0,
    GstAmount           DECIMAL(12,2) NOT NULL DEFAULT 0,
    DiscountAmount      DECIMAL(12,2) NOT NULL DEFAULT 0,
    TotalAmount         DECIMAL(12,2) NOT NULL DEFAULT 0,
    PaidAmount          DECIMAL(12,2) NOT NULL DEFAULT 0,
    Status              NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    GeneratedByUserId   INT NOT NULL REFERENCES Users(Id),
    BillDate            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    BranchId            INT NOT NULL REFERENCES Branches(Id),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_Bills_PatientId ON Bills(PatientId);
GO

CREATE TABLE BillItems (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    BillId        INT NOT NULL REFERENCES Bills(Id),
    Description   NVARCHAR(200) NOT NULL,
    Quantity      INT NOT NULL DEFAULT 1,
    UnitPrice     DECIMAL(10,2) NOT NULL,
    LineTotal     DECIMAL(12,2) NOT NULL
);
GO

CREATE TABLE Payments (
    Id                     INT IDENTITY(1,1) PRIMARY KEY,
    BillId                 INT NOT NULL REFERENCES Bills(Id),
    Amount                 DECIMAL(12,2) NOT NULL,
    Mode                   NVARCHAR(20) NOT NULL,
    TransactionReference   NVARCHAR(100) NULL,
    IsRefund               BIT NOT NULL DEFAULT 0,
    PaidAt                 DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ReceivedByUserId       INT NOT NULL REFERENCES Users(Id),
    CreatedAt              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted              BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   15. INSURANCE
   --------------------------------------------------------------------------- */
CREATE TABLE InsuranceClaims (
    Id                 INT IDENTITY(1,1) PRIMARY KEY,
    PatientId          INT NOT NULL REFERENCES Patients(Id),
    BillId             INT NULL REFERENCES Bills(Id),
    InsuranceCompany   NVARCHAR(150) NOT NULL,
    PolicyNumber       NVARCHAR(100) NOT NULL,
    CoverageAmount     DECIMAL(12,2) NOT NULL,
    ApprovedAmount     DECIMAL(12,2) NULL,
    Status             NVARCHAR(20) NOT NULL DEFAULT 'Submitted',
    SubmittedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    Remarks            NVARCHAR(400) NULL,
    CreatedAt          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted          BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   16. OPERATION THEATRE
   --------------------------------------------------------------------------- */
CREATE TABLE Surgeries (
    Id                    INT IDENTITY(1,1) PRIMARY KEY,
    PatientId             INT NOT NULL REFERENCES Patients(Id),
    IpdAdmissionId        INT NOT NULL REFERENCES IpdAdmissions(Id),
    SurgeryName           NVARCHAR(200) NOT NULL,
    SurgeonDoctorId       INT NOT NULL REFERENCES Doctors(Id),
    AssistantDoctorId     INT NULL REFERENCES Doctors(Id),
    NurseUserId           INT NULL REFERENCES Users(Id),
    Equipment             NVARCHAR(400) NULL,
    ScheduledAt           DATETIME2 NOT NULL,
    CompletedAt           DATETIME2 NULL,
    OperationNotes        NVARCHAR(MAX) NULL,
    Anesthesia            NVARCHAR(200) NULL,
    OperationCost         DECIMAL(12,2) NOT NULL DEFAULT 0,
    Status                NVARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    CreatedAt             DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted             BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   17. DISCHARGE
   --------------------------------------------------------------------------- */
CREATE TABLE DischargeSummaries (
    Id                        INT IDENTITY(1,1) PRIMARY KEY,
    IpdAdmissionId            INT NOT NULL UNIQUE REFERENCES IpdAdmissions(Id),
    TreatingDoctorId          INT NOT NULL REFERENCES Doctors(Id),
    Diagnosis                 NVARCHAR(1000) NOT NULL,
    ChiefComplaint            NVARCHAR(1000) NULL,
    PastHistory               NVARCHAR(1000) NULL,
    PhysicalExamination       NVARCHAR(1000) NULL,
    Investigation             NVARCHAR(1000) NULL,
    CourseInHospital          NVARCHAR(MAX) NULL,
    ConditionAtDischarge      NVARCHAR(400) NOT NULL,
    MedicinesAdvised          NVARCHAR(1000) NULL,
    DietAdvice                NVARCHAR(400) NULL,
    FollowUpDate              DATE NULL,
    DischargedAt              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    DoctorDigitalSignature    NVARCHAR(400) NULL,
    CreatedAt                 DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted                 BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   18. MEDICAL RECORDS
   --------------------------------------------------------------------------- */
CREATE TABLE MedicalRecords (
    Id            INT IDENTITY(1,1) PRIMARY KEY,
    PatientId     INT NOT NULL REFERENCES Patients(Id),
    RecordType    NVARCHAR(50) NOT NULL,
    Title         NVARCHAR(200) NOT NULL,
    FileUrl       NVARCHAR(400) NULL,
    Notes         NVARCHAR(1000) NULL,
    RecordDate    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted     BIT NOT NULL DEFAULT 0
);
CREATE INDEX IX_MedicalRecords_PatientId ON MedicalRecords(PatientId);
GO

/* ---------------------------------------------------------------------------
   19. INVENTORY / VENDORS
   --------------------------------------------------------------------------- */
CREATE TABLE Vendors (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Name        NVARCHAR(150) NOT NULL,
    GstNumber   NVARCHAR(30) NOT NULL,
    Contact     NVARCHAR(20) NOT NULL,
    Address     NVARCHAR(400) NULL,
    IsActive    BIT NOT NULL DEFAULT 1,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted   BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE InventoryItems (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    ItemName       NVARCHAR(150) NOT NULL,
    Type           NVARCHAR(30) NOT NULL,
    Unit           NVARCHAR(30) NOT NULL,
    Stock          INT NOT NULL DEFAULT 0,
    ReorderLevel   INT NOT NULL DEFAULT 5,
    ExpiryDate     DATE NULL,
    VendorId       INT NULL REFERENCES Vendors(Id),
    BranchId       INT NOT NULL REFERENCES Branches(Id),
    CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted      BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE InventoryTransactions (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    InventoryItemId     INT NOT NULL REFERENCES InventoryItems(Id),
    MovementType        NVARCHAR(20) NOT NULL,
    Quantity            INT NOT NULL,
    Reason              NVARCHAR(300) NULL,
    PerformedByUserId   INT NOT NULL REFERENCES Users(Id),
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE PurchaseOrders (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    PoNumber       NVARCHAR(30) NOT NULL UNIQUE,
    VendorId       INT NOT NULL REFERENCES Vendors(Id),
    OrderDate      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    TotalAmount    DECIMAL(12,2) NOT NULL DEFAULT 0,
    Status         NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    PaymentDone    BIT NOT NULL DEFAULT 0,
    CreatedAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted      BIT NOT NULL DEFAULT 0
);
GO

CREATE TABLE PurchaseOrderItems (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    PurchaseOrderId     INT NOT NULL REFERENCES PurchaseOrders(Id),
    ItemDescription     NVARCHAR(200) NOT NULL,
    Quantity            INT NOT NULL,
    UnitPrice           DECIMAL(10,2) NOT NULL
);
GO

/* ---------------------------------------------------------------------------
   20. HR: ATTENDANCE / PAYROLL / LEAVE
   --------------------------------------------------------------------------- */
CREATE TABLE Attendances (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId        INT NOT NULL REFERENCES Employees(Id),
    AttendanceDate    DATE NOT NULL,
    CheckIn           DATETIME2 NULL,
    CheckOut          DATETIME2 NULL,
    OvertimeHours     DECIMAL(5,2) NOT NULL DEFAULT 0,
    Shift             NVARCHAR(50) NOT NULL,
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted         BIT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX UX_Attendance_EmployeeDate ON Attendances(EmployeeId, AttendanceDate);
GO

CREATE TABLE Payrolls (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId      INT NOT NULL REFERENCES Employees(Id),
    PayPeriod       NVARCHAR(7) NOT NULL, -- 'YYYY-MM'
    BasicSalary     DECIMAL(12,2) NOT NULL,
    PF              DECIMAL(10,2) NOT NULL DEFAULT 0,
    ESI             DECIMAL(10,2) NOT NULL DEFAULT 0,
    TaxDeduction    DECIMAL(10,2) NOT NULL DEFAULT 0,
    Bonus           DECIMAL(10,2) NOT NULL DEFAULT 0,
    NetSalary       DECIMAL(12,2) NOT NULL,
    GeneratedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    PayslipUrl      NVARCHAR(400) NULL,
    IsDeleted       BIT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX UX_Payroll_EmployeePeriod ON Payrolls(EmployeeId, PayPeriod);
GO

CREATE TABLE LeaveRequests (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId        INT NOT NULL REFERENCES Employees(Id),
    FromDate          DATE NOT NULL,
    ToDate            DATE NOT NULL,
    Reason            NVARCHAR(300) NOT NULL,
    Status            NVARCHAR(20) NOT NULL DEFAULT 'Requested',
    ApprovedByUserId  INT NULL REFERENCES Users(Id),
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted         BIT NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------------
   21. NOTIFICATIONS
   --------------------------------------------------------------------------- */
CREATE TABLE Notifications (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    UserId      INT NULL REFERENCES Users(Id),
    PatientId   INT NULL REFERENCES Patients(Id),
    Channel     NVARCHAR(10) NOT NULL,
    Category    NVARCHAR(30) NOT NULL,
    Message     NVARCHAR(500) NOT NULL,
    IsSent      BIT NOT NULL DEFAULT 0,
    SentAt      DATETIME2 NULL,
    IsRead      BIT NOT NULL DEFAULT 0,
    CreatedAt   DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted   BIT NOT NULL DEFAULT 0
);
GO

PRINT 'HMS_DB schema created successfully.';
GO
