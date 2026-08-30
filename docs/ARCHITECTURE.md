# Architecture

## Backend: Clean Architecture with Dapper (not EF Core)

The SRS's NFR list mentions both Entity Framework Core and "stored procedure files" as requirements. Since
the explicit ask was **Dapper + stored procedures**, the layering below is "Clean Architecture" in the
practical, Dapper-based sense used across the .NET community — not the MediatR/CQRS-heavy variant that
usually comes bundled with EF Core:

```
HMS.Domain          Entities and enums only. No package references.
HMS.Application     DTOs (records), service interfaces, FluentValidation validators.
                     Depends only on Domain. Never touches SQL or Dapper directly.
HMS.Infrastructure   Implements Application's service interfaces. Owns:
                       - SqlConnectionFactory (Microsoft.Data.SqlClient, Windows Auth)
                       - SqlDataAccess (thin Dapper wrapper - every call names a stored procedure)
                       - JwtTokenService, PasswordHasher (BCrypt), CurrentUserService, AuditService
HMS.API              Controllers, Program.cs, JWT/RBAC wiring, Swagger, exception middleware.
```

**Why services live in Infrastructure, not Application:** several modules (pharmacy dispensing, bed
admission/discharge, bill payment) have business logic that is *transactional* — it must happen atomically
in the database (e.g. decrement stock + log the movement + mark a prescription dispensed, or flip a bed to
Occupied only if the admission insert succeeds). Rather than split that logic between a C# "domain service"
and a database transaction wrapper, the atomic parts live in the stored procedure itself
(`BEGIN TRANSACTION` / `COMMIT`), and the C# service is a thin orchestrator that calls 1–2 stored procedures
and shapes the result into a DTO. Application still defines the *contract* (interface + DTOs + validators)
so a future implementation (a different ORM, a mock for testing) could replace Infrastructure without
touching controllers.

**No inline SQL, ever.** `ISqlDataAccess` (`QueryAsync`, `QuerySingleAsync`, `QueryMultipleAsync`,
`ExecuteAsync`, `ExecuteScalarAsync`) always passes `CommandType.StoredProcedure` and a proc name string —
see `HMS.Infrastructure/Persistence/SqlDataAccess.cs`. All 169 procedures live under
`database/StoredProcedures/`, one file per module, matching the API's feature folders.

**Validation** runs automatically: `ValidationActionFilter` (API layer) inspects every controller action's
arguments, finds a matching `IValidator<T>` (registered via `AddValidatorsFromAssembly` in
`HMS.Application/DependencyInjection.cs`), and throws a `ValidationAppException` — caught by
`ExceptionHandlingMiddleware` and turned into a 400 with per-field messages — before the controller method
body ever runs. Controllers never call `Validate()` by hand.

## Authentication & RBAC

- JWT access tokens (30 min) carry `role`, `branchId`, and `linkedProfileId` (the Doctor/Employee/Patient
  row this login is tied to) as claims — see `JwtTokenService`. Refresh tokens are opaque random strings
  persisted in `RefreshTokens` and rotated on every use.
- SQL Server itself is accessed only via Windows (Integrated) Authentication — the app never stores a SQL
  login/password. Application-level accounts (the `Users` table) are unrelated and BCrypt-hashed.
- Authorization is `[Authorize(Roles = "...")]` per action, matched against `HMS.API.Controllers.RoleNames`
  constants (mirroring `HMS.Domain.Enums.RoleName`). See `docs/ROLES_AND_PERMISSIONS.md` for the full matrix
  mapped to SRS Section 5.
- A `Patient` role can only read their own linked profile — enforced per-controller by comparing
  `CurrentLinkedProfileId` against the requested `patientId`, not just by role name.

## Frontend: plain Redux + Thunk (not Redux Toolkit)

