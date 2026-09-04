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
    // GeneralMedical/GeneralSurgical/Emergency are kept (not removed) purely so existing IpdAdmissions
    // rows written with these values keep deserializing correctly - the Admit form now only offers the
    // list below.
    GeneralMedical,
    GeneralSurgical,
    Emergency,
    MedicalManagement,
    SurgicalManagement,
    PostOpCare,
    Observation,
    Daycare,
    ICU,
    NICU,
    Delivery,
    PICU
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

/// <summary> Which billing track a bill belongs to - derived, not stored: IPD when the bill is linked to an
/// IpdAdmission, OPD otherwise (including bills linked to an OpdVisit or to neither). Kept separate from
/// <see cref="BillType"/>, which is the finer-grained charge category (Consultation, Pharmacy, ...) that
/// exists on both tracks. </summary>
public enum BillCategory
{
    OPD,
    IPD
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
