# Phase 4 — Data Model: docsile-hms

**Project:** docsile-hms — Hospital Management System
**Date:** 2026-09-21
**Engineer:** Supabase Staff Engineer (SDE-5)
**Phase:** 4 of N (data model — maps existing schema, designs additions)
**Scope:** Reverse-engineer the existing schema from SQL files + actual query usage;
  design and write the specific DB additions decided in Phase 2/3; define the going-forward
  migration file structure. This is NOT a greenfield redesign.

---

## 1. Schema File Inventory and Authority Determination

The existing schema is scattered across 14 SQL files. This section establishes which
file is authoritative for what.

### 1.1 Files Found

| File | Size | Type |
|---|---|---|
| `supabase-migration.sql` | 43 KB | Supabase-targeted baseline, 36 tables |
| `db/create-hospital-db.sql` | 47 KB | Prisma-generated full dump, more tables |
| `supabase-migration-extended-vitals.sql` | 0.2 KB | ADD COLUMN: Prescription.heightCm/weightKg |
| `supabase-migration-lab-header.sql` | 0.1 KB | ADD COLUMN: Lab.printHeaderKey |
| `supabase-migration-predefined-discharge.sql` | 0.5 KB | NEW TABLE: PredefinedDischarge |
| `supabase-migration-predefined-surgery.sql` | 0.6 KB | NEW TABLE: PredefinedSurgery; DROP/ADD: InPatient.onDutyDoctors |
| `supabase-migration-registration-fee.sql` | 0.3 KB | ADD COLUMN: HospitalProfile registration fee columns |
| `supabase-migration-user-preferences.sql` | 0.2 KB | ADD COLUMN: User.preferences |
| `create_call_log_table.sql` | 0.7 KB | NEW TABLE: CallLog |
| `create_inpatient_template_table.sql` | 0.5 KB | NEW TABLE: InpatientTemplate (with overly-permissive legacy RLS) |
| `db/migrations/prescription-height-weight.sql` | 0.1 KB | Duplicate of extended-vitals |
| `db/migrations/social-module.sql` | 1.0 KB | NEW TABLES: SocialPost, OAuthState; ADD COLUMNs on HospitalProfile and User |

### 1.2 Authoritative File Decision

