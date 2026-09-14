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
    @BranchId INT, @ReceptionistUserId INT = NULL, @DoctorId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    -- +330 minutes = IST (UTC+5:30, this hospital's own timezone) - the raw UTC date stays on yesterday
    -- until 5:30am IST, which used to make every "Today's ..." tile quietly show yesterday's figures for
    -- the first few hours of each day (see the same fix in 21_HR.sql's Attendance procs).
    DECLARE @Today DATE = CAST(DATEADD(MINUTE, 330, SYSUTCDATETIME()) AS DATE);
    DECLARE @Tomorrow DATE = DATEADD(DAY, 1, @Today);

    SELECT
        (SELECT COUNT(*) FROM Appointments WHERE BranchId = @BranchId AND AppointmentDate = @Today AND IsDeleted = 0) AS TodaysPatients,
        -- Keyed off Payments.PaidAt (not Bills.BillDate) for every role, receptionist or not: a bill raised
        -- on an earlier date but paid today must still count as today's revenue. The branch-wide figure
        -- (NULL) sums every collector's payments; the receptionist figure narrows to their own.
        (CASE WHEN @ReceptionistUserId IS NULL
            THEN (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0
            )
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
            THEN (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0 AND b.IpdAdmissionId IS NULL
            )
            ELSE (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND pay.ReceivedByUserId = @ReceptionistUserId
                  AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0 AND b.IpdAdmissionId IS NULL
            )
         END) AS TodaysOpdRevenue,
        (CASE WHEN @ReceptionistUserId IS NULL
            THEN (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0 AND b.IpdAdmissionId IS NOT NULL
            )
            ELSE (
                SELECT ISNULL(SUM(pay.Amount), 0)
                FROM Payments pay
                JOIN Bills b ON b.Id = pay.BillId
                WHERE b.BranchId = @BranchId AND pay.ReceivedByUserId = @ReceptionistUserId
                  AND CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0 AND b.IpdAdmissionId IS NOT NULL
            )
         END) AS TodaysIpdRevenue,
        -- Branch-wide count of currently-admitted patients - Reception/Administrator's own "IPD Patients"
        -- tile, unlike DoctorIpPatientsCount below which is scoped to one doctor.
        (SELECT COUNT(*) FROM IpdAdmissions WHERE BranchId = @BranchId AND Status = 'Admitted' AND IsDeleted = 0) AS IpdPatientsCount,
        (SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE CAST(SUM(CASE WHEN b.Status='Occupied' THEN 1 ELSE 0 END) AS DECIMAL(5,2)) / COUNT(*) * 100 END
         FROM Beds b JOIN Rooms r ON r.Id = b.RoomId JOIN Wards w ON w.Id = r.WardId WHERE w.BranchId = @BranchId AND b.IsDeleted = 0) AS BedOccupancyPercent,
        (SELECT COUNT(*) FROM Bills WHERE BranchId = @BranchId AND Status IN ('Pending','PartiallyPaid') AND IsDeleted = 0) AS PendingBillsCount,
        (SELECT COUNT(*) FROM Doctors WHERE BranchId = @BranchId AND IsActive = 1 AND IsDeleted = 0) AS AvailableDoctorsCount,
        (SELECT COUNT(*) FROM Surgeries s JOIN IpdAdmissions a ON a.Id = s.IpdAdmissionId
         WHERE a.BranchId = @BranchId AND CAST(s.ScheduledAt AS DATE) = @Today AND s.IsDeleted = 0) AS TodaysSurgeriesCount,
        -- Branch-wide (not per-doctor) version of "discharged today" - Nurse Dashboard's own tiles.
        (SELECT COUNT(*) FROM IpdAdmissions WHERE BranchId = @BranchId AND Status = 'Discharged' AND IsDeleted = 0
         AND CAST(DischargeDate AS DATE) = @Today) AS DischargedTodayCount,
        (SELECT COUNT(*) FROM IpdAdmissions a JOIN Patients p ON p.Id = a.PatientId
         WHERE a.BranchId = @BranchId AND a.Status = 'Admitted' AND a.IsDeleted = 0
           AND p.InsuranceCompany IS NOT NULL AND p.InsuranceCompany <> '') AS InsurancePatientsCount,
        -- Doctor Dashboard tiles - all scoped to @DoctorId (NULL for every other role, so these read 0).
        (SELECT COUNT(*) FROM Appointments WHERE DoctorId = @DoctorId AND AppointmentDate = @Today AND IsDeleted = 0) AS DoctorTodaysAppointments,
        (SELECT COUNT(*) FROM IpdAdmissions WHERE DoctorId = @DoctorId AND Status = 'Admitted' AND IsDeleted = 0) AS DoctorIpPatientsCount,
        -- "Planned Discharges" - the schema has no separate planned-discharge-date field, so this counts
        -- this doctor's patients actually discharged today (the closest real number to "discharges due today").
        (SELECT COUNT(*) FROM IpdAdmissions WHERE DoctorId = @DoctorId AND Status = 'Discharged' AND IsDeleted = 0
         AND CAST(DischargeDate AS DATE) = @Today) AS DoctorPlannedDischargesCount,
        (SELECT COUNT(*) FROM Surgeries s JOIN IpdAdmissions a ON a.Id = s.IpdAdmissionId
         WHERE s.SurgeonDoctorId = @DoctorId AND CAST(s.ScheduledAt AS DATE) = @Today AND s.IsDeleted = 0) AS DoctorTodaysSurgeriesCount,
        (SELECT COUNT(*) FROM Appointments WHERE DoctorId = @DoctorId AND AppointmentDate = @Tomorrow AND IsDeleted = 0) AS DoctorTomorrowAppointmentsCount,
        (SELECT COUNT(*) FROM IpdAdmissions a JOIN Patients p ON p.Id = a.PatientId
         WHERE a.DoctorId = @DoctorId AND a.Status = 'Admitted' AND a.IsDeleted = 0
           AND p.InsuranceCompany IS NOT NULL AND p.InsuranceCompany <> '') AS DoctorInsurancePatientsCount;

    SELECT Id AS MedicineId, MedicineName, Stock, ReorderLevel
    FROM Medicines WHERE BranchId = @BranchId AND Stock <= ReorderLevel AND IsDeleted = 0
    ORDER BY Stock;
END
GO

-- SuperAdmin's own dashboard: no single branch/hospital of their own, so the per-branch summary above
-- (which would silently fall back to branch/hospital #1) doesn't make sense for them. This is the
-- platform-wide view instead - totals across every hospital, plus a per-hospital breakdown row so they can
-- see at a glance which hospital is busiest.
CREATE OR ALTER PROCEDURE sp_Dashboard_GetPlatformSummary
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Today DATE = CAST(DATEADD(MINUTE, 330, SYSUTCDATETIME()) AS DATE);

    SELECT
        (SELECT COUNT(*) FROM Hospitals WHERE IsDeleted = 0) AS TotalHospitals,
        (SELECT COUNT(*) FROM Branches WHERE IsDeleted = 0) AS TotalBranches,
        (SELECT COUNT(*) FROM Doctors WHERE IsDeleted = 0 AND IsActive = 1) AS TotalDoctors,
        (SELECT COUNT(*) FROM Patients WHERE IsDeleted = 0) AS TotalPatients,
        (SELECT COUNT(*) FROM Employees WHERE IsDeleted = 0 AND IsActive = 1) AS TotalEmployees,
        (SELECT COUNT(*) FROM Appointments WHERE AppointmentDate = @Today AND IsDeleted = 0) AS TodaysAppointments,
        (SELECT ISNULL(SUM(pay.Amount), 0) FROM Payments pay
         WHERE CAST(pay.PaidAt AS DATE) = @Today AND pay.IsRefund = 0 AND pay.IsDeleted = 0) AS TodaysRevenue,
        (SELECT COUNT(*) FROM Bills WHERE Status IN ('Pending','PartiallyPaid') AND IsDeleted = 0) AS PendingBillsCount;

    SELECT
        h.Id AS HospitalId, h.Name AS HospitalName, h.ThemeColor,
        (SELECT COUNT(*) FROM Branches br WHERE br.HospitalId = h.Id AND br.IsDeleted = 0) AS BranchCount,
        (SELECT COUNT(*) FROM Doctors d WHERE d.HospitalId = h.Id AND d.IsDeleted = 0 AND d.IsActive = 1) AS DoctorCount,
        (SELECT COUNT(*) FROM Patients p WHERE p.HospitalId = h.Id AND p.IsDeleted = 0) AS PatientCount
    FROM Hospitals h
    WHERE h.IsDeleted = 0
    ORDER BY h.Name;
END
GO
