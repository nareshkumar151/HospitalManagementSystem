USE HMS_DB;
GO

/* ---------------------------------------------------------------------------
   APPOINTMENT ACTION REQUESTS

   A doctor cannot cancel an appointment directly - they can only request a
   Cancel/Transfer/Refer, which Administrator/Receptionist review and action.
   Approving any request type cancels the underlying appointment (freeing the
   slot); a Transfer/Refer approval still requires reception to book the
   patient elsewhere manually, same as it would operationally either way.
   --------------------------------------------------------------------------- */
CREATE TABLE AppointmentRequests (
    Id                  INT IDENTITY(1,1) PRIMARY KEY,
    AppointmentId       INT NOT NULL REFERENCES Appointments(Id),
    RequestedByDoctorId INT NOT NULL REFERENCES Doctors(Id),
    RequestType         NVARCHAR(20) NOT NULL,  -- Cancel | Transfer | Refer
    Reason              NVARCHAR(400) NOT NULL,
    Status              NVARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending | Approved | Rejected
    ResolvedByUserId    INT NULL REFERENCES Users(Id),
    ResolutionNotes     NVARCHAR(400) NULL,
    CreatedAt           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    ResolvedAt          DATETIME2 NULL,
    IsDeleted           BIT NOT NULL DEFAULT 0
);
GO

CREATE INDEX IX_AppointmentRequests_Status ON AppointmentRequests(Status);
GO
