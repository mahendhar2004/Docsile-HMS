-- Migration: 20260921120000_rls_tenant_isolation.sql
-- Description: Enable Row Level Security on all entity tables and create per-table
--   tenant isolation policies. Implements the "hybrid" authorization decision from
--   ADR-002: RLS enforces hospital_id isolation as defense-in-depth; fine-grained
--   RBAC remains in the Edge Function permission guard layer.
--
-- Mechanism: Policies read `current_setting('app.hospital_id', true)` — the `true`
--   arg means return NULL (not error) when the variable is not set.
--   Edge Functions using the service_role key bypass RLS entirely (Postgres BYPASSRLS
--   attribute on the service_role). These policies therefore protect:
--     (a) Direct PostgREST REST calls using the anon key (which are blocked by default
--         since app.hospital_id is not set in those sessions → policy evaluates to NULL
--         = false → row not returned).
--     (b) Supabase Realtime postgres_changes subscriptions (anon key) — see ADR-006
--         for why Realtime uses channel-filtered broadcasts, not table reads.
--     (c) Any future access path that uses a non-BYPASSRLS Postgres role.
--   See ADR-006 for the full decision on whether to create a dedicated app_api role
--   that DOES enforce RLS from Edge Functions.
--
-- Prerequisite: migration 20260921110000 (hospital_id column must exist on all tables)
--
-- Rollback:
--   ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS tenant_isolation ON "User";
--   ... (repeat for every table)

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- Helper: one macro-style DO block that enables RLS and creates the policy
-- on each table. Written as individual statements for clarity and for the
-- Supabase Dashboard to display each policy separately.
-- ─────────────────────────────────────────────────────────────

-- ─── User ────────────────────────────────────────────────────
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "User"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── Patient ─────────────────────────────────────────────────
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Patient"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── Prescription ────────────────────────────────────────────
ALTER TABLE "Prescription" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Prescription"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── InvoiceItem (child of Prescription; scoped via parent FK) ───────────
-- RLS blocks all direct anon access. Edge Functions join through Prescription.
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny for all non-service-role roles.

-- ─── Payment (child of Prescription) ─────────────────────────
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny for all non-service-role roles.

-- ─── EyeReading ──────────────────────────────────────────────
ALTER TABLE "EyeReading" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "EyeReading"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PredefinedTemplate ──────────────────────────────────────
ALTER TABLE "PredefinedTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PredefinedTemplate"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── MedicineMaster ──────────────────────────────────────────
ALTER TABLE "MedicineMaster" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "MedicineMaster"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── InvestigationMaster ─────────────────────────────────────
ALTER TABLE "InvestigationMaster" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InvestigationMaster"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── DropdownOption ──────────────────────────────────────────
ALTER TABLE "DropdownOption" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "DropdownOption"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PredefinedPackage ───────────────────────────────────────
ALTER TABLE "PredefinedPackage" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PredefinedPackage"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── ServiceTemplate ─────────────────────────────────────────
ALTER TABLE "ServiceTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ServiceTemplate"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── InPatient ───────────────────────────────────────────────
ALTER TABLE "InPatient" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InPatient"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── InsuranceCompany ────────────────────────────────────────
ALTER TABLE "InsuranceCompany" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InsuranceCompany"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── InsuranceClaim ──────────────────────────────────────────
ALTER TABLE "InsuranceClaim" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InsuranceClaim"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── Lab ─────────────────────────────────────────────────────
ALTER TABLE "Lab" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Lab"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── LabInvestigation (child of Lab) ─────────────────────────
ALTER TABLE "LabInvestigation" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny.

-- ─── LabBill ─────────────────────────────────────────────────
ALTER TABLE "LabBill" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "LabBill"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── LabBillItem (child of LabBill) ──────────────────────────
ALTER TABLE "LabBillItem" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny.

-- ─── LabPayment (child of LabBill) ───────────────────────────
ALTER TABLE "LabPayment" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny.

