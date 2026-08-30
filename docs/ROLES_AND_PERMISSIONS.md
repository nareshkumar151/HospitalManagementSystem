# Roles & Permissions

Mapped directly from SRS Section 5. Enforced via `[Authorize(Roles = "...")]` on every API controller
action (see `HMS.API/Controllers/*.cs`) and mirrored in the frontend's `navConfig.ts` (which nav items each
role sees) and `ProtectedRoute` (which routes each role can reach) — the API is the actual enforcement
point; the frontend guards exist to give each role a clean workspace, not as a security boundary.

| Role | Can do (per SRS, plus later additions) | Where in this codebase |
|---|---|---|
| **SuperAdmin** | Add/delete Hospitals and Branches; everything an Administrator can do, across every hospital | `RoleNames.SuperAdminOnly` gates Hospital/Branch create-update-delete; a SuperAdmin's JWT also carries a secondary `Administrator` role claim (see `JwtTokenService`) so every `AdminOnly`-gated endpoint already works for them without listing SuperAdmin everywhere |
| **Administrator** | Manage Departments, Doctors, Employees, Billing, Reports, Medicines *within* their hospital's branches - cannot create/delete Hospitals or Branches themselves | `RoleNames.AdminOnly` gates Doctors/Departments/Inventory/Vendors/Reports management |
| **Receptionist** | Register/update patients, book/reschedule/cancel appointments, admit patients, prepare bills, collect payment (Cash or Razorpay), add insurance/referral details, discharge* | `RoleNames.FrontDesk` (= Administrator + Receptionist) |
| **Doctor** | View appointments, diagnose, prescribe, request lab/radiology tests, doctor/OT notes, discharge summary, digital signature | Doctor Console page; `linkedProfileId` claim ties the login to a `Doctors` row |
| **Nurse** | Update vitals, assign bed, medication tracking, patient care notes, view/upload reports | Nursing page; IPD vitals endpoints |
| **Pharmacist** | Dispense medicine; add, edit, and purchase-stock for medicines (full inventory CRUD, not just dispensing) | Pharmacy page - "Add Medicine" / "Edit" / "Purchase Stock" |
| **Lab Technician** | Collect samples, upload results, generate reports | Laboratory/Radiology pages |
| **HR** | Employee management, attendance, payroll | Employees/Attendance/Payroll pages, shared with Administrator |
| **Patient** | Book appointments, view reports, download prescription, view/pay bills (Razorpay or view receipt PDF) | Patient Portal page; every patient-scoped endpoint additionally checks `CurrentLinkedProfileId == requested patientId` |

\* Discharge *summary creation* (writing diagnosis/condition/medicines-advised) is a Doctor action per SRS
("Doctor can ... Write Discharge Summary"); Receptionist's SRS-listed "Discharge patient" maps to the
billing/checkout side of that same workflow (final bill settlement), which is why both
`DischargeController` (Doctor-only) and `BillingController` (Receptionist) touch the discharge flow at
different points — see the workflow diagram in the SRS ("Bill Settlement → Discharge Summary").

## Where a new endpoint's role list should come from

1. Find the closest bullet in SRS Section 5 for the acting role.
2. Use the matching constant in `HMS.API.Controllers.RoleNames` (`Administrator`, `FrontDesk`,
   `ClinicalStaff`, `AdminOnly`, or a literal `RoleNames.X + "," + RoleNames.Y` combination) rather than a
   raw string, so a future rename only touches one file.
3. If the endpoint returns data scoped to one patient/doctor, add the `CurrentLinkedProfileId` check seen
   in `PatientsController.GetById` / `PrescriptionsController.GetByPatient` rather than relying on role
   alone.