`frontend/src/app/store.ts` uses `legacy_createStore` + `applyMiddleware(thunk)` — no `configureStore`, no
`createSlice`, no Immer. Each feature folder under `src/features/` hand-writes its action type constants,
a reducer (`switch` on `action.type`), and thunk action creators that call the API client and dispatch
plain objects. This was a deliberate interpretation of "Redux Thunk architecture" as the classic pattern,
distinct from Redux Toolkit's opinionated wrapper.

**One generic exception:** `features/generic/createResourceSlice.ts` is a factory that produces the same
list/create/update shape for the dozen simple admin CRUD screens (Insurance, Inventory, Vendors, Payroll,
etc.) so they don't each hand-copy identical boilerplate. It still returns a plain reducer and plain thunks
— nothing about the public shape differs from a hand-written slice. Bespoke modules with real logic (auth,
patients, appointments, OPD, pharmacy, billing, IPD, nursing, beds, doctors) keep independent, hand-written
slices.

**A note on a type pitfall worth knowing if you extend this:** `createResourceSlice` deliberately does
*not* import `AppThunk`/`RootState` from `app/store.ts`. Since some of its output reducers are composed
into `RootState` itself (`combineReducers` in `rootReducer.ts`), importing `RootState` back into the
factory creates a real circular *type* dependency (not just a circular module import) that TypeScript
cannot resolve and silently degrades to `any` everywhere. The factory instead uses a self-contained
`ThunkAction<R, unknown, undefined, Action>` — accurate, since these generic thunks never call
`getState()`.

## Enum wire format

C# enums (e.g. `AppointmentStatus`, `BillType`) serialize to and from **strings** on the wire
(`JsonStringEnumConverter` registered in `Program.cs`), not their numeric ordinal — so the frontend's
`type AppointmentStatus = 'Scheduled' | 'Completed' | ...` string-literal unions line up directly with
JSON payloads without a mapping layer.

## Multi-hospital / SuperAdmin

The schema was already multi-tenant-shaped (`Hospitals` → `Branches` → `Departments`/`Doctors`/`Employees`/
`Patients`, all via `BranchId`) - adding `SuperAdmin` was mostly an RBAC layering exercise, not a schema
change. `SuperAdmin` sits above `Administrator`: it exclusively owns Hospital/Branch create-update-delete
(`RoleNames.SuperAdminOnly`), while everything else an Administrator can do remains available to SuperAdmin
too, without listing "SuperAdmin" in every one of the ~30 `[Authorize(Roles = "...Administrator...")]`
attributes across the API. The trick: `JwtTokenService.GenerateTokens` gives a SuperAdmin login a *second*
`ClaimTypes.Role` claim of `"Administrator"` alongside their primary `"SuperAdmin"` claim - ASP.NET Core's
`[Authorize(Roles = "Administrator")]` passes for anyone holding *any* matching role claim, so this just
works everywhere for free.

**The one place this required care:** a JWT with two claims of the same type decodes to a JSON *array* for
that key, not a string. The frontend's client-side JWT decode (used to restore a session after a hard
reload, since re-hitting `/auth/login` isn't an option) has to explicitly take the first element
(`frontend/src/features/auth/sessionFromToken.ts`) - the same value ASP.NET Core's
`ClaimsPrincipal.FindFirstValue` resolves server-side (first-match), so client and server agree on "what
role is this person" even though the token grants broader access underneath. Getting this wrong silently
turns `user.role` into a two-element array everywhere in the UI (React renders array children by just
concatenating them with no separator - `"SuperAdminAdministrator"` in the topbar was the tell), and breaks
every `Array.prototype.includes` role check in `navConfig.ts` / `ProtectedRoute` since an array is never
`===` to a string.

**A second, unrelated bug surfaced while fixing that one:** a hard reload (or direct navigation) on a deep
route like `/app/manage/hospitals` used to always bounce to `/app/dashboard`. Session restoration ran in a
`useEffect` (i.e. *after* the first render), so `ProtectedRoute` saw `user = null` on that first render,
redirected to `/login`, and only afterward did the effect populate `user` - by which point the router was
already sitting on `/login`, which itself redirects logged-in users to `/app/dashboard`, never back to the
originally requested URL. Fixed by seeding `authReducer`'s initial state synchronously from the stored JWT
(`getUserFromStoredToken()` called at module load, not in an effect) so the very first render already knows
who's logged in.

