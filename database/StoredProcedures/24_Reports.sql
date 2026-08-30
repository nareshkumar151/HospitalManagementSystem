USE HMS_DB;
GO

-- Every report below takes @BranchId: without it, an Administrator's reports would silently blend every
-- hospital's patients/revenue/staff together - actively misleading, not just incomplete, for a chain
-- running multiple branches under one SuperAdmin.

CREATE OR ALTER PROCEDURE sp_Report_PatientRegister
    @FromDate DATE, @ToDate DATE, @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UHID, FullName, Mobile, CreatedAt AS RegisteredOn
    FROM Patients
    WHERE IsDeleted = 0 AND CAST(CreatedAt AS DATE) BETWEEN @FromDate AND @ToDate AND BranchId = @BranchId
    ORDER BY CreatedAt;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_DailyVisits
    @FromDate DATE, @ToDate DATE, @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH Opd AS (
        SELECT CAST(v.VisitDateTime AS DATE) AS D, COUNT(*) AS Cnt
        FROM OpdVisits v JOIN Doctors doc ON doc.Id = v.DoctorId
        WHERE v.IsDeleted = 0 AND CAST(v.VisitDateTime AS DATE) BETWEEN @FromDate AND @ToDate AND doc.BranchId = @BranchId
        GROUP BY CAST(v.VisitDateTime AS DATE)
    ), Ipd AS (
        SELECT CAST(AdmissionDate AS DATE) AS D, COUNT(*) AS Cnt FROM IpdAdmissions
        WHERE IsDeleted = 0 AND CAST(AdmissionDate AS DATE) BETWEEN @FromDate AND @ToDate AND BranchId = @BranchId
        GROUP BY CAST(AdmissionDate AS DATE)
    )
    SELECT COALESCE(o.D, i.D) AS [Date], ISNULL(o.Cnt, 0) AS OpdCount, ISNULL(i.Cnt, 0) AS IpdCount
    FROM Opd o FULL OUTER JOIN Ipd i ON o.D = i.D
    ORDER BY [Date];
END
GO

CREATE OR ALTER PROCEDURE sp_Report_DoctorPerformance
    @FromDate DATE, @ToDate DATE, @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT doc.Id AS DoctorId, doc.FullName AS DoctorName, COUNT(v.Id) AS ConsultationCount,
           ISNULL(SUM(v.ConsultationFee), 0) AS RevenueGenerated
    FROM Doctors doc
    LEFT JOIN OpdVisits v ON v.DoctorId = doc.Id AND v.IsDeleted = 0
        AND CAST(v.VisitDateTime AS DATE) BETWEEN @FromDate AND @ToDate
    WHERE doc.BranchId = @BranchId
    GROUP BY doc.Id, doc.FullName
    ORDER BY RevenueGenerated DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_Revenue
    @FromDate DATE, @ToDate DATE, @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CAST(BillDate AS DATE) AS [Date],
        SUM(CASE WHEN Type = 'Consultation' THEN TotalAmount ELSE 0 END) AS Consultation,
        SUM(CASE WHEN Type = 'Pharmacy' THEN TotalAmount ELSE 0 END) AS Pharmacy,
        SUM(CASE WHEN Type = 'Lab' THEN TotalAmount ELSE 0 END) AS Lab,
        SUM(CASE WHEN Type = 'Admission' THEN TotalAmount ELSE 0 END) AS Admission,
        SUM(TotalAmount) AS Total
    FROM Bills
    WHERE IsDeleted = 0 AND CAST(BillDate AS DATE) BETWEEN @FromDate AND @ToDate AND BranchId = @BranchId
    GROUP BY CAST(BillDate AS DATE)
    ORDER BY [Date];
END
GO

CREATE OR ALTER PROCEDURE sp_Report_PharmacyStock
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT MedicineName, Stock, ExpiryDate, Stock * SellingPrice AS Value
    FROM Medicines WHERE IsDeleted = 0 AND BranchId = @BranchId
    ORDER BY MedicineName;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_DepartmentWiseRevenue
    @FromDate DATE, @ToDate DATE, @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT dept.Name AS DepartmentName, ISNULL(SUM(v.ConsultationFee), 0) AS Revenue
    FROM Departments dept
    LEFT JOIN Doctors doc ON doc.DepartmentId = dept.Id
    LEFT JOIN OpdVisits v ON v.DoctorId = doc.Id AND v.IsDeleted = 0
        AND CAST(v.VisitDateTime AS DATE) BETWEEN @FromDate AND @ToDate
    WHERE dept.BranchId = @BranchId
    GROUP BY dept.Name
    ORDER BY Revenue DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_BedOccupancy
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT w.Name AS WardName, COUNT(b.Id) AS TotalBeds,
           SUM(CASE WHEN b.Status = 'Occupied' THEN 1 ELSE 0 END) AS Occupied,
           SUM(CASE WHEN b.Status = 'Available' THEN 1 ELSE 0 END) AS Available
    FROM Wards w
    JOIN Rooms r ON r.WardId = w.Id
    JOIN Beds b ON b.RoomId = r.Id
    WHERE b.IsDeleted = 0 AND w.BranchId = @BranchId
    GROUP BY w.Name
    ORDER BY w.Name;
END
GO
