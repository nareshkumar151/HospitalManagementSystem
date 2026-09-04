/* ============================================================================
   Seed data: Roles, a default Hospital/Branch/Departments, demo login for every
   role (password shown in comments - change on first login in production),
   a starter Ward/Room/Bed layout, and the Lab test catalogue.
   Run after 01_Schema.sql and every script under StoredProcedures/.
   ============================================================================ */
USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   Roles (must match HMS.Domain.Enums.RoleName)
   --------------------------------------------------------------------------- */
INSERT INTO Roles (Name, Description) VALUES
    ('SuperAdmin',    'Platform-level - add/delete Hospitals and Branches, manage cross-hospital master data'),
    ('Administrator', 'Full system access - hospital, branch, department, doctor, employee, billing, reports, medicines'),
    ('Receptionist',  'Patient registration, appointments, admission, billing, insurance, discharge'),
    ('Doctor',        'Consultation, prescriptions, lab/radiology orders, notes, discharge summaries, digital signature'),
    ('Nurse',         'Vitals, bed assignment, medication tracking, patient care notes, report upload'),
    ('Pharmacist',    'Dispense medicine, manage stock, purchase medicine'),
    ('LabTechnician', 'Sample collection, result upload, report generation'),
    ('HR',            'Employee management, attendance, payroll'),
    ('Patient',       'Book appointments, view reports, download prescriptions, view bills');
GO

/* ---------------------------------------------------------------------------
   Organization
   --------------------------------------------------------------------------- */
INSERT INTO Hospitals (Name, RegistrationNumber, Address, ContactNumber, Email)
VALUES ('Effisys Group', 'REG-HMS-0001', '123 MG Road, Pune, Maharashtra', '+911234567890', 'info@effisysgroup.example');

INSERT INTO Branches (HospitalId, Name, Address, City, ContactNumber)
VALUES (1, 'Main Branch', '123 MG Road, Pune, Maharashtra', 'Pune', '+911234567890');

-- Module 18: Department Management (from SRS list, including highlighted additions)
INSERT INTO Departments (BranchId, Name, Description) VALUES
    (1, 'General Medicine', 'General medicine outpatient and inpatient care'),
    (1, 'General Surgery', 'General surgical procedures'),
    (1, 'Cardiology', 'Heart and cardiovascular care'),
    (1, 'Neurosurgery', 'Surgical treatment of the nervous system'),
    (1, 'Neurology', 'Non-surgical treatment of the nervous system'),
    (1, 'Orthopedics', 'Bone, joint and muscle care'),
    (1, 'Pediatrics', 'Child healthcare'),
    (1, 'Gynecology', 'Women''s health'),
    (1, 'ENT', 'Ear, nose and throat'),
    (1, 'Medical Oncology', 'Cancer treatment via medication'),
    (1, 'Surgical Oncology', 'Cancer treatment via surgery'),
    (1, 'Dermatology', 'Skin care');
GO

/* ---------------------------------------------------------------------------
   Demo users - one per role. All passwords are "<Role>@123" (BCrypt-hashed).
   *** CHANGE THESE PASSWORDS BEFORE ANY NON-LOCAL / PRODUCTION USE. ***
   --------------------------------------------------------------------------- */
DECLARE @SuperAdminRoleId INT = (SELECT Id FROM Roles WHERE Name = 'SuperAdmin');
DECLARE @AdminRoleId INT = (SELECT Id FROM Roles WHERE Name = 'Administrator');
DECLARE @ReceptionRoleId INT = (SELECT Id FROM Roles WHERE Name = 'Receptionist');
DECLARE @DoctorRoleId INT = (SELECT Id FROM Roles WHERE Name = 'Doctor');
DECLARE @NurseRoleId INT = (SELECT Id FROM Roles WHERE Name = 'Nurse');
DECLARE @PharmacistRoleId INT = (SELECT Id FROM Roles WHERE Name = 'Pharmacist');
DECLARE @LabRoleId INT = (SELECT Id FROM Roles WHERE Name = 'LabTechnician');
DECLARE @HrRoleId INT = (SELECT Id FROM Roles WHERE Name = 'HR');
DECLARE @PatientRoleId INT = (SELECT Id FROM Roles WHERE Name = 'Patient');

