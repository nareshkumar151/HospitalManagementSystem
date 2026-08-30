/* ============================================================================
   Incremental schema update: Razorpay order tracking.
   Run once against an already-provisioned HMS_DB (01_Schema.sql already applied).
   Safe to re-run - guarded by IF NOT EXISTS.
   ============================================================================ */
USE HMS_DB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'RazorpayOrders')
BEGIN
    CREATE TABLE RazorpayOrders (
        Id                  INT IDENTITY(1,1) PRIMARY KEY,
        BillId              INT NOT NULL REFERENCES Bills(Id),
        RazorpayOrderId     NVARCHAR(64) NOT NULL UNIQUE,
        RazorpayPaymentId   NVARCHAR(64) NULL,
        AmountInPaise       INT NOT NULL,
        Status              NVARCHAR(20) NOT NULL DEFAULT 'Created', -- Created | Paid | Failed
        CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        PaidAt              DATETIME2 NULL
    );
    CREATE INDEX IX_RazorpayOrders_BillId ON RazorpayOrders(BillId);
    PRINT 'Created table RazorpayOrders.';
END
GO
