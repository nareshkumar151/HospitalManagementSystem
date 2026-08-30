USE HMS_DB;
GO

/* ==================== Wards ==================== */
CREATE OR ALTER PROCEDURE sp_Ward_GetAll
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Name, Type, BranchId FROM Wards WHERE BranchId = @BranchId AND IsDeleted = 0 ORDER BY Name;
END
GO

CREATE OR ALTER PROCEDURE sp_Ward_Insert
    @Name NVARCHAR(100), @Type NVARCHAR(20), @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Wards (Name, Type, BranchId) VALUES (@Name, @Type, @BranchId);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

/* ==================== Rooms ==================== */
CREATE OR ALTER PROCEDURE sp_Room_GetAll
    @WardId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, WardId, RoomNumber, Type, DailyCharge FROM Rooms
    WHERE IsDeleted = 0 AND (@WardId IS NULL OR WardId = @WardId) ORDER BY RoomNumber;
END
GO

CREATE OR ALTER PROCEDURE sp_Room_Insert
    @WardId INT, @RoomNumber NVARCHAR(20), @Type NVARCHAR(20), @DailyCharge DECIMAL(10,2)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Rooms (WardId, RoomNumber, Type, DailyCharge) VALUES (@WardId, @RoomNumber, @Type, @DailyCharge);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

/* ==================== Beds ==================== */
CREATE OR ALTER PROCEDURE sp_Bed_GetAll
    @Status NVARCHAR(20) = NULL, @RoomType NVARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT b.Id, b.RoomId, r.RoomNumber, r.Type AS RoomType, b.BedNumber, b.Status, b.IsIcu
    FROM Beds b JOIN Rooms r ON r.Id = b.RoomId
    WHERE b.IsDeleted = 0
      AND (@Status IS NULL OR b.Status = @Status)
      AND (@RoomType IS NULL OR r.Type = @RoomType)
    ORDER BY r.RoomNumber, b.BedNumber;
END
GO

CREATE OR ALTER PROCEDURE sp_Bed_Insert
    @RoomId INT, @BedNumber NVARCHAR(20), @IsIcu BIT
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Beds (RoomId, BedNumber, IsIcu) VALUES (@RoomId, @BedNumber, @IsIcu);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Bed_UpdateStatus
    @Id INT, @Status NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Beds SET Status = @Status WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Bed_GetOccupancySummary
    @BranchId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        COUNT(*) AS TotalBeds,
        SUM(CASE WHEN b.Status = 'Occupied' THEN 1 ELSE 0 END) AS OccupiedBeds,
        SUM(CASE WHEN b.Status = 'Available' THEN 1 ELSE 0 END) AS AvailableBeds,
        SUM(CASE WHEN b.IsIcu = 1 THEN 1 ELSE 0 END) AS IcuBeds,
        SUM(CASE WHEN b.IsIcu = 1 AND b.Status = 'Occupied' THEN 1 ELSE 0 END) AS IcuOccupied
    FROM Beds b
    JOIN Rooms r ON r.Id = b.RoomId
    JOIN Wards w ON w.Id = r.WardId
    WHERE w.BranchId = @BranchId AND b.IsDeleted = 0;
END
GO
