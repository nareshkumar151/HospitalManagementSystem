USE HMS_DB;
GO

/* Module 24: Dashboard - single round-trip summary for the role-aware landing page. */
-- @ReceptionistUserId personalizes TodaysRevenue to "payments this front-desk user personally collected
-- today" (Payments.ReceivedByUserId, set on every collect-payment/Razorpay-verify call) instead of the
-- branch-wide total - two different receptionists naturally show different numbers based on who actually
-- took the money. Deliberately keyed off the payment's own date, not the patient's registration date or
-- the appointment's booking date - a bill collected today for an existing/returning patient still counts,
-- which an earlier registration-date-based version of this query got wrong. Pass NULL (Administrator,
-- SuperAdmin, etc.) for the unscoped branch-wide figure.
CREATE OR ALTER PROCEDURE sp_Dashboard_GetSummary
    @BranchId INT, @ReceptionistUserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(SYSUTCDATETIME() AS DATE);

    SELECT
        (SELECT COUNT(*) FROM Appointments WHERE BranchId = @BranchId AND AppointmentDate = @Today AND IsDeleted = 0) AS TodaysPatients,
        (CASE WHEN @ReceptionistUserId IS NULL
            THEN (SELECT ISNULL(SUM(PaidAmount), 0) FROM Bills WHERE BranchId = @BranchId AND CAST(BillDate AS DATE) = @Today AND IsDeleted = 0)
            ELSE (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND pay.ReceivedByUserId = @ReceptionistUserId
                  AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0
            )
         END) AS TodaysRevenue,
        -- OPD/IPD split of the same figure above - a bill counts as IPD only when linked to an admission.
        (CASE WHEN @ReceptionistUserId IS NULL
            THEN (SELECT ISNULL(SUM(PaidAmount), 0) FROM Bills WHERE BranchId = @BranchId AND CAST(BillDate AS DATE) = @Today AND IsDeleted = 0 AND IpdAdmissionId IS NULL)
            ELSE (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND pay.ReceivedByUserId = @ReceptionistUserId
                  AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0 AND b.IpdAdmissionId IS NULL
            )
         END) AS TodaysOpdRevenue,
        (CASE WHEN @ReceptionistUserId IS NULL
            THEN (SELECT ISNULL(SUM(PaidAmount), 0) FROM Bills WHERE BranchId = @BranchId AND CAST(BillDate AS DATE) = @Today AND IsDeleted = 0 AND IpdAdmissionId IS NOT NULL)
            ELSE (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND pay.ReceivedByUserId = @ReceptionistUserId
                  AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0 AND b.IpdAdmissionId IS NOT NULL
            )
         END) AS TodaysIpdRevenue,
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
