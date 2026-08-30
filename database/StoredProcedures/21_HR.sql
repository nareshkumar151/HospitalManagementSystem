USE HMS_DB;
GO

/* ==================== Attendance ==================== */
CREATE OR ALTER PROCEDURE sp_Attendance_CheckIn
    @EmployeeId INT, @Shift NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(SYSUTCDATETIME() AS DATE);
    IF EXISTS (SELECT 1 FROM Attendances WHERE EmployeeId = @EmployeeId AND AttendanceDate = @Today)
    BEGIN
        UPDATE Attendances SET CheckIn = SYSUTCDATETIME(), Shift = @Shift
        WHERE EmployeeId = @EmployeeId AND AttendanceDate = @Today;
    END
    ELSE
    BEGIN
        INSERT INTO Attendances (EmployeeId, AttendanceDate, CheckIn, Shift) VALUES (@EmployeeId, @Today, SYSUTCDATETIME(), @Shift);
    END
    SELECT a.Id, a.EmployeeId, e.FullName AS EmployeeName, a.AttendanceDate, a.CheckIn, a.CheckOut, a.OvertimeHours, a.Shift
    FROM Attendances a JOIN Employees e ON e.Id = a.EmployeeId
    WHERE a.EmployeeId = @EmployeeId AND a.AttendanceDate = @Today;
END
GO

CREATE OR ALTER PROCEDURE sp_Attendance_CheckOut
    @EmployeeId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(SYSUTCDATETIME() AS DATE);

    IF NOT EXISTS (SELECT 1 FROM Attendances WHERE EmployeeId = @EmployeeId AND AttendanceDate = @Today)
    BEGIN
        RAISERROR('No check-in recorded for this employee today - check in first.', 16, 1);
        RETURN;
    END

    UPDATE Attendances SET CheckOut = SYSUTCDATETIME() WHERE EmployeeId = @EmployeeId AND AttendanceDate = @Today;

    SELECT a.Id, a.EmployeeId, e.FullName AS EmployeeName, a.AttendanceDate, a.CheckIn, a.CheckOut, a.OvertimeHours, a.Shift
    FROM Attendances a JOIN Employees e ON e.Id = a.EmployeeId
    WHERE a.EmployeeId = @EmployeeId AND a.AttendanceDate = @Today;
END
GO

CREATE OR ALTER PROCEDURE sp_Attendance_GetByEmployee
    @EmployeeId INT, @Month DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.EmployeeId, e.FullName AS EmployeeName, a.AttendanceDate, a.CheckIn, a.CheckOut, a.OvertimeHours, a.Shift
    FROM Attendances a JOIN Employees e ON e.Id = a.EmployeeId
    WHERE a.EmployeeId = @EmployeeId
      AND (@Month IS NULL OR (YEAR(a.AttendanceDate) = YEAR(@Month) AND MONTH(a.AttendanceDate) = MONTH(@Month)))
    ORDER BY a.AttendanceDate DESC;
END
GO

/* Every active employee's attendance rows for one month - the Admin/HR month-wise matrix. Ordered by
   employee then date so the frontend can group rows into one row-per-employee without re-sorting. */
CREATE OR ALTER PROCEDURE sp_Attendance_GetAllForMonth
    @Month DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT a.Id, a.EmployeeId, e.FullName AS EmployeeName, a.AttendanceDate, a.CheckIn, a.CheckOut, a.OvertimeHours, a.Shift
    FROM Attendances a
    JOIN Employees e ON e.Id = a.EmployeeId
    WHERE YEAR(a.AttendanceDate) = YEAR(@Month) AND MONTH(a.AttendanceDate) = MONTH(@Month) AND a.IsDeleted = 0
    ORDER BY e.FullName, a.AttendanceDate;
END
GO

