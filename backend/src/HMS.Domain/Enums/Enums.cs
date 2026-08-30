namespace HMS.Domain.Enums;

/// <summary>
/// System roles as defined in SRS Section 5 (User Roles).
/// Stored in the Roles table too, but kept here for compile-time policy checks.
/// </summary>
public enum RoleName
{
    /// <summary> Platform-level role: manages Hospitals (add/delete) and cross-hospital master data. Sits above Administrator. </summary>
    SuperAdmin,
    Administrator,
    Receptionist,
    Doctor,
    Nurse,
    Pharmacist,
    LabTechnician,
    HR,
    Patient
}

public enum Gender
{
    Male,
    Female,
    Other
}

public enum BloodGroup
{
    Unknown,
    APositive,
    ANegative,
    BPositive,
    BNegative,
    ABPositive,
    ABNegative,
    OPositive,
    ONegative
}

public enum AppointmentType
{
    Online,
    WalkIn
}

public enum AppointmentStatus
{
    Scheduled,
    Completed,
    Cancelled,
    Rescheduled
}

public enum AdmissionType
{
    GeneralMedical,
    GeneralSurgical,
    ICU,
    Emergency
}

public enum RoomType
{
    General,
    SemiPrivate,
    Private,
    Deluxe,
    ICU
}

public enum BedStatus
{
    Available,
    Occupied,
    Reserved,
    Maintenance
}

public enum AdmissionStatus
{
    Admitted,
    Discharged,
    Transferred
}

public enum LabTestStatus
{
    Ordered,
    SampleCollected,
    Processing,
    ReportUploaded,
    Reviewed
}

public enum RadiologyStatus
{
    Ordered,
    Scheduled,
    Completed,
    Reviewed
}

public enum PrescriptionStatus
{
    Active,
    Dispensed,
    Cancelled
}

public enum PaymentMode
{
    Cash,
    Card,
    UPI,
    Insurance
}

public enum BillStatus
{
    Draft,
    Pending,
    PartiallyPaid,
    Paid,
    Refunded
}

public enum BillType
{
    Consultation,
    Admission,
    Lab,
    Pharmacy,
    Operation,
    Room,
    Nursing
}

public enum ClaimStatus
{
    Submitted,
    UnderReview,
    Approved,
    Rejected,
    Settled
}

public enum InventoryItemType
{
    Medicine,
    MedicalEquipment,
    SurgicalItem,
    Consumable
}

public enum StockMovementType
{
    Purchase,
    Sale,
    Return,
    Adjustment,
    Expired
}

public enum LeaveStatus
{
    Requested,
    Approved,
    Rejected
}

public enum NotificationChannel
{
    SMS,
    Email,
    Push
}

public enum NotificationCategory
{
    Appointment,
    LabReady,
    Medicine,
    Billing,
    FollowUp
}
