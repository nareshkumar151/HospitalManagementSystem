USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_RazorpayOrder_Insert
    @BillId INT, @RazorpayOrderId NVARCHAR(64), @AmountInPaise INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO RazorpayOrders (BillId, RazorpayOrderId, AmountInPaise)
    VALUES (@BillId, @RazorpayOrderId, @AmountInPaise);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_RazorpayOrder_GetByOrderId
    @RazorpayOrderId NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, BillId, RazorpayOrderId, RazorpayPaymentId, AmountInPaise, Status, CreatedAt, PaidAt
    FROM RazorpayOrders WHERE RazorpayOrderId = @RazorpayOrderId;
END
GO

CREATE OR ALTER PROCEDURE sp_RazorpayOrder_MarkPaid
    @RazorpayOrderId NVARCHAR(64), @RazorpayPaymentId NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE RazorpayOrders
    SET Status = 'Paid', RazorpayPaymentId = @RazorpayPaymentId, PaidAt = SYSUTCDATETIME()
    WHERE RazorpayOrderId = @RazorpayOrderId;
END
GO

/* Idempotency guard: a Razorpay Checkout success callback firing twice (page refresh, retry) must not
   double-credit the bill - look up whether this payment id was already recorded before inserting again. */
CREATE OR ALTER PROCEDURE sp_Payment_GetByTransactionReference
    @TransactionReference NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT TOP 1 Id, BillId, Amount, Mode, TransactionReference, IsRefund, PaidAt
    FROM Payments WHERE TransactionReference = @TransactionReference AND IsDeleted = 0
    ORDER BY Id DESC;
END
GO