-- Sample Doctor profile + login (Doctor@123)
INSERT INTO Doctors (DoctorCode, FullName, DepartmentId, Qualification, ExperienceYears, ConsultationFee, AvailableDays, Mobile, Email, BranchId)
VALUES ('DOC00001', 'Dr. Aditi Sharma', 1, 'MBBS, MD (General Medicine)', 12, 500.00, 'Mon,Tue,Wed,Thu,Fri', '+919876500001', 'aditi.sharma@citycarehospital.example', 1);

-- Sample Employee profiles for Nurse / Pharmacist / LabTechnician / HR / Receptionist logins
INSERT INTO Employees (EmployeeCode, FullName, DepartmentId, Designation, Salary, JoiningDate, Shift, Contact, EmailId, BranchId) VALUES
    ('EMP00001', 'Neha Kulkarni', 1, 'Staff Nurse', 28000.00, '2024-01-15', 'Morning', '+919876500002', 'neha.kulkarni@citycarehospital.example', 1),
    ('EMP00002', 'Ramesh Iyer', 1, 'Pharmacist', 32000.00, '2023-06-01', 'Morning', '+919876500003', 'ramesh.iyer@citycarehospital.example', 1),
    ('EMP00003', 'Sneha Patil', 1, 'Lab Technician', 26000.00, '2023-09-10', 'Morning', '+919876500004', 'sneha.patil@citycarehospital.example', 1),
    ('EMP00004', 'Vikram Rao', 1, 'HR Executive', 35000.00, '2022-03-20', 'General', '+919876500005', 'vikram.rao@citycarehospital.example', 1),
    ('EMP00005', 'Pooja Deshmukh', 1, 'Front Desk Receptionist', 22000.00, '2024-05-05', 'Morning', '+919876500006', 'pooja.deshmukh@citycarehospital.example', 1);

-- Sample Patient profile + self-service login (Patient@123)
INSERT INTO Patients (UHID, FullName, Gender, DateOfBirth, Mobile, Email, BloodGroup, BranchId)
VALUES ('UHID2026000001', 'Rohit Verma', 'Male', '1990-04-12', '+919876500099', 'rohit.verma@example.com', 'OPositive', 1);

INSERT INTO Users (Username, Email, PasswordHash, RoleId, RoleName, LinkedProfileId, BranchId) VALUES
    ('superadmin',  'superadmin@citycarehospital.example',   '$2a$11$Z8aCPKQYN0YL5wx72SzJeesk1gyrIGGoDO05zQXL4O5Ib3gyfO1jG', @SuperAdminRoleId, 'SuperAdmin',    NULL, NULL),
    ('admin',       'admin@citycarehospital.example',       '$2a$11$hazMpfRWKKUSE1gKjc3OKeI9wbzAK4aIvVdkLLqoazhtuQNTY6euy', @AdminRoleId,      'Administrator', NULL, 1),
    ('dr.aditi',    'aditi.sharma@citycarehospital.example', '$2a$11$5DWWo0dTFhvG6gFsuAkz0OlgRNefLs4umPVvp9H2s0vo6uN75HhAu', @DoctorRoleId,     'Doctor',        1,    1),
    ('nurse.neha',  'neha.kulkarni@citycarehospital.example','$2a$11$pyAllKUo/BWauQXCkU0oKOh6FOYtAiC/L8a2dmEk/OlvwHkvnn.d2', @NurseRoleId,      'Nurse',         1,    1),
    ('reception.pooja','pooja.deshmukh@citycarehospital.example','$2a$11$nHy8QVqt1JJTP8dn1SbUMOpxMq.S3tl/XlYWEDpcsabW/L/eP/Ljy', @ReceptionRoleId, 'Receptionist', 5, 1),
    ('pharma.ramesh','ramesh.iyer@citycarehospital.example', '$2a$11$IGZLIo9YlHpeYESPmR44MuOPxeFjUryU8vot7Rs5bh9OzwKQ8uNaO', @PharmacistRoleId, 'Pharmacist',    2,    1),
    ('lab.sneha',   'sneha.patil@citycarehospital.example',  '$2a$11$5FbGLjGiksebH7P4dnRvs.V2zeLtAbjXKYgiiTBquVRKKRrMuNEV.', @LabRoleId,        'LabTechnician', 3,    1),
    ('hr.vikram',   'vikram.rao@citycarehospital.example',   '$2a$11$Z7h4nEfrLvOhpmBcdXVy/OsF9PPLo1DCYNfLhjSC5B.O3tDIXQPCW', @HrRoleId,         'HR',            4,    1),
    ('patient.rohit','rohit.verma@example.com',              '$2a$11$1jEsFzznadfZtYmBOFMGV.OULUngW27bP/njlHd54tKuvV3XAJXoG', @PatientRoleId,   'Patient',       1,    1);