**`supabase-migration.sql` is the Supabase-authoritative baseline.** Reasons:
- Uses `TIMESTAMPTZ` (Supabase/PostgreSQL-correct; db/create-hospital-db.sql uses `TIMESTAMP(3)` which is Prisma's format and lacks timezone awareness).
- Uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` (idempotent; safe to replay).
- Uses `gen_random_uuid()::text` for PKs (consistent with Supabase environment).
- The name and the six `supabase-migration-*.sql` siblings confirm this is the "Supabase path."

**`db/create-hospital-db.sql` is the Prisma-source-of-truth dump.** It was generated from the Prisma schema and includes tables that `supabase-migration.sql` is missing. It is NOT run against the Supabase DB directly — it documents the Prisma model's perspective. Treat it as a reference for the complete table list.

**The six `supabase-migration-*.sql` and `create_*.sql` files are incremental patches** applied to the live Supabase DB after the baseline. Their application order is inferred from file timestamps and content dependencies.

---

## 2. Existing Schema — Authoritative Table List

All 46 tables confirmed to exist in the live Supabase database (baseline 36 + incremental additions).

### 2.1 Table Inventory (as-is)

| # | Table | Primary Module | Key Columns of Note |
|---|---|---|---|
| 1 | `User` | staff | role TEXT, isActive, employeeId, preferences TEXT (JSON) |
| 2 | `Role` | staff | permissions TEXT (JSON array), isSystem |
| 3 | `HospitalProfile` | settings | settings TEXT (JSON), registrationFeeEnabled/Amount, tone, departments, igAccessToken, socialDailyCap |
| 4 | `ServiceTemplate` | settings/billing | category, amount DOUBLE PRECISION, isActive |
| 5 | `Patient` | patient-care | patientId TEXT (sequential, non-UUID), patientType, appointmentDate |
| 6 | `Prescription` | patient-care/workup | prescriptionNumber TEXT, patientId FK→Patient.patientId, medicines/investigations TEXT (JSON), heightCm/weightKg DOUBLE PRECISION |
| 7 | `InvoiceItem` | billing | prescriptionId FK→Prescription.id ON DELETE CASCADE, unitPrice DOUBLE PRECISION |
| 8 | `Payment` | billing | prescriptionId FK→Prescription.id, paymentMode, amount DOUBLE PRECISION |
| 9 | `EyeReading` | workup (optical) | prescriptionId UNIQUE FK, autoRefractometer/glassesReading TEXT |
| 10 | `PredefinedTemplate` | doctor | code UNIQUE, medicines/investigations TEXT (JSON) |
| 11 | `InpatientTemplate` | inpatients | code UNIQUE, medicines TEXT (JSON) — id is `uuid` type in create_inpatient_template_table.sql vs TEXT in db/create-hospital-db.sql |
| 12 | `MedicineMaster` | pharmacy/doctor | name UNIQUE, defaultTiming, category |
| 13 | `InvestigationMaster` | labs | name UNIQUE, category |
| 14 | `DropdownOption` | settings | fieldName + value UNIQUE composite |
| 15 | `PredefinedPackage` | settings | inclusions TEXT (JSON), totalAmount DOUBLE PRECISION |
| 16 | `InPatient` | inpatients | patientId UNIQUE FK→Patient.id, ipNumber UNIQUE TEXT (sequential), onDutyDoctors TEXT (JSON), paymentRecords/prescriptions TEXT (JSON) |
| 17 | `InsuranceCompany` | insurance | name UNIQUE, tpaName |
| 18 | `InsuranceClaim` | insurance | claimNumber UNIQUE, inPatientId FK→InPatient.id, all financial fields as DOUBLE PRECISION |
| 19 | `Lab` | labs | name UNIQUE, printHeaderKey TEXT |
| 20 | `LabInvestigation` | labs | (labId, investigationId) UNIQUE junction table |
| 21 | `LabBill` | labs | billNumber UNIQUE, patientId FK→Patient.patientId |
| 22 | `LabBillItem` | labs | labBillId FK ON DELETE CASCADE |
| 23 | `LabPayment` | labs | labBillId FK ON DELETE CASCADE |
| 24 | `ExpenseCategory` | expenses | name UNIQUE, color, sortOrder |
| 25 | `Expense` | expenses | categoryId FK→ExpenseCategory.id, date, amount DOUBLE PRECISION |
| 26 | `PharmacyMedicine` | pharmacy | (name, manufacturer) UNIQUE composite, gstPercent DOUBLE PRECISION |
| 27 | `PharmacySupplier` | pharmacy | name UNIQUE, gstin, drugLicenseNo |
| 28 | `PharmacyStock` | pharmacy | (medicineId, batchNumber) UNIQUE, expiryDate, quantity INTEGER |
| 29 | `PurchaseOrder` | pharmacy | orderNumber UNIQUE, status, supplierId FK |
| 30 | `PurchaseOrderItem` | pharmacy | purchaseOrderId FK ON DELETE CASCADE |
| 31 | `PharmacyBill` | pharmacy | billNumber UNIQUE, patientId nullable (walk-in sales), gstAmount |
| 32 | `PharmacyBillItem` | pharmacy | billId FK ON DELETE CASCADE, stockId FK |
| 33 | `License` | license-tracker | name, expiryDate, reminderDays, status |
| 34 | `OpticalProduct` | optical | (name, brand) UNIQUE composite, category |
| 35 | `OpticalStock` | optical | (productId, batchNumber, power) UNIQUE, quantity |
| 36 | `OpticalBill` | optical | billNumber UNIQUE, lensPrescription TEXT, patientId nullable |
| 37 | `OpticalBillItem` | optical | billId FK ON DELETE CASCADE, eye TEXT (L/R/BOTH) |
| 38 | `PredefinedSurgery` | inpatients | name UNIQUE, department, doctorNames/onDutyDoctors TEXT (JSON) |
| 39 | `PredefinedDischarge` | inpatients | name UNIQUE, dischargeDiagnosis, conditionAtDischarge, dischargeMedications |
| 40 | `CallLog` | call-logs | exotelCallSid UNIQUE, callFrom/callTo TEXT, rawResponse JSONB (only table using JSONB) |
| 41 | `SocialPost` | (social module — disabled) | caption, status, source, igPostId |
| 42 | `OAuthState` | (social module — disabled) | state PK, userId FK→User.id, expiresAt |
| 43 | `StaffAttendance` | staff | (userId, date) UNIQUE, inTime TIME, outTime TIME |
| 44 | `_prisma_migrations` | internal | Prisma migration tracking — should not be altered |
| 45 | `token_revocation` | auth | **NEW** (20260921100000) |
| 46 | (indexes only — no new table) | | **NEW** hospital_id columns (20260921110000) |

### 2.2 Foreign Key Map (Primary Relationships)

```
HospitalProfile (1)
  ↑ (no FK, referenced by hospital_id TEXT in all entity tables after migration)

User (staff)
  ← Patient.createdById FK→User.id (SET NULL)
  ← Prescription.doctorId FK→User.id (SET NULL)
  ← EyeReading.createdById FK→User.id (SET NULL)
  ← InPatient.createdById FK→User.id (SET NULL)
  ← InsuranceClaim.createdById FK→User.id (SET NULL)
  ← StaffAttendance.userId FK→User.id (CASCADE)
  ← SocialPost.doctorId FK→User.id (SET NULL)
  ← SocialPost.createdById FK→User.id (SET NULL)

Patient
  ← Prescription.patientId FK→Patient.patientId   ← NOTE: FK to patientId, not id
  ← EyeReading.patientId FK→Patient.patientId
  ← LabBill.patientId FK→Patient.patientId
  ← InPatient.patientId UNIQUE FK→Patient.id       ← NOTE: FK to id here

Prescription
  ← InvoiceItem.prescriptionId FK→Prescription.id (CASCADE)
  ← Payment.prescriptionId FK→Prescription.id
  ← EyeReading.prescriptionId UNIQUE FK→Prescription.id (SET NULL)
  ← LabBill.prescriptionId FK→Prescription.id (RESTRICT in db version; NOT NULL in supabase-migration.sql)

InPatient
  ← InsuranceClaim.inPatientId FK→InPatient.id (RESTRICT)

InsuranceCompany
  ← InsuranceClaim.insuranceCompanyId FK→InsuranceCompany.id (SET NULL)

Lab
  ← LabInvestigation.labId FK→Lab.id (CASCADE)
  ← LabBill.labId FK→Lab.id

InvestigationMaster
  ← LabInvestigation.investigationId FK→InvestigationMaster.id (CASCADE)

LabBill
  ← LabBillItem.labBillId FK→LabBill.id (CASCADE)
  ← LabPayment.labBillId FK→LabBill.id (CASCADE)

ExpenseCategory
  ← Expense.categoryId FK→ExpenseCategory.id (RESTRICT)

PharmacyMedicine
  ← PharmacyStock.medicineId FK→PharmacyMedicine.id (CASCADE)
  ← PurchaseOrderItem.medicineId FK→PharmacyMedicine.id (RESTRICT)

PharmacySupplier
  ← PurchaseOrder.supplierId FK→PharmacySupplier.id (RESTRICT)
  ← PharmacyStock.supplierId FK→PharmacySupplier.id (SET NULL)

PurchaseOrder
  ← PurchaseOrderItem.purchaseOrderId FK→PurchaseOrder.id (CASCADE)

PharmacyBill
  ← PharmacyBillItem.billId FK→PharmacyBill.id (CASCADE)

PharmacyStock
  ← PharmacyBillItem.stockId FK→PharmacyStock.id (RESTRICT)

OpticalProduct
  ← OpticalStock.productId FK→OpticalProduct.id (CASCADE)

OpticalBill
  ← OpticalBillItem.billId FK→OpticalBill.id (CASCADE)

OpticalStock
  ← OpticalBillItem.stockId FK→OpticalStock.id (SET NULL)
```

---

## 3. Discrepancies Found Between SQL Files and Actual Query Usage

### 3.1 Schema File Discrepancies

| Discrepancy | supabase-migration.sql | db/create-hospital-db.sql | Verdict |
|---|---|---|---|
| `InPatient.onDutyDoctor` vs `onDutyDoctors` | Has `onDutyDoctor TEXT` (singular) | Has `onDutyDoctors TEXT` (JSON array) | db version is correct — `supabase-migration-predefined-surgery.sql` drops the old column and adds the array version |
| `Prescription.heightCm`/`weightKg` | Missing (added by extended-vitals patch) | Present in main schema | db version is more complete |
| `LabBill.prescriptionId` nullability | NOT NULL REFERENCES | Nullable | db version is correct (labs can exist without a linked OPD prescription) |
| `InpatientTemplate` PK type | TEXT (in create-hospital-db.sql) | uuid (in create_inpatient_template_table.sql) | Inconsistency — live DB likely has uuid type since create_inpatient_template_table.sql was applied to Supabase |
| `StaffAttendance` | Absent | Present | Only in db/create-hospital-db.sql — unclear if applied to Supabase yet |
| `User.lastLogin` type | `TIMESTAMPTZ` | `TIMESTAMP(3)` | Supabase version correct; db version is Prisma-legacy |
| `User.preferences` | Absent (added by user-preferences patch) | Present | Live DB has it via patch |
| `HospitalProfile.registrationFee*` | Absent in main (added by registration-fee patch) | Present | Live DB has it via patch |
| `SocialPost`, `OAuthState` | Absent in main | Present in db/migrations/social-module.sql | Applied to live DB if social module migration was run |

### 3.2 Tables in SQL Files But NOT Queried by the App

| Table | In SQL | Queried (grep `.from()`) | Note |
|---|---|---|---|
| `SocialPost` | Yes (social-module.sql) | No | Social module disabled/not yet integrated |
| `OAuthState` | Yes (social-module.sql) | No | Social module disabled |
| `StaffAttendance` | Yes (create-hospital-db.sql only) | No | Feature not yet surfaced in app UI |
| `InvoiceItem` | Yes | Yes | Confirmed queried |
| `_prisma_migrations` | Yes | No | Internal Prisma table, not app-facing |

### 3.3 Tables Queried But Identity Surprising

- **`license-documents`** appears in one `.from()` call — this is a Supabase Storage
  **bucket name**, not a SQL table. The storage bucket for license documents exists in
  Supabase Storage, not in the public schema.
- **`HospitalProfile`** has exactly one row in the live DB (confirmed by single-tenant
  design). The app reads it as a singleton in every module's initialization path.

### 3.4 Data Type Antipatterns (inherited from Prisma/existing schema — cannot change without migration risk)

These are noted for future migration consideration, not fixed in Phase 4:

| Pattern | Tables Affected | Standard Alternative | Migration Risk |
|---|---|---|---|
| `DOUBLE PRECISION` for all financial amounts | Prescription, InPatient, InsuranceClaim, PharmacyBill, LabBill, OpticalBill, Expense, ServiceTemplate, PredefinedPackage | `NUMERIC(12,2)` | High — value-type change on 100s of rows across 12+ tables |
| `TEXT` for all JSON columns | Prescription.medicines, InPatient.paymentRecords, Role.permissions, DropdownOption, etc. | `JSONB` | High — requires re-serializing all stored JSON values |
| Mixed timestamp types between files | `TIMESTAMP(3)` in db/create-hospital-db.sql vs `TIMESTAMPTZ` in supabase-migration.sql | `TIMESTAMPTZ` throughout | Supabase version already uses TIMESTAMPTZ — no action needed |

---

## 4. CRITICAL FINDING: hospital_id Absent from All Tables

**This is the most significant finding of Phase 4.**

Neither `hospital_id` nor any equivalent tenant discriminator column exists on
**any table** in the current schema. The current database is fully single-tenant at
the data layer. The JWT carries a `hospitalId` field, but the application does not use
it to scope database rows — it is used for navigation and config only.

This means:
- If a second hospital tenant is added to the same Supabase instance today (without
  this Phase 4 migration), all hospitals would share all patient data, all prescriptions,
  all billing records — with no data isolation whatsoever.
- The RLS tenant isolation designed in ADR-002 cannot be implemented without first
  adding `hospital_id` to every entity table.
- The repository pattern ("every repository scopes by hospitalId") cannot be implemented
  because there is no column to filter on.

**Resolution:** Migration `20260921110000_hospital_id_backfill.sql` adds `hospital_id TEXT NOT NULL`
to all 30 entity tables and backfills the existing single hospital's id into every row.
See ADR-006 for the full decision on strategy (all-at-once backfill chosen over per-module rollout).

**Owner action required:** Before onboarding a second hospital tenant, this migration must
be applied to the live DB and the Edge Function codebase must be updated to pass
`hospital_id` in every INSERT and include it in every SELECT's WHERE clause. The migration
alone is not sufficient — it adds the column but the application code must use it.

---

## 5. New Additions Designed in Phase 4

### 5.1 token_revocation Table (H-1 Fix)

**File:** `supabase/migrations/20260921100000_token_revocation.sql`

```
token_revocation
  jti         TEXT PRIMARY KEY        -- JWT ID from the token
  token_type  TEXT NOT NULL DEFAULT 'access'   -- 'access' | 'refresh'
  revoked_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  expires_at  TIMESTAMPTZ NOT NULL    -- copy of JWT exp; drives cleanup DELETE

  Indexes:
    idx_token_revocation_jti         (jti)        -- lookup on every auth'd request
    idx_token_revocation_expires_at  (expires_at) -- cleanup job efficiency

  RLS: ENABLED, no permissive policies = default-deny for all non-service-role access
```

**Usage pattern** (in the Edge Function auth middleware):
```sql
-- On every authenticated request:
SELECT 1 FROM public.token_revocation WHERE jti = $1 AND expires_at > now();
-- If row found → 401 Unauthorized (token has been revoked)
-- If not found → token is valid (proceed)

-- On logout (insert both access and refresh token jtis):
INSERT INTO public.token_revocation (jti, token_type, expires_at)
VALUES ($access_jti, 'access', $access_exp), ($refresh_jti, 'refresh', $refresh_exp)
ON CONFLICT (jti) DO NOTHING;

-- Cleanup (periodic job, e.g. daily):
DELETE FROM public.token_revocation WHERE expires_at < now();
```

**Monitoring hook:** Phase 2 §10.3 lists an alert: "Token revocation table growth > 10,000 rows
(cleanup job not running) → Warning." The `idx_token_revocation_expires_at` index makes
the cleanup DELETE efficient at any scale.

### 5.2 hospital_id Column Addition (ADR-002 Prerequisite)

**File:** `supabase/migrations/20260921110000_hospital_id_backfill.sql`

Adds `hospital_id TEXT NOT NULL` to 30 entity tables (excluding pure child/junction
tables where the parent FK provides scoping). Backfills all existing rows with the
single existing HospitalProfile.id. See §4 for the finding context and ADR-006 for
the strategy decision.

**Tables receiving hospital_id** (30 total):
User, Patient, Prescription, EyeReading, PredefinedTemplate, MedicineMaster,
InvestigationMaster, DropdownOption, PredefinedPackage, ServiceTemplate, InPatient,
InsuranceCompany, InsuranceClaim, Lab, LabBill, ExpenseCategory, Expense,
PharmacyMedicine, PharmacySupplier, PharmacyStock, PurchaseOrder, PharmacyBill,
License, OpticalProduct, OpticalStock, OpticalBill, CallLog, InpatientTemplate,
PredefinedSurgery, PredefinedDischarge.

Conditionally (if table exists): SocialPost, StaffAttendance.

**Tables NOT receiving hospital_id** (pure children or non-tenant-scoped):
InvoiceItem, Payment, LabInvestigation, LabBillItem, LabPayment, PurchaseOrderItem,
PharmacyBillItem, OpticalBillItem — these are always accessed through their parent.
Role, HospitalProfile, OAuthState, _prisma_migrations — not per-hospital data.

### 5.3 RLS Tenant Isolation Policies (ADR-002 Defense-in-Depth)

**File:** `supabase/migrations/20260921120000_rls_tenant_isolation.sql`

One policy per table with `hospital_id`, using:
```sql
USING (hospital_id = current_setting('app.hospital_id', true))
```

Child tables (InvoiceItem, Payment, LabBillItem, etc.) have RLS enabled with **no
permissive policy** — default-deny for all non-service-role access.

The Edge Function must call `SET LOCAL app.hospital_id = X` before queries when
using a non-service-role Postgres role. With the current service_role key, RLS is
bypassed (service_role has BYPASSRLS). See ADR-006 §Decision 3 for the full context
on this limitation and the revisit condition.

Special case: `InpatientTemplate` — the legacy permissive policies from
`create_inpatient_template_table.sql` ("Allow authenticated read/write") are dropped
and replaced with the tenant-isolation policy.

### 5.4 Atomic Sequences (H-3 Fix)

**File:** `supabase/migrations/20260921130000_atomic_sequences.sql`

Four Postgres sequences replacing the TOCTOU-unsafe JS-side "read last → increment → insert" pattern:

| Sequence | Used For | Format |
|---|---|---|
| `patient_number_seq` | `Patient.patientId` | Edge Function formats the `BIGINT` nextval |
| `ip_number_seq` | `InPatient.ipNumber` | Edge Function formats as "IP-NNNN" |
| `prescription_number_seq` | `Prescription.prescriptionNumber` | Edge Function formats as "YYYY-NNNN"; sequence resets at year start |
| `insurance_claim_num_seq` | `InsuranceClaim.claimNumber` | Edge Function formats as "INS-YYYY-NNNN"; sequence resets at year start |

Convenience wrapper functions callable from Edge Functions via `supabase.rpc()`:
- `public.next_patient_number() → BIGINT`
- `public.next_ip_number() → BIGINT`
- `public.next_prescription_number(p_year TEXT) → TEXT`
- `public.next_insurance_claim_number(p_year TEXT) → TEXT`
- `public.initialize_sequences()` — aligns sequences to current max DB values; call once after deployment on the live DB.

**Yearly reset mechanism** for prescription and claim sequences: A Supabase Edge Function
cron job (to be implemented in the function deployment phase) calls:
```sql
SELECT setval('prescription_number_seq', 1, false);
SELECT setval('insurance_claim_num_seq', 1, false);
```
on January 1 of each year. The `false` arg means the next `nextval()` returns 1, not 2.

**Per-hospital sequence consideration:** Currently one global sequence per ID type (one hospital).
When a second hospital is onboarded, per-hospital sequences should be created:
`patient_number_seq_{hospitalId}`. The `next_patient_number()` function signature will need
a `p_hospital_id TEXT` parameter at that point. This is a deliberate deferral — premature
per-hospital sequencing adds complexity with no current value.

### 5.5 Pagination Indexes (H-6 Fix)

**File:** `supabase/migrations/20260921140000_pagination_indexes.sql`

Composite indexes supporting both pagination strategies defined in Phase 2 §13.2:

**Cursor-based (unbounded, growing datasets):**
```
idx_patient_hospital_created_at     ON Patient(hospital_id, "createdAt" DESC)
```
Used for patient search across full history: `WHERE hospital_id = ? AND createdAt < cursor ORDER BY createdAt DESC LIMIT ?`

**Offset-based (date-scoped, bounded):**
```
idx_patient_hospital_appointment_date   ON Patient(hospital_id, "appointmentDate" DESC)
idx_inpatient_hospital_admission_date   ON InPatient(hospital_id, "admissionDate" DESC)
idx_inpatient_hospital_status           ON InPatient(hospital_id, status, "admissionDate" DESC)
idx_prescription_hospital_date          ON Prescription(hospital_id, "prescriptionDate" DESC)
idx_lab_bill_hospital_created_at        ON LabBill(hospital_id, "createdAt" DESC)
idx_pharmacy_bill_hospital_date         ON PharmacyBill(hospital_id, "billDate" DESC)
idx_optical_bill_hospital_date          ON OpticalBill(hospital_id, "billDate" DESC)
idx_expense_hospital_date               ON Expense(hospital_id, "date" DESC)
idx_insurance_claim_hospital_created_at ON InsuranceClaim(hospital_id, "createdAt" DESC)
```

**Search support:**
```
idx_patient_hospital_phone      ON Patient(hospital_id, "phone")
idx_patient_hospital_first_name ON Patient(hospital_id, "firstName")
idx_patient_hospital_last_name  ON Patient(hospital_id, "lastName")
```

**Operational views:**
```
idx_pharmacy_stock_hospital_expiry ON PharmacyStock(hospital_id, "expiryDate")
idx_license_hospital_expiry        ON License(hospital_id, "expiryDate")
idx_call_log_hospital_start_time   ON CallLog(hospital_id, "startTime" DESC)
```

---

## 6. Going-Forward Migration File Structure

**New home:** `supabase/migrations/YYYYMMDDHHMMSS_description.sql`

**The legacy SQL files at the repo root are superseded** — they represent the baseline
already applied to the live DB and are kept for audit/history purposes only. See
`supabase/migrations/README.md` for the complete table of legacy files and their status.

**Rules (enforced by convention, not yet by Supabase CLI since no local Supabase instance config was found):**
1. New schema changes = new file. Never append to existing migration files.
2. Every file = `BEGIN; ... COMMIT;` transaction wrapper.
3. Include a `-- Rollback:` comment at the top.
4. Timestamp generation: `date -u +"%Y%m%d%H%M%S"`
5. Never rename or edit a migration file after application to any environment.

---

## 7. Migration Files Written

| File | Description | Closes |
|---|---|---|
| `supabase/migrations/20260921100000_token_revocation.sql` | token_revocation table | H-1 |
| `supabase/migrations/20260921110000_hospital_id_backfill.sql` | hospital_id column on all entity tables + hospital_id indexes | ADR-002 prerequisite |
| `supabase/migrations/20260921120000_rls_tenant_isolation.sql` | RLS tenant isolation policies | ADR-002 |
| `supabase/migrations/20260921130000_atomic_sequences.sql` | Postgres sequences + wrapper functions | H-3 |
| `supabase/migrations/20260921140000_pagination_indexes.sql` | Composite indexes for cursor/offset pagination | H-6 |
| `supabase/migrations/README.md` | Documents legacy SQL file status and convention | — |

---

## 8. ADR Written

**ADR-007:** Hospital ID Backfill Strategy and RLS Session Variable Mechanism
(`/Users/mahendhar/Movies/Projects/docsile-hms/.sde/adr/ADR-007-hospital-id-and-rls-enforcement-model.md`)

Decisions covered:
1. All-at-once hospital_id backfill (vs. per-module rollout) — chosen for safety.
2. `current_setting('app.hospital_id', true)` as the RLS session variable — chosen over JWT claim extraction.
3. Keep service_role key in Edge Functions (RLS bypassed; repository WHERE clause is primary enforcement) — chosen over a dedicated `app_api` Postgres role. Revisit condition: test infrastructure mature enough to verify role-switching behavior.

---

## 9. Application Code Changes Required (Not Part of This Phase)

The migrations in this phase add DB infrastructure but cannot enforce usage from the
application layer. The following application code changes are required before the
migrations are effective for multi-tenancy:

| Change | Where | Priority |
|---|---|---|
| Every INSERT must include `hospital_id: session.hospitalId` | Every module's repository.ts | Before second tenant onboarded |
| Every SELECT must include `.eq('hospital_id', session.hospitalId)` | Every module's repository.ts | Before second tenant onboarded |
| Auth middleware must call `supabase.rpc('set_config', { parameter: 'app.hospital_id', value: hospitalId, is_local: true })` at the start of each request (if/when app_api role is adopted per ADR-006) | Edge Function shared auth middleware | When ADR-006 §Decision 3 is revisited |
| `initialize_sequences()` must be called once on first Edge Function deployment against the live DB | Startup script / migration script | Before H-3 fix is active |
| Annual sequence reset cron job | `supabase/functions/reset-annual-sequences/` | Before end of 2026 calendar year |
| `token_revocation` jti check in auth middleware | `supabase/functions/_shared/auth.ts` | Immediately (H-1 fix) |
| `token_revocation` INSERT on logout | Auth Edge Function logout handler | Immediately (H-1 fix) |
| Replace `getNextPatientNumber()` / `getNextIpNumber()` / `getNextPrescriptionNumber()` with `supabase.rpc('next_patient_number')` etc. | `src/app/(hospital)/patients/actions.ts`, `inpatients/actions.ts` | Phase 7 (when those modules are migrated) |

---

## 10. Open Questions for Owner Review

1. **StaffAttendance applied to Supabase?** The table exists in `db/create-hospital-db.sql`
   but NOT in `supabase-migration.sql` and no `supabase-migration-staff-attendance.sql`
   patch was found. If this table does not exist in the live Supabase DB, the conditional
   ADD COLUMN in `20260921110000` is harmless (the IF EXISTS block skips it). Please confirm.

2. **SocialPost applied to Supabase?** The `db/migrations/social-module.sql` file creates
   SocialPost and OAuthState. If this was applied to the live Supabase DB, the conditional
   blocks in `20260921110000` and `20260921120000` will add hospital_id and RLS to SocialPost.
   If not applied, these blocks are skipped. Please confirm the social module's DB state.

3. **InpatientTemplate PK type conflict.** The table was created via
   `create_inpatient_template_table.sql` using `uuid` type for the PK, but
   `db/create-hospital-db.sql` defines it as `TEXT`. If the live DB has a `uuid` PK column,
   the `hospital_id TEXT` column being added is consistent (hospital_id is TEXT throughout).
   No action needed unless this inconsistency causes FK issues later.

4. **Supabase project region.** Phase 2 §1.1 flagged: Supabase free tier defaults to US East;
   DPDP compliance requires India (`ap-south-1`). This is a pre-existing gap that Phase 4
   cannot fix (it requires recreating the Supabase project). Owner must confirm the project's
   current region in the Supabase Dashboard.

5. **`initialize_sequences()` timing.** The Postgres sequence start values are initialized
   to 1. Before the first Edge Function invocation that calls `next_patient_number()`, the
   function `initialize_sequences()` must be called against the live DB to align the sequences
   with the current max IDs. Failing to call it before the first use will cause sequence
   values lower than existing IDs, resulting in UNIQUE constraint violations on insert.
   This must be a deployment step, not left to chance.
