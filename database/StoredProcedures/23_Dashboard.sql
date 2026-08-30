USE HMS_DB;
GO

/* Module 24: Dashboard - single round-trip summary for the role-aware landing page. */
CREATE OR ALTER PROCEDURE sp_Dashboard_GetSummary
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(SYSUTCDATETIME() AS DATE);

    SELECT
        (SELECT COUNT(*) FROM Appointments WHERE BranchId = @BranchId AND AppointmentDate = @Today AND IsDeleted = 0) AS TodaysPatients,
        (SELECT ISNULL(SUM(PaidAmount), 0) FROM Bills WHERE BranchId = @BranchId AND CAST(BillDate AS DATE) = @Today AND IsDeleted = 0) AS TodaysRevenue,
        (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE CAST(SUM(CASE WHEN b.Status='Occupied' THEN 1 ELSE 0 END) AS DECIMAL(5,2)) / COUNT(*) * 100 END
         FROM Beds b JOIN Rooms r ON r.Id = b.RoomId JOIN Wards w ON w.Id = r.WardId WHERE w.BranchId = @BranchId AND b.IsDeleted = 0) AS BedOccupancyPercent,
        (SELECT COUNT(*) FROM Bills WHERE BranchId = @BranchId AND Status IN ('Pending','PartiallyPaid') AND IsDeleted = 0) AS PendingBillsCount,
        (SELECT COUNT(*) FROM Doctors WHERE BranchId = @BranchId AND IsActive = 1 AND IsDeleted = 0) AS AvailableDoctorsCount,
        (SELECT COUNT(*) FROM Surgeries s JOIN IpdAdmissions a ON a.Id = s.IpdAdmissionId
         WHERE a.BranchId = @BranchId AND CAST(s.ScheduledAt AS DATE) = @Today AND s.IsDeleted = 0) AS TodaysSurgeriesCount;

    SELECT Id AS MedicineId, MedicineName, Stock, ReorderLevel
    FROM Medicines WHERE BranchId = @BranchId AND Stock <= ReorderLevel AND IsDeleted = 0
    ORDER BY Stock;
END
GO