## Payments: Razorpay (online) + Cash (manual), side by side

Billing keeps two independent payment paths rather than modeling Razorpay as just another `PaymentMode`:

1. **Manual** (`POST /billing/payments`, unchanged) - Cash, or Card/UPI/Insurance settled outside the
   gateway (e.g. a physical card machine at the counter). Receptionist records the amount directly.
2. **Online via Razorpay** - `POST /billing/{id}/razorpay/create-order` creates a Razorpay order for the
   bill's *current outstanding balance* and persists `{BillId, RazorpayOrderId, AmountInPaise}` in a new
   `RazorpayOrders` table (`database/04_Schema_Payments.sql`) *before* the client ever sees Razorpay's
   Checkout widget. After payment, `POST /billing/razorpay/verify` (a) looks up that stored order by
   `RazorpayOrderId` and confirms it belongs to the `BillId` the client claims (without this check, a valid
   signature for a small bill A could be replayed against someone else's bill B), (b) verifies Razorpay's
   HMAC-SHA256 signature server-side, (c) is idempotent against the callback firing twice (page refresh) by
   checking whether that `RazorpayPaymentId` was already recorded, then (d) calls the same
   `sp_Payment_Collect` the manual path uses, with `Mode = Card` and `TransactionReference = <payment id>`.
   A missing/invalid `Razorpay:KeyId`/`KeySecret` in `appsettings.json` fails this cleanly with a 400
   ("Online payment is not configured yet... Please use Cash instead") rather than a raw 500 - see
   `RazorpayGateway.CreateOrderAsync`.

The frontend never talks to Razorpay's API directly except to load `checkout.js` and open the widget
(`frontend/src/utils/razorpay.ts`) - order creation and signature verification are both server round-trips.

## PDF generation (QuestPDF)

`IPdfService` (Application) / `PdfService` (Infrastructure, QuestPDF) renders four documents - Patient
Details, Admission Document, Discharge Summary, Bill Receipt - all through one shared A4 letterhead/footer
builder (`PdfService.BuildDocument`) so they look like they belong to the same hospital. Every PDF endpoint
returns raw bytes (`File(bytes, "application/pdf", filename)`); nothing is written to disk. The frontend's
`downloadFile()` helper (`api/client.ts`) fetches via the authenticated axios client as a `blob` and
triggers the save from an object URL, since a plain `<a href>` can't carry the `Authorization` header a
protected PDF endpoint requires.

QuestPDF's fluent API has one sharp edge worth remembering: `.Item()` belongs to `ColumnDescriptor` (what
you get from `.Column(column => ...)`), not to `IContainer` in general - calling it on a plain container
several helper methods receive is a compile error, not a runtime one, but it's easy to write `container
.Item()` by habit if you've only seen the `.Column()` closures.

## Key transactional flows worth reading if you're extending this

- `sp_IpdAdmission_Admit` / `sp_IpdAdmission_TransferBed` / `sp_DischargeSummary_Create` — bed status
  (`Available`/`Occupied`) is flipped inside the same transaction as the admission/discharge row, so a bed
  can never be shown available while still assigned.
- `sp_PharmacySale_DispenseItem` — checks stock, decrements it, and logs a `MedicineStockTransactions` row
  atomically per line item; the C# `PharmacyService.DispenseAsync` prices each line from the medicine's
  current selling price before persisting the sale header.
- `sp_Payment_Collect` — recomputes a bill's `Status` (`Pending` → `PartiallyPaid` → `Paid`) from
  `PaidAmount` vs `TotalAmount` inside the same transaction as inserting the payment row.