GO

/* ---------------------------------------------------------------------------
   Module 6: Bed Management - one ward per room type with a few beds each
   --------------------------------------------------------------------------- */
INSERT INTO Wards (Name, Type, BranchId) VALUES
    ('General Ward', 'General', 1),
    ('Semi-Private Ward', 'SemiPrivate', 1),
    ('Private Ward', 'Private', 1),
    ('Deluxe Ward', 'Deluxe', 1),
    ('ICU', 'ICU', 1);

INSERT INTO Rooms (WardId, RoomNumber, Type, DailyCharge) VALUES
    (1, 'G-101', 'General', 800.00),
    (1, 'G-102', 'General', 800.00),
    (2, 'S-201', 'SemiPrivate', 1500.00),
    (3, 'P-301', 'Private', 2500.00),
    (4, 'D-401', 'Deluxe', 4500.00),
    (5, 'ICU-01', 'ICU', 6000.00);

INSERT INTO Beds (RoomId, BedNumber, IsIcu) VALUES
    (1, 'G-101-A', 0), (1, 'G-101-B', 0), (1, 'G-101-C', 0), (1, 'G-101-D', 0),
    (2, 'G-102-A', 0), (2, 'G-102-B', 0), (2, 'G-102-C', 0), (2, 'G-102-D', 0),
    (3, 'S-201-A', 0), (3, 'S-201-B', 0),
    (4, 'P-301-A', 0),
    (5, 'D-401-A', 0),
    (6, 'ICU-01-A', 1), (6, 'ICU-01-B', 1), (6, 'ICU-01-C', 1), (6, 'ICU-01-D', 1);
GO

/* ---------------------------------------------------------------------------
   Module 8: Laboratory catalogue
   --------------------------------------------------------------------------- */
INSERT INTO LabTestCatalog (TestName, Category, Price, NormalRange) VALUES
    ('Complete Blood Count (CBC)', 'Blood', 350.00, 'Varies by component'),
    ('Blood Sugar - Fasting', 'Blood', 150.00, '70-100 mg/dL'),
    ('Lipid Profile', 'Blood', 600.00, 'Varies by component'),
    ('Liver Function Test (LFT)', 'Blood', 700.00, 'Varies by component'),
    ('Kidney Function Test (KFT)', 'Blood', 650.00, 'Varies by component'),
    ('Routine Urine Examination', 'Urine', 200.00, 'Varies by component'),
    ('ECG', 'ECG', 300.00, 'Normal sinus rhythm'),
    ('Full Body Health Checkup Package', 'Package', 2500.00, 'N/A'),
    ('Cardiac Health Checkup Package', 'Package', 3500.00, 'N/A');
GO

/* ---------------------------------------------------------------------------
   Module 10: Sample pharmacy stock
   --------------------------------------------------------------------------- */
INSERT INTO Medicines (MedicineName, GenericName, BatchNumber, ExpiryDate, Manufacturer, PurchasePrice, SellingPrice, Stock, ReorderLevel, BranchId) VALUES
    ('Paracetamol 500mg', 'Paracetamol', 'B-2026-001', '2027-06-30', 'Cipla', 0.80, 1.50, 500, 50, 1),
    ('Amoxicillin 250mg', 'Amoxicillin', 'B-2026-002', '2027-03-31', 'Sun Pharma', 2.00, 3.50, 300, 40, 1),
    ('Cetirizine 10mg', 'Cetirizine', 'B-2026-003', '2027-09-30', 'Dr. Reddy''s', 0.60, 1.20, 400, 40, 1),
    ('Metformin 500mg', 'Metformin', 'B-2026-004', '2027-12-31', 'Sun Pharma', 1.20, 2.20, 350, 50, 1),
    ('Atorvastatin 10mg', 'Atorvastatin', 'B-2026-005', '2027-08-31', 'Cipla', 3.00, 5.50, 200, 30, 1);
GO

PRINT 'HMS_DB seed data inserted successfully.';
GO
