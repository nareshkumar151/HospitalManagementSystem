# Roadmap

## Fully built and verified (live, against the real database)

The complete patient journey from the SRS workflow diagram, tested end-to-end via the running API:

Registration → Appointment booking (with token numbers + slot-conflict checks) → OPD consultation
(free-follow-up detection) → Prescription → Pharmacy dispense (real stock decrement + stock-transaction
log) → Billing (GST/discount computation) → Payment collection (bill status auto-derived) → IPD admission
(bed flips to Occupied transactionally) → Nursing vitals → Discharge (bed flips back to Available, admission
closed) — plus JWT auth, RBAC per role, and the role-aware Dashboard.

Full RBAC, FluentValidation on every request, centralized exception handling, Serilog request logging,
health checks, and rate limiting are wired for the whole API, not just the core flow.

Added on top of that foundation, also verified live end-to-end:

- **Multi-hospital + SuperAdmin** — SuperAdmin adds/deletes Hospitals and Branches (blocked with a clean
  409 if a hospital/branch still has active children); Administrator keeps managing everything within a
  branch as before. Tested: create hospital → create branch → delete blocked while occupied → delete
  succeeds once empty.
- **Pharmacist inventory CRUD** — Pharmacist (not just Administrator) can now add, edit, and purchase-stock
  for medicines from the Pharmacy page, with every stock change still logged to
  `MedicineStockTransactions`.
- **Razorpay payments alongside Cash** — `POST /billing/{id}/razorpay/create-order` +
  `.../razorpay/verify` (signature-verified, order-to-bill bound, idempotent against double callbacks); the
  manual Cash/Card/UPI/Insurance path is untouched. A misconfigured/placeholder Razorpay key fails cleanly
  with "Please use Cash instead" rather than a 500. Patients can pay their own bills online from the portal.
- **PDF generation (QuestPDF)** — Patient Details, Admission Document, Discharge Summary (auto-downloaded
  right after a discharge), and Bill Receipt, all through one shared hospital letterhead/footer.

Two real bugs surfaced and were fixed while building the above (see `docs/ARCHITECTURE.md` for detail): a
SuperAdmin's dual JWT role claims corrupted the frontend's client-side role parsing into an array on page
reload, and - independently - a hard reload on any deep route used to always bounce to `/app/dashboard`
because session restoration ran after the first render instead of before it.

## Functional but intentionally lighter (scaffolded)

These have real API endpoints, real stored procedures, and working list/create UI, but haven't had the
same depth of business-rule and edge-case work as the core flow:

- **Insurance** — claim submission + admin approve/reject. Missing: automatic claim amount reconciliation against a bill.
- **Radiology / Laboratory** — order → collect → upload flow works; report *file* upload is stubbed to a placeholder URL (`pending-upload`) rather than actual file storage.
- **Operation Theatre** — schedule/complete/cancel works; no equipment/resource conflict checking.
- **Medical Records** — IP patient list works; the broader "store prescriptions/lab reports/X-Ray/allergies/vaccination" document library (Module 15) has the table and stored procs but no upload UI beyond what OPD/Lab/Radiology already produce.
- **Employees / Attendance / Payroll** — CRUD + check-in/out + leave approval + payslip generation with PF/ESI all work; no offer-letter PDF rendering (the endpoint returns a logical file path today), no shift-change workflow UI.
- **Inventory / Vendors** — CRUD works; purchase-order → inventory receipt isn't wired to actually increment stock yet (they're tracked as separate concepts: `PurchaseOrders` vs `InventoryTransactions`).
- **Notifications** — queuing and read/unread works; there's no background job actually sending SMS/Email/Push (see "Not started" below).
- **Reports** — Revenue chart, department revenue, bed occupancy are wired; Patient Register, Daily Visits, Doctor Performance have stored procedures and service methods but no dedicated report page yet (call the existing endpoints directly, or add a page — the pattern in `ReportsPage.tsx` extends trivially).

## Not started (present in the SRS's NFR list as "optional" or infrastructure-level)

- Actual SMS/Email/Push dispatch (Hangfire background job that calls the sent notifications and marks them delivered — `INotificationService.QueueAsync` already leaves the right seam: mark `sp_Notification_MarkSent` from a job, not the request thread).
- Real file storage (Local disk or Azure Blob) for lab/radiology reports and medical record uploads.
- Redis caching (package is referenced in `HMS.Infrastructure` but not yet wired to any query).
- Docker/CI-CD pipeline files.
- HL7/FHIR interoperability (explicitly optional in the SRS).
- The AI clinical-assistant feature was scoped out per your explicit choice at the start of this build.

## If you pick this back up

1. `dotnet build` (backend) / `npx tsc -b` (frontend) both pass clean today — treat either failing as a
   regression to fix before adding more.
2. New stored procedures go in `database/StoredProcedures/<NN>_<Module>.sql` following the existing
   `sp_<Entity>_<Action>` naming; re-run just that file with `sqlcmd` (all procs use `CREATE OR ALTER`, so
   re-running is always safe).
3. New frontend modules: copy the shape of an existing scaffold page (e.g. `InsurancePage.tsx`) rather than
   the core-flow pages — they're intentionally simpler and easier to extend from.
