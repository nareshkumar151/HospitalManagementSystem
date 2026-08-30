USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Prescription_Insert
    @PatientId INT, @DoctorId INT, @OpdVisitId INT = NULL, @IpdAdmissionId INT = NULL, @DigitalSignature NVARCHAR(400) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Prescriptions (PatientId, DoctorId, OpdVisitId, IpdAdmissionId, DigitalSignature)
    VALUES (@PatientId, @DoctorId, @OpdVisitId, @IpdAdmissionId, @DigitalSignature);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_PrescriptionItem_Insert
    @PrescriptionId INT, @MedicineId INT, @Dosage NVARCHAR(100), @Frequency NVARCHAR(100),
    @DurationDays INT, @Instructions NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO PrescriptionItems (PrescriptionId, MedicineId, Dosage, Frequency, DurationDays, Instructions)
    VALUES (@PrescriptionId, @MedicineId, @Dosage, @Frequency, @DurationDays, @Instructions);
END
GO

CREATE OR ALTER PROCEDURE sp_Prescription_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT pr.Id, pr.PatientId, p.FullName AS PatientName, pr.DoctorId, doc.FullName AS DoctorName,
           pr.OpdVisitId, pr.IpdAdmissionId, pr.PrescribedDate, pr.Status, pr.DigitalSignature
    FROM Prescriptions pr JOIN Patients p ON p.Id = pr.PatientId JOIN Doctors doc ON doc.Id = pr.DoctorId
    WHERE pr.Id = @Id AND pr.IsDeleted = 0;

    SELECT pi.MedicineId, m.MedicineName, pi.Dosage, pi.Frequency, pi.DurationDays, pi.Instructions
    FROM PrescriptionItems pi JOIN Medicines m ON m.Id = pi.MedicineId
    WHERE pi.PrescriptionId = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Prescription_GetByPatient
    @PatientId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT pr.Id, pr.PatientId, p.FullName AS PatientName, pr.DoctorId, doc.FullName AS DoctorName,
           pr.OpdVisitId, pr.IpdAdmissionId, pr.PrescribedDate, pr.Status, pr.DigitalSignature
    FROM Prescriptions pr JOIN Patients p ON p.Id = pr.PatientId JOIN Doctors doc ON doc.Id = pr.DoctorId
    WHERE pr.PatientId = @PatientId AND pr.IsDeleted = 0
    ORDER BY pr.PrescribedDate DESC;

    SELECT pi.PrescriptionId, pi.MedicineId, m.MedicineName, pi.Dosage, pi.Frequency, pi.DurationDays, pi.Instructions
    FROM PrescriptionItems pi JOIN Medicines m ON m.Id = pi.MedicineId
    JOIN Prescriptions pr ON pr.Id = pi.PrescriptionId
    WHERE pr.PatientId = @PatientId AND pr.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Prescription_UpdateStatus
    @Id INT, @Status NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Prescriptions SET Status = @Status WHERE Id = @Id;
END
GO
