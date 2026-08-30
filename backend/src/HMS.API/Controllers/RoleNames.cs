namespace HMS.API.Controllers;

/// <summary>
/// Mirrors HMS.Domain.Enums.RoleName - kept as strings for use in [Authorize(Roles = "...")] attributes.
///
/// SuperAdmin is not added to every combined constant below: instead, JwtTokenService issues a SuperAdmin
/// login a *second* "Administrator" role claim alongside their primary "SuperAdmin" claim, so every
/// existing [Authorize(Roles = "...Administrator...")] check - anywhere in the API, including ad-hoc
/// combinations that don't use these shared constants - already passes for SuperAdmin without needing to
/// touch each attribute individually. Use SuperAdminOnly only for the handful of actions Administrator
/// itself must NOT be able to do (creating/deleting Hospitals and Branches).
/// </summary>
public static class RoleNames
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Administrator = "Administrator";
    public const string Receptionist = "Receptionist";
    public const string Doctor = "Doctor";
    public const string Nurse = "Nurse";
    public const string Pharmacist = "Pharmacist";
    public const string LabTechnician = "LabTechnician";
    public const string HR = "HR";
    public const string Patient = "Patient";

    public const string FrontDesk = Administrator + "," + Receptionist;
    public const string ClinicalStaff = Administrator + "," + Doctor + "," + Nurse;
    public const string AdminOnly = Administrator;

    /// <summary>
    /// Roles that actually have an <c>Employees</c> row (see Module 16/21/22) and so can use attendance
    /// self-service - own check-in/out history, applying for leave. Deliberately excludes Doctor: doctors
    /// are tracked in the separate <c>Doctors</c> table (Module 17), so a Doctor's <c>linkedProfileId</c>
    /// claim is a Doctors.Id, not an Employees.Id - treating it as one here would file leave against
    /// whichever Employee happens to share that number. Also excludes Patient (irrelevant) and
    /// SuperAdmin/Administrator, who already reach every HR endpoint through <see cref="AdminOnly"/>.
    /// </summary>
    public const string EmployeeSelfService = Administrator + "," + HR + "," + Nurse + "," + Pharmacist + "," + LabTechnician + "," + Receptionist;

    /// <summary> Exclusively for Hospital/Branch structural changes - not satisfied by the Administrator secondary claim. </summary>
    public const string SuperAdminOnly = SuperAdmin;
}
