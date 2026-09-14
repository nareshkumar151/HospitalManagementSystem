USE HMS_DB;
GO

/* Rate master for Nurse Charges / General Service / Others - see 19_Schema_BillingRatesAndSections.sql.
   Same CRUD shape as sp_LabTestCatalog_* (12_Laboratory.sql). */

CREATE OR ALTER PROCEDURE sp_ChargeCatalog_GetAll
    @Category NVARCHAR(30) = NULL, @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Category, ItemName, Rate, IsActive
    FROM ChargeCatalog
    WHERE IsDeleted = 0
      AND (@Category IS NULL OR Category = @Category)
      AND (@IncludeInactive = 1 OR IsActive = 1)
    ORDER BY Category, ItemName;
END
GO

CREATE OR ALTER PROCEDURE sp_ChargeCatalog_Insert
    @Category NVARCHAR(30), @ItemName NVARCHAR(150), @Rate DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO ChargeCatalog (Category, ItemName, Rate) VALUES (@Category, @ItemName, @Rate);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_ChargeCatalog_Update
    @Id INT, @Category NVARCHAR(30), @ItemName NVARCHAR(150), @Rate DECIMAL(10,2), @IsActive BIT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ChargeCatalog SET Category = @Category, ItemName = @ItemName, Rate = @Rate, IsActive = @IsActive WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_ChargeCatalog_Delete
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE ChargeCatalog SET IsDeleted = 1 WHERE Id = @Id;
END
GO
