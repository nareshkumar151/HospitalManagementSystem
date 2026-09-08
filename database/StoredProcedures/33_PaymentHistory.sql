USE HMS_DB;
GO

-- Billing section's Payment History - every payment/refund collected in a branch, keyed off the payment's
-- own date (Payments.PaidAt), not the underlying bill's BillDate - the same fix applied to the Dashboard's
-- revenue tiles, so a bill raised on one day but paid on another shows up under the day it was actually paid.
CREATE OR ALTER PROCEDURE sp_Payment_GetHistory
    @BranchId INT, @FromDate DATE = NULL, @ToDate DATE = NULL, @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT pay.Id, pay.BillId, b.BillNumber, b.PatientId, p.FullName AS PatientName, p.UHID AS Uhid,
           pay.Amount, pay.Mode, pay.TransactionReference, pay.IsRefund, pay.PaidAt, u.Username AS ReceivedByName
    FROM Payments pay
    JOIN Bills b ON b.Id = pay.BillId
    JOIN Patients p ON p.Id = b.PatientId
    JOIN Users u ON u.Id = pay.ReceivedByUserId
    WHERE b.BranchId = @BranchId AND pay.IsDeleted = 0
      AND (@FromDate IS NULL OR CAST(pay.PaidAt AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(pay.PaidAt AS DATE) <= @ToDate)
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%' OR b.BillNumber LIKE '%' + @Search + '%')
    ORDER BY pay.PaidAt DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount
    FROM Payments pay
    JOIN Bills b ON b.Id = pay.BillId
    JOIN Patients p ON p.Id = b.PatientId
    WHERE b.BranchId = @BranchId AND pay.IsDeleted = 0
      AND (@FromDate IS NULL OR CAST(pay.PaidAt AS DATE) >= @FromDate)
      AND (@ToDate IS NULL OR CAST(pay.PaidAt AS DATE) <= @ToDate)
      AND (@Search IS NULL OR p.FullName LIKE '%' + @Search + '%' OR p.UHID LIKE '%' + @Search + '%' OR b.BillNumber LIKE '%' + @Search + '%');
END
GO
