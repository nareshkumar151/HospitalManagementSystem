USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Patient_NextUhid
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year VARCHAR(4) = CAST(YEAR(SYSUTCDATETIME()) AS VARCHAR(4));
    DECLARE @Next INT = (
        SELECT ISNULL(MAX(CAST(SUBSTRING(UHID, 9, 10) AS INT)), 0) + 1
        FROM Patients WHERE UHID LIKE 'UHID' + @Year + '%'
    );
    SELECT 'UHID' + @Year + RIGHT('000000' + CAST(@Next AS VARCHAR(10)), 6) AS NextUhid;
END
GO

CREATE OR ALTER PROCEDURE sp_Patient_Search
    @HospitalId INT, @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL, @DoctorId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- @HospitalId scopes to one hospital, not one branch - the same patient can be registered at one
    -- branch and treated at another branch of the SAME hospital without a duplicate record, so any branch
    -- of that hospital must be able to find them here. A different hospital entirely never sees them.
    -- @DoctorId narrows it further to "this doctor's patients" (anyone they've ever had an appointment
    -- with) on top of that - used for the Doctor role only; Admin/Receptionist/Nurse pass NULL for it.
    SELECT Id, UHID, AadhaarNumber, FullName, Gender, DateOfBirth, Age, Mobile, Email, Address, BloodGroup,
           EmergencyContactName, EmergencyContactNumber, ReferredByDoctorName, ReferralHospital, ReferralNotes,
           InsuranceCompany, InsurancePolicyNumber, Allergies, BranchId, HospitalId, CreatedAt
    FROM Patients p
    WHERE IsDeleted = 0 AND p.HospitalId = @HospitalId
      AND (@Search IS NULL OR FullName LIKE '%' + @Search + '%' OR Mobile LIKE '%' + @Search + '%' OR UHID LIKE '%' + @Search + '%')
      AND (@DoctorId IS NULL OR EXISTS (SELECT 1 FROM Appointments a WHERE a.PatientId = p.Id AND a.DoctorId = @DoctorId))
    ORDER BY CreatedAt DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM Patients p
    WHERE IsDeleted = 0 AND p.HospitalId = @HospitalId
      AND (@Search IS NULL OR FullName LIKE '%' + @Search + '%' OR Mobile LIKE '%' + @Search + '%' OR UHID LIKE '%' + @Search + '%')
      AND (@DoctorId IS NULL OR EXISTS (SELECT 1 FROM Appointments a WHERE a.PatientId = p.Id AND a.DoctorId = @DoctorId));
END
GO

CREATE OR ALTER PROCEDURE sp_Patient_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UHID, AadhaarNumber, FullName, Gender, DateOfBirth, Age, Mobile, Email, Address, BloodGroup,
           EmergencyContactName, EmergencyContactNumber, ReferredByDoctorName, ReferralHospital, ReferralNotes,
           InsuranceCompany, InsurancePolicyNumber, Allergies, BranchId, HospitalId, CreatedAt
    FROM Patients WHERE Id = @Id AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Patient_GetByUhid
    @UHID NVARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UHID, AadhaarNumber, FullName, Gender, DateOfBirth, Age, Mobile, Email, Address, BloodGroup,
           EmergencyContactName, EmergencyContactNumber, ReferredByDoctorName, ReferralHospital, ReferralNotes,
           InsuranceCompany, InsurancePolicyNumber, Allergies, BranchId, HospitalId, CreatedAt
    FROM Patients WHERE UHID = @UHID AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Patient_Insert
    @UHID NVARCHAR(30), @AadhaarNumber NVARCHAR(12) = NULL, @FullName NVARCHAR(150), @Gender NVARCHAR(10),
    @DateOfBirth DATE = NULL, @Age INT = NULL, @Mobile NVARCHAR(20), @Email NVARCHAR(150) = NULL,
    @Address NVARCHAR(400) = NULL, @BloodGroup NVARCHAR(15) = 'Unknown',
    @EmergencyContactName NVARCHAR(150) = NULL, @EmergencyContactNumber NVARCHAR(20) = NULL,
    @ReferredByDoctorName NVARCHAR(150) = NULL, @ReferralHospital NVARCHAR(200) = NULL, @ReferralNotes NVARCHAR(400) = NULL,
    @InsuranceCompany NVARCHAR(150) = NULL, @InsurancePolicyNumber NVARCHAR(100) = NULL, @Allergies NVARCHAR(400) = NULL,
    @BranchId INT, @RegisteredByUserId INT = NULL, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Patients (UHID, AadhaarNumber, FullName, Gender, DateOfBirth, Age, Mobile, Email, Address, BloodGroup,
        EmergencyContactName, EmergencyContactNumber, ReferredByDoctorName, ReferralHospital, ReferralNotes,
        InsuranceCompany, InsurancePolicyNumber, Allergies, BranchId, HospitalId, RegisteredByUserId, CreatedBy)
    VALUES (@UHID, @AadhaarNumber, @FullName, @Gender, @DateOfBirth, @Age, @Mobile, @Email, @Address, @BloodGroup,
        @EmergencyContactName, @EmergencyContactNumber, @ReferredByDoctorName, @ReferralHospital, @ReferralNotes,
        @InsuranceCompany, @InsurancePolicyNumber, @Allergies, @BranchId,
        (SELECT HospitalId FROM Branches WHERE Id = @BranchId), @RegisteredByUserId, @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Patient_Update
    @Id INT, @AadhaarNumber NVARCHAR(12) = NULL, @FullName NVARCHAR(150), @Gender NVARCHAR(10),
    @DateOfBirth DATE = NULL, @Age INT = NULL, @Mobile NVARCHAR(20), @Email NVARCHAR(150) = NULL,
    @Address NVARCHAR(400) = NULL, @BloodGroup NVARCHAR(15) = 'Unknown',
    @EmergencyContactName NVARCHAR(150) = NULL, @EmergencyContactNumber NVARCHAR(20) = NULL,
    @ReferredByDoctorName NVARCHAR(150) = NULL, @ReferralHospital NVARCHAR(200) = NULL, @ReferralNotes NVARCHAR(400) = NULL,
    @InsuranceCompany NVARCHAR(150) = NULL, @InsurancePolicyNumber NVARCHAR(100) = NULL, @Allergies NVARCHAR(400) = NULL,
    @UpdatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Patients SET
        AadhaarNumber=@AadhaarNumber, FullName=@FullName, Gender=@Gender, DateOfBirth=@DateOfBirth, Age=@Age,
        Mobile=@Mobile, Email=@Email, Address=@Address, BloodGroup=@BloodGroup,
        EmergencyContactName=@EmergencyContactName, EmergencyContactNumber=@EmergencyContactNumber,
        ReferredByDoctorName=@ReferredByDoctorName, ReferralHospital=@ReferralHospital, ReferralNotes=@ReferralNotes,
        InsuranceCompany=@InsuranceCompany, InsurancePolicyNumber=@InsurancePolicyNumber, Allergies=@Allergies,
        UpdatedAt=SYSUTCDATETIME(), UpdatedBy=@UpdatedBy
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Patient_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Patients SET IsDeleted = 1 WHERE Id = @Id;
END
GO