/* Dashboard widgets: headcount, who's in today, who's on approved leave today, and the review backlog. */
CREATE OR ALTER PROCEDURE sp_Attendance_GetTodaySummary
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(SYSUTCDATETIME() AS DATE);
    SELECT
        (SELECT COUNT(*) FROM Employees WHERE IsActive = 1 AND IsDeleted = 0) AS TotalEmployees,
        (SELECT COUNT(*) FROM Attendances WHERE AttendanceDate = @Today AND CheckIn IS NOT NULL AND IsDeleted = 0) AS PresentToday,
        (SELECT COUNT(DISTINCT EmployeeId) FROM LeaveRequests WHERE Status = 'Approved' AND @Today BETWEEN FromDate AND ToDate AND IsDeleted = 0) AS OnLeaveToday,
        (SELECT COUNT(*) FROM LeaveRequests WHERE Status = 'Requested' AND IsDeleted = 0) AS PendingLeaveRequests;
END
GO

/* ==================== Payroll ==================== */
CREATE OR ALTER PROCEDURE sp_Payroll_Generate
    @EmployeeId INT, @PayPeriod NVARCHAR(7), @BasicSalary DECIMAL(12,2), @PF DECIMAL(10,2), @ESI DECIMAL(10,2),
    @TaxDeduction DECIMAL(10,2), @Bonus DECIMAL(10,2), @NetSalary DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM Payrolls WHERE EmployeeId = @EmployeeId AND PayPeriod = @PayPeriod)
    BEGIN
        RAISERROR('Payroll already generated for this employee and period.', 16, 1);
        RETURN;
    END
    INSERT INTO Payrolls (EmployeeId, PayPeriod, BasicSalary, PF, ESI, TaxDeduction, Bonus, NetSalary)
    VALUES (@EmployeeId, @PayPeriod, @BasicSalary, @PF, @ESI, @TaxDeduction, @Bonus, @NetSalary);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Payroll_GetByEmployee
    @EmployeeId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id, p.EmployeeId, e.FullName AS EmployeeName, p.PayPeriod, p.BasicSalary, p.PF, p.ESI,
           p.TaxDeduction, p.Bonus, p.NetSalary, p.GeneratedAt, p.PayslipUrl
    FROM Payrolls p JOIN Employees e ON e.Id = p.EmployeeId
    WHERE p.EmployeeId = @EmployeeId AND p.IsDeleted = 0
    ORDER BY p.PayPeriod DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_Payroll_GetByPeriod
    @PayPeriod NVARCHAR(7)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT p.Id, p.EmployeeId, e.FullName AS EmployeeName, p.PayPeriod, p.BasicSalary, p.PF, p.ESI,
           p.TaxDeduction, p.Bonus, p.NetSalary, p.GeneratedAt, p.PayslipUrl
    FROM Payrolls p JOIN Employees e ON e.Id = p.EmployeeId
    WHERE p.PayPeriod = @PayPeriod AND p.IsDeleted = 0
    ORDER BY e.FullName;
END
GO

/* ==================== Leave Requests ==================== */
CREATE OR ALTER PROCEDURE sp_LeaveRequest_Insert
    @EmployeeId INT, @FromDate DATE, @ToDate DATE, @Reason NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO LeaveRequests (EmployeeId, FromDate, ToDate, Reason) VALUES (@EmployeeId, @FromDate, @ToDate, @Reason);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_LeaveRequest_Review
    @Id INT, @Status NVARCHAR(20), @ReviewerUserId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE LeaveRequests SET Status = @Status, ApprovedByUserId = @ReviewerUserId WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_LeaveRequest_GetAll
    @Status NVARCHAR(20) = NULL, @EmployeeId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT l.Id, l.EmployeeId, e.FullName AS EmployeeName, l.FromDate, l.ToDate, l.Reason, l.Status
    FROM LeaveRequests l JOIN Employees e ON e.Id = l.EmployeeId
    WHERE l.IsDeleted = 0 AND (@Status IS NULL OR l.Status = @Status) AND (@EmployeeId IS NULL OR l.EmployeeId = @EmployeeId)
    ORDER BY l.CreatedAt DESC;
END
GO
