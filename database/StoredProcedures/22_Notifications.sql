USE HMS_DB;
GO

CREATE OR ALTER PROCEDURE sp_Notification_Insert
    @UserId INT = NULL, @PatientId INT = NULL, @Channel NVARCHAR(10), @Category NVARCHAR(30), @Message NVARCHAR(500)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Notifications (UserId, PatientId, Channel, Category, Message) VALUES (@UserId, @PatientId, @Channel, @Category, @Message);
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewId;
END
GO

CREATE OR ALTER PROCEDURE sp_Notification_MarkSent
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Notifications SET IsSent = 1, SentAt = SYSUTCDATETIME() WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Notification_MarkRead
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Notifications SET IsRead = 1 WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Notification_GetForUser
    @UserId INT, @UnreadOnly BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, PatientId, Channel, Category, Message, IsSent, SentAt, IsRead, CreatedAt
    FROM Notifications
    WHERE UserId = @UserId AND IsDeleted = 0 AND (@UnreadOnly = 0 OR IsRead = 0)
    ORDER BY CreatedAt DESC;
END
GO