-- ─── ExpenseCategory ─────────────────────────────────────────
ALTER TABLE "ExpenseCategory" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "ExpenseCategory"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── Expense ─────────────────────────────────────────────────
ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Expense"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PharmacyMedicine ────────────────────────────────────────
ALTER TABLE "PharmacyMedicine" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PharmacyMedicine"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PharmacySupplier ────────────────────────────────────────
ALTER TABLE "PharmacySupplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PharmacySupplier"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PharmacyStock ───────────────────────────────────────────
ALTER TABLE "PharmacyStock" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PharmacyStock"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PurchaseOrder ───────────────────────────────────────────
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PurchaseOrder"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PurchaseOrderItem (child of PurchaseOrder) ──────────────
ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny.

-- ─── PharmacyBill ────────────────────────────────────────────
ALTER TABLE "PharmacyBill" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PharmacyBill"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PharmacyBillItem (child of PharmacyBill) ────────────────
ALTER TABLE "PharmacyBillItem" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny.

-- ─── License ─────────────────────────────────────────────────
ALTER TABLE "License" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "License"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── OpticalProduct ──────────────────────────────────────────
ALTER TABLE "OpticalProduct" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "OpticalProduct"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── OpticalStock ────────────────────────────────────────────
ALTER TABLE "OpticalStock" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "OpticalStock"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── OpticalBill ─────────────────────────────────────────────
ALTER TABLE "OpticalBill" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "OpticalBill"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── OpticalBillItem (child of OpticalBill) ──────────────────
ALTER TABLE "OpticalBillItem" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny.

-- ─── CallLog ─────────────────────────────────────────────────
ALTER TABLE "CallLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "CallLog"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── InpatientTemplate ───────────────────────────────────────
-- Drop the previously-created permissive policies from create_inpatient_template_table.sql
-- (those policies were "allow all authenticated" — too permissive for multi-tenant use).
DROP POLICY IF EXISTS "Allow authenticated read"  ON "InpatientTemplate";
DROP POLICY IF EXISTS "Allow authenticated write" ON "InpatientTemplate";
ALTER TABLE "InpatientTemplate" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "InpatientTemplate"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PredefinedSurgery ───────────────────────────────────────
ALTER TABLE "PredefinedSurgery" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PredefinedSurgery"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── PredefinedDischarge ─────────────────────────────────────
ALTER TABLE "PredefinedDischarge" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "PredefinedDischarge"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- ─── token_revocation (infra table — no client access ever) ──
-- RLS already enabled with no policies in 20260921100000.
-- Nothing to do here.

-- ─── HospitalProfile (the tenant root — readable by anyone who can log in) ──
-- No hospital_id column needed (it IS the hospital). RLS on this table is
-- intentionally minimal: anon/authenticated users cannot read it directly.
-- The service_role key (Edge Functions) bypasses RLS to read it.
ALTER TABLE "HospitalProfile" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny for anon / authenticated roles.

-- ─── Role (global system roles — readable, not writable by non-service-role) ──
ALTER TABLE "Role" ENABLE ROW LEVEL SECURITY;
-- No permissive policy: default-deny for direct access.

-- ─── SocialPost (conditional — only if table exists) ─────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SocialPost') THEN
    EXECUTE 'ALTER TABLE "SocialPost" ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$
      CREATE POLICY tenant_isolation ON "SocialPost"
        FOR ALL
        USING (hospital_id = current_setting('app.hospital_id', true))
    $p$;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StaffAttendance') THEN
    EXECUTE 'ALTER TABLE "StaffAttendance" ENABLE ROW LEVEL SECURITY';
    EXECUTE $p$
      CREATE POLICY tenant_isolation ON "StaffAttendance"
        FOR ALL
        USING (hospital_id = current_setting('app.hospital_id', true))
    $p$;
  END IF;
END;
$$;

COMMIT;
