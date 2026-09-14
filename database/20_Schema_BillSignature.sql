USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   Signature option for Billing - the person generating a bill (Generate Bill,
   OPD/IPD) can now sign it with a stylus instead of the printed receipt
   always carrying a blank "Signature" line. NVARCHAR(MAX), same convention
   as every other stylus-capable field (05_Schema_OpdHandwriting.sql) - a
   captured signature is a data:image/png;base64,... string living in the
   same column typed text would use; nullable so a bill generated without
   signing still prints exactly as before (a blank line to sign by hand).
   --------------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Bills') AND name = 'PreparedBySignature')
    ALTER TABLE Bills ADD PreparedBySignature NVARCHAR(MAX) NULL;
GO

PRINT 'Bills.PreparedBySignature added.';
GO
