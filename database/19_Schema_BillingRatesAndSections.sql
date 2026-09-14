USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   Provisional-bill redesign: line items now carry which printed section they
   belong to (Room Tariff / Consultation / Investigation / General Service /
   Others - matching the reference hospital bill format) and their own date,
   since one bill can cover charges from several different days of a stay.
   Both nullable - existing bills/items print exactly as before (grouped
   under "Others", dated to the bill itself) until re-saved.
   --------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BillItems') AND name = 'Section')
    ALTER TABLE BillItems ADD Section NVARCHAR(30) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BillItems') AND name = 'ItemDate')
    ALTER TABLE BillItems ADD ItemDate DATETIME2 NULL;
GO

/* ---------------------------------------------------------------------------
   Rate master for the three charge categories that had no admin-editable
   source of truth before (Room Tariff already lives on Rooms.DailyCharge,
   Consultation on Doctors.ConsultationFee, Investigation on LabTestCatalog -
   this covers the rest): Nurse Charges, General Service (IV Cannula,
   Nebulization, etc.), and Others (IP Admission Charges, MRD, ...). A flat
   name+rate catalog, same shape as LabTestCatalog, managed by Administrator
   and used by Generate Bill to prefill a line item's description/rate.
   --------------------------------------------------------------------------- */
CREATE TABLE ChargeCatalog (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    Category   NVARCHAR(30) NOT NULL,   -- NurseCharges | GeneralService | Others
    ItemName   NVARCHAR(150) NOT NULL,
    Rate       DECIMAL(10,2) NOT NULL DEFAULT 0,
    IsActive   BIT NOT NULL DEFAULT 1,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsDeleted  BIT NOT NULL DEFAULT 0
);
GO

IF NOT EXISTS (SELECT 1 FROM ChargeCatalog)
BEGIN
    INSERT INTO ChargeCatalog (Category, ItemName, Rate) VALUES
        ('NurseCharges', 'Nurse Charges', 1700.00),
        ('GeneralService', 'IV Cannula', 250.00),
        ('GeneralService', 'Nebulization', 100.00),
        ('GeneralService', 'Injection Administration', 100.00),
        ('GeneralService', 'Dressing', 150.00),
        ('Others', 'IP Admission Charges', 500.00),
        ('Others', 'MRD', 500.00);
END
GO

/* Receipt numbering for payments - the provisional bill's receipt history table prints this, same NextNumber
   convention as BillNumber/AdmissionNumber. Nullable so existing payments (recorded before this column
   existed) keep printing fine - just without a receipt number. */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Payments') AND name = 'ReceiptNumber')
    ALTER TABLE Payments ADD ReceiptNumber NVARCHAR(30) NULL;
GO

PRINT 'BillItems.Section/ItemDate, ChargeCatalog, Payments.ReceiptNumber added.';
GO
