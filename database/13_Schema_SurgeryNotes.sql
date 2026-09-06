USE HMS_DB;
GO

-- Pre-op notes captured on the Schedule Surgery form - distinct from OperationNotes, which is the post-op
-- summary filled in when the surgery is completed, so completing a surgery never overwrites these.
ALTER TABLE Surgeries ADD Notes NVARCHAR(400) NULL;
GO
