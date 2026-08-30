USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Report_PatientRegister
    @FromDate DATE, @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UHID, FullName, Mobile, CreatedAt AS RegisteredOn
    FROM Patients
    WHERE IsDeleted = 0 AND CAST(CreatedAt AS DATE) BETWEEN @FromDate AND @ToDate
    ORDER BY CreatedAt;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_DailyVisits
    @FromDate DATE, @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    ;WITH Opd AS (
        SELECT CAST(VisitDateTime AS DATE) AS D, COUNT(*) AS Cnt FROM OpdVisits
        WHERE IsDeleted = 0 AND CAST(VisitDateTime AS DATE) BETWEEN @FromDate AND @ToDate
        GROUP BY CAST(VisitDateTime AS DATE)
    ), Ipd AS (
        SELECT CAST(AdmissionDate AS DATE) AS D, COUNT(*) AS Cnt FROM IpdAdmissions
        WHERE IsDeleted = 0 AND CAST(AdmissionDate AS DATE) BETWEEN @FromDate AND @ToDate
        GROUP BY CAST(AdmissionDate AS DATE)
    )
    SELECT COALESCE(o.D, i.D) AS [Date], ISNULL(o.Cnt, 0) AS OpdCount, ISNULL(i.Cnt, 0) AS IpdCount
    FROM Opd o FULL OUTER JOIN Ipd i ON o.D = i.D
    ORDER BY [Date];
END
GO

CREATE OR ALTER PROCEDURE sp_Report_DoctorPerformance
    @FromDate DATE, @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT doc.Id AS DoctorId, doc.FullName AS DoctorName, COUNT(v.Id) AS ConsultationCount,
           ISNULL(SUM(v.ConsultationFee), 0) AS RevenueGenerated
    FROM Doctors doc
    LEFT JOIN OpdVisits v ON v.DoctorId = doc.Id AND v.IsDeleted = 0
        AND CAST(v.VisitDateTime AS DATE) BETWEEN @FromDate AND @ToDate
    GROUP BY doc.Id, doc.FullName
    ORDER BY RevenueGenerated DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_Revenue
    @FromDate DATE, @ToDate DATE
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
    WHERE IsDeleted = 0 AND CAST(BillDate AS DATE) BETWEEN @FromDate AND @ToDate
    GROUP BY CAST(BillDate AS DATE)
    ORDER BY [Date];
END
GO

CREATE OR ALTER PROCEDURE sp_Report_PharmacyStock
AS
BEGIN
    SET NOCOUNT ON;
    SELECT MedicineName, Stock, ExpiryDate, Stock * SellingPrice AS Value
    FROM Medicines WHERE IsDeleted = 0
    ORDER BY MedicineName;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_DepartmentWiseRevenue
    @FromDate DATE, @ToDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    SELECT dept.Name AS DepartmentName, ISNULL(SUM(v.ConsultationFee), 0) AS Revenue
    FROM Departments dept
    LEFT JOIN Doctors doc ON doc.DepartmentId = dept.Id
    LEFT JOIN OpdVisits v ON v.DoctorId = doc.Id AND v.IsDeleted = 0
        AND CAST(v.VisitDateTime AS DATE) BETWEEN @FromDate AND @ToDate
    GROUP BY dept.Name
    ORDER BY Revenue DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_Report_BedOccupancy
AS
BEGIN
    SET NOCOUNT ON;
    SELECT w.Name AS WardName, COUNT(b.Id) AS TotalBeds,
           SUM(CASE WHEN b.Status = 'Occupied' THEN 1 ELSE 0 END) AS Occupied,
           SUM(CASE WHEN b.Status = 'Available' THEN 1 ELSE 0 END) AS Available
    FROM Wards w
    JOIN Rooms r ON r.WardId = w.Id
    JOIN Beds b ON b.RoomId = r.Id
    WHERE b.IsDeleted = 0
    GROUP BY w.Name
    ORDER BY w.Name;
END
GO
