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
    @UserId INT, @UnreadOnly BIT = 0, @PageNumber INT = 1, @PageSize INT = 20, @Search NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, UserId, PatientId, Channel, Category, Message, IsSent, SentAt, IsRead, CreatedAt
    FROM Notifications
    WHERE UserId = @UserId AND IsDeleted = 0 AND (@UnreadOnly = 0 OR IsRead = 0)
      AND (@Search IS NULL OR Message LIKE '%' + @Search + '%' OR Category LIKE '%' + @Search + '%')
    ORDER BY CreatedAt DESC
    OFFSET (@PageNumber - 1) * @PageSize ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(*) AS TotalCount FROM Notifications
    WHERE UserId = @UserId AND IsDeleted = 0 AND (@UnreadOnly = 0 OR IsRead = 0)
      AND (@Search IS NULL OR Message LIKE '%' + @Search + '%' OR Category LIKE '%' + @Search + '%');
END
GO
