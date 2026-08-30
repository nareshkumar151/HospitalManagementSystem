USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Appointment_NextTokenNumber
    @DoctorId INT, @AppointmentDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ISNULL(MAX(TokenNumber), 0) + 1 AS NextToken
    FROM Appointments
    WHERE DoctorId = @DoctorId AND AppointmentDate = @AppointmentDate AND IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_CheckSlotTaken
    @DoctorId INT, @AppointmentDate DATE, @TimeSlot NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT COUNT(*) AS SlotCount
    FROM Appointments
    WHERE DoctorId = @DoctorId AND AppointmentDate = @AppointmentDate AND TimeSlot = @TimeSlot
      AND IsDeleted = 0 AND Status IN ('Scheduled', 'Completed');
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_Insert
    @PatientId INT, @DoctorId INT, @DepartmentId INT, @AppointmentDate DATE, @TimeSlot NVARCHAR(20),
    @TokenNumber INT, @Type NVARCHAR(20), @BranchId INT, @CreatedBy NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Appointments (PatientId, DoctorId, DepartmentId, AppointmentDate, TimeSlot, TokenNumber, Type, BranchId, CreatedBy)
    VALUES (@PatientId, @DoctorId, @DepartmentId, @AppointmentDate, @TimeSlot, @TokenNumber, @Type, @BranchId, @CreatedBy);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_GetById
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.PatientId, p.FullName AS PatientName, a.DoctorId, doc.FullName AS DoctorName,
           a.DepartmentId, dept.Name AS DepartmentName, a.AppointmentDate, a.TimeSlot, a.TokenNumber,
           a.Type, a.Status, a.CancellationReason, a.BranchId
    FROM Appointments a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Departments dept ON dept.Id = a.DepartmentId
    WHERE a.Id = @Id AND a.IsDeleted = 0;
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_Search
    @PageNumber INT = 1, @PageSize INT = 20, @DoctorId INT = NULL, @PatientId INT = NULL, @Date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.PatientId, p.FullName AS PatientName, a.DoctorId, doc.FullName AS DoctorName,
           a.DepartmentId, dept.Name AS DepartmentName, a.AppointmentDate, a.TimeSlot, a.TokenNumber,
           a.Type, a.Status, a.CancellationReason, a.BranchId
    FROM Appointments a
    JOIN Patients p ON p.Id = a.PatientId
    JOIN Doctors doc ON doc.Id = a.DoctorId
    JOIN Departments dept ON dept.Id = a.DepartmentId
    WHERE a.IsDeleted = 0
      AND (@DoctorId IS NULL OR a.DoctorId = @DoctorId)
      AND (@PatientId IS NULL OR a.PatientId = @PatientId)
      AND (@Date IS NULL OR a.AppointmentDate = @Date)
    ORDER BY a.AppointmentDate DESC, a.TokenNumber
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM Appointments a
    WHERE a.IsDeleted = 0
      AND (@DoctorId IS NULL OR a.DoctorId = @DoctorId)
      AND (@PatientId IS NULL OR a.PatientId = @PatientId)
      AND (@Date IS NULL OR a.AppointmentDate = @Date);
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_Reschedule
    @Id INT, @NewDate DATE, @NewTimeSlot NVARCHAR(20), @OldTimeSlot NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Appointments
    SET AppointmentDate = @NewDate, TimeSlot = @NewTimeSlot, Status = 'Rescheduled',
        RescheduledFromSlot = @OldTimeSlot, UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_Cancel
    @Id INT, @Reason NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Appointments SET Status = 'Cancelled', CancellationReason = @Reason, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_MarkCompleted
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Appointments SET Status = 'Completed', UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Appointment_GetBookedSlots
    @DoctorId INT, @Date DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TimeSlot FROM Appointments
    WHERE DoctorId = @DoctorId AND AppointmentDate = @Date AND IsDeleted = 0 AND Status IN ('Scheduled','Completed');
END
GO
