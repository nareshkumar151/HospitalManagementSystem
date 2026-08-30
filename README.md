# City Care HMS — Hospital Management System

A full-stack, multi-hospital Hospital Management System built from the SRS in `Software Requirements Specification_changes_26-08-26.pdf`, covering all 24 functional modules and 9 user roles (including a platform-level SuperAdmin).

- **Backend:** ASP.NET Core 8 Web API, Clean Architecture, Dapper + SQL Server stored procedures, JWT auth with role-based access control (RBAC).
- **Frontend:** React 19 + Vite + TypeScript, Redux (classic store + `redux-thunk`, no Redux Toolkit), Tailwind CSS v4, Framer Motion.
- **Database:** SQL Server on `DESKTOP-HALGV0I` via Windows Authentication.
- **Payments:** Razorpay (Card/UPI/NetBanking) alongside manual Cash/Card/UPI/Insurance collection.
- **Documents:** Server-generated PDFs (QuestPDF) for patient details, admission documents, discharge summaries, and bill receipts.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for design decisions, [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's built vs. scaffolded, and [`docs/ROLES_AND_PERMISSIONS.md`](docs/ROLES_AND_PERMISSIONS.md) for the RBAC matrix.

## Prerequisites

- .NET 8 SDK (or newer, targeting `net8.0`)
- Node.js 18+
- SQL Server (Developer/Express is fine) on `DESKTOP-HALGV0I`, Windows Authentication enabled
- (Optional, for online payments) A [Razorpay](https://dashboard.razorpay.com/app/keys) test or live Key ID/Secret — Cash payments work with zero setup either way.

## 1. Database setup

Run these once, in order, using `sqlcmd` (Windows Auth, no password needed):

```bash
sqlcmd -S DESKTOP-HALGV0I -E -i database/01_Schema.sql
sqlcmd -S DESKTOP-HALGV0I -E -i database/04_Schema_Payments.sql
# then every file in database/StoredProcedures, in numeric order:
for f in database/StoredProcedures/*.sql; do sqlcmd -S DESKTOP-HALGV0I -E -i "$f"; done
sqlcmd -S DESKTOP-HALGV0I -E -i database/03_Seed.sql
```

This creates the `HMS_DB` database (47 tables), 170+ stored procedures, and seed data: roles (including SuperAdmin), a demo hospital/branch, all 12 departments from the SRS, a bed/ward layout, a lab test catalogue, starter pharmacy stock, and one demo login per role.

### Demo logins (seeded — change before any non-local use)

| Role | Username | Password |
|---|---|---|
| **SuperAdmin** | `superadmin` | `SuperAdmin@123` |
| Administrator | `admin` | `Admin@123` |
| Doctor | `dr.aditi` | `Doctor@123` |
| Nurse | `nurse.neha` | `Nurse@123` |
| Receptionist | `reception.pooja` | `Reception@123` |
| Pharmacist | `pharma.ramesh` | `Pharmacist@123` |
| Lab Technician | `lab.sneha` | `LabTech@123` |
| HR | `hr.vikram` | `Hr@123` |
| Patient | `patient.rohit` | `Patient@123` |

## 2. Run the backend

```bash
cd backend
dotnet build
dotnet run --project src/HMS.API
```

The API listens on the URL printed at startup (e.g. `http://localhost:5080`), serves Swagger at `/swagger` in Development, and a health check at `/health`. Configuration lives in `backend/src/HMS.API/appsettings.json`:

- **`Jwt:Secret`** — replace before deploying anywhere but localhost.
- **`Razorpay:KeyId` / `Razorpay:KeySecret`** — replace with real test/live keys to enable online payments. Left as placeholders, the app still runs fine: online-payment attempts fail with a clean "Please use Cash instead" message rather than crashing anything.

## 3. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Vite serves on `http://localhost:5173` and proxies `/api/*` to `http://localhost:5080` (see `vite.config.ts`) — no CORS setup needed in dev. Sign in with any demo login above, or register a new patient account from the login screen.

## Project layout

```
backend/
  src/
    HMS.Domain/         Entities, enums — no dependencies
    HMS.Application/    DTOs, service interfaces, FluentValidation validators — depends on Domain only
    HMS.Infrastructure/ Dapper repositories/services, JWT, RBAC claims, Razorpay client, PDF rendering — implements Application interfaces
    HMS.API/             Controllers, Program.cs, middleware, appsettings
database/
  01_Schema.sql              Core 46 tables
  04_Schema_Payments.sql     Incremental: RazorpayOrders table (run after 01_Schema.sql)
  StoredProcedures/          170+ stored procedures, one file per module (01_Identity.sql … 25_Payments.sql)
  03_Seed.sql                 Roles (incl. SuperAdmin), demo org/users, wards/beds, lab catalogue, starter pharmacy stock
frontend/
  src/
    app/          Redux store (createStore + redux-thunk), typed hooks
    api/          Axios client with JWT attach + silent refresh + downloadFile() for protected PDFs
    features/     One folder per domain: actions/reducer/thunks (plain Redux, not Redux Toolkit)
    components/   Reusable UI (Button, Card, Table, Modal, layout/Sidebar+Topbar)
    pages/        Route-level screens, grouped by module
    routes/       Role-gated route guards
    utils/razorpay.ts   Loads Razorpay Checkout and opens it for a given order
docs/
  ARCHITECTURE.md            Design decisions and trade-offs
  ROADMAP.md                 What's fully built vs. scaffolded, and what's next
  ROLES_AND_PERMISSIONS.md   RBAC matrix mapped to SRS Section 5
```

## What's fully built vs. scaffolded

The **core patient workflow** end-to-end — Registration → Appointment → OPD Consultation → Prescription → Pharmacy Dispense (with real stock decrement) → Billing → Payment (Cash or Razorpay) → IPD Admission (with bed transactions) → Nursing vitals → Discharge (with bed release + auto-downloaded summary PDF) — is fully implemented and was verified live against the real database, including RBAC per role.

**Multi-hospital & SuperAdmin**, **Pharmacist inventory CRUD**, **Razorpay payments**, and **PDF generation** were added in a second pass on top of that foundation — also verified live end-to-end (see `docs/ARCHITECTURE.md` for the two real bugs that surfaced and were fixed along the way).

Administrative modules (Doctors, Departments, Employees, Insurance, Radiology, Operation Theatre, Medical Records, Inventory, Vendors, Payroll, Attendance/Leave, Notifications, Reports) are functional CRUD screens wired to real API endpoints, intentionally less deep than the core flow. See [`docs/ROADMAP.md`](docs/ROADMAP.md) for specifics on what to deepen next.
