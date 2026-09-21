-- Migration: 20260921110000_hospital_id_backfill.sql
-- Description: Add hospital_id column to every entity table that contains per-hospital data,
--   then backfill all existing rows using the single HospitalProfile row in the live DB.
--   This establishes the tenant isolation column required by ADR-002 and the RLS policies
--   defined in migration 20260921120000.
--
-- IMPORTANT: This is a three-step ADD → BACKFILL → NOT NULL pattern, run in one transaction.
--   Because the live DB has exactly one hospital (confirmed at Phase 4 analysis), every
--   existing row belongs to that one hospital. The backfill is safe and deterministic.
--
-- Tables skipped (pure child/line-item tables scoped entirely through their parent FK):
--   InvoiceItem, Payment, LabInvestigation, LabBillItem, LabPayment,
--   PurchaseOrderItem, PharmacyBillItem, OpticalBillItem, OAuthState,
--   Role (global system roles, not per-hospital), HospitalProfile (IS the hospital),
--   token_revocation (infra table), _prisma_migrations (Prisma internal)
--
-- Rollback (removes columns; data loss if rows were inserted with the column set):
--   ALTER TABLE "User"               DROP COLUMN IF EXISTS hospital_id;
--   ALTER TABLE "Patient"            DROP COLUMN IF EXISTS hospital_id;
--   ... (repeat for every table listed below)

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- 0. Capture the single existing hospital id once for backfill.
--    Using a temp variable so the sub-select is evaluated only once.
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_hospital_id TEXT;
BEGIN
  SELECT id INTO v_hospital_id FROM "HospitalProfile" LIMIT 1;

  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'No HospitalProfile row found — cannot backfill hospital_id. Ensure the hospital profile is seeded before running this migration.';
  END IF;

  -- ─── User (staff belong to one hospital) ──────────────────
  ALTER TABLE "User" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "User" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "User" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── Patient ──────────────────────────────────────────────
  ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "Patient" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "Patient" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── Prescription ─────────────────────────────────────────
  ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "Prescription" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "Prescription" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── EyeReading ───────────────────────────────────────────
  ALTER TABLE "EyeReading" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "EyeReading" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "EyeReading" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PredefinedTemplate ───────────────────────────────────
  ALTER TABLE "PredefinedTemplate" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PredefinedTemplate" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PredefinedTemplate" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── MedicineMaster ───────────────────────────────────────
  ALTER TABLE "MedicineMaster" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "MedicineMaster" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "MedicineMaster" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── InvestigationMaster ──────────────────────────────────
  ALTER TABLE "InvestigationMaster" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "InvestigationMaster" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "InvestigationMaster" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── DropdownOption ───────────────────────────────────────
  ALTER TABLE "DropdownOption" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "DropdownOption" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "DropdownOption" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PredefinedPackage ────────────────────────────────────
  ALTER TABLE "PredefinedPackage" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PredefinedPackage" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PredefinedPackage" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── ServiceTemplate ──────────────────────────────────────
  ALTER TABLE "ServiceTemplate" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "ServiceTemplate" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "ServiceTemplate" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── InPatient ────────────────────────────────────────────
  ALTER TABLE "InPatient" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "InPatient" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "InPatient" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── InsuranceCompany ─────────────────────────────────────
  ALTER TABLE "InsuranceCompany" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "InsuranceCompany" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "InsuranceCompany" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── InsuranceClaim ───────────────────────────────────────
  ALTER TABLE "InsuranceClaim" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "InsuranceClaim" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "InsuranceClaim" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── Lab ──────────────────────────────────────────────────
  ALTER TABLE "Lab" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "Lab" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "Lab" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── LabBill ──────────────────────────────────────────────
  ALTER TABLE "LabBill" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "LabBill" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "LabBill" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── ExpenseCategory ──────────────────────────────────────
  ALTER TABLE "ExpenseCategory" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "ExpenseCategory" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "ExpenseCategory" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── Expense ──────────────────────────────────────────────
  ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "Expense" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "Expense" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PharmacyMedicine ─────────────────────────────────────
  ALTER TABLE "PharmacyMedicine" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PharmacyMedicine" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PharmacyMedicine" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PharmacySupplier ─────────────────────────────────────
  ALTER TABLE "PharmacySupplier" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PharmacySupplier" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PharmacySupplier" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PharmacyStock ────────────────────────────────────────
  ALTER TABLE "PharmacyStock" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PharmacyStock" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PharmacyStock" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PurchaseOrder ────────────────────────────────────────
  ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PurchaseOrder" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PurchaseOrder" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PharmacyBill ─────────────────────────────────────────
  ALTER TABLE "PharmacyBill" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PharmacyBill" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PharmacyBill" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── License ──────────────────────────────────────────────
  ALTER TABLE "License" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "License" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "License" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── OpticalProduct ───────────────────────────────────────
  ALTER TABLE "OpticalProduct" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "OpticalProduct" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "OpticalProduct" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── OpticalStock ─────────────────────────────────────────
  ALTER TABLE "OpticalStock" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "OpticalStock" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "OpticalStock" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── OpticalBill ──────────────────────────────────────────
  ALTER TABLE "OpticalBill" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "OpticalBill" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "OpticalBill" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── CallLog ──────────────────────────────────────────────
  ALTER TABLE "CallLog" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "CallLog" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "CallLog" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── InpatientTemplate ────────────────────────────────────
  ALTER TABLE "InpatientTemplate" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "InpatientTemplate" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "InpatientTemplate" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PredefinedSurgery ────────────────────────────────────
  ALTER TABLE "PredefinedSurgery" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PredefinedSurgery" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PredefinedSurgery" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── PredefinedDischarge ──────────────────────────────────
  ALTER TABLE "PredefinedDischarge" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
  EXECUTE format('UPDATE "PredefinedDischarge" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
  ALTER TABLE "PredefinedDischarge" ALTER COLUMN hospital_id SET NOT NULL;

  -- ─── SocialPost (if table exists — only on DBs with the social module applied) ──
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'SocialPost') THEN
    ALTER TABLE "SocialPost" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
    EXECUTE format('UPDATE "SocialPost" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
    ALTER TABLE "SocialPost" ALTER COLUMN hospital_id SET NOT NULL;
  END IF;

  -- ─── StaffAttendance (if table exists — only on DBs with the full Prisma schema applied) ──
  -- StaffAttendance rows belong to a user who belongs to a hospital.
  -- We add hospital_id here so it can be isolated per tenant.
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StaffAttendance') THEN
    ALTER TABLE "StaffAttendance" ADD COLUMN IF NOT EXISTS hospital_id TEXT;
    EXECUTE format('UPDATE "StaffAttendance" SET hospital_id = %L WHERE hospital_id IS NULL', v_hospital_id);
    ALTER TABLE "StaffAttendance" ALTER COLUMN hospital_id SET NOT NULL;
  END IF;

END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Indexes on hospital_id for every entity table (enables RLS policy
-- evaluation and explicit WHERE hospital_id = ? queries to use index scans)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_hospital_id               ON "User"               (hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_hospital_id            ON "Patient"            (hospital_id);
CREATE INDEX IF NOT EXISTS idx_prescription_hospital_id       ON "Prescription"       (hospital_id);
CREATE INDEX IF NOT EXISTS idx_eye_reading_hospital_id        ON "EyeReading"         (hospital_id);
CREATE INDEX IF NOT EXISTS idx_predefined_template_hosp       ON "PredefinedTemplate" (hospital_id);
CREATE INDEX IF NOT EXISTS idx_medicine_master_hospital_id    ON "MedicineMaster"     (hospital_id);
CREATE INDEX IF NOT EXISTS idx_investigation_master_hosp      ON "InvestigationMaster"(hospital_id);
CREATE INDEX IF NOT EXISTS idx_dropdown_option_hospital_id    ON "DropdownOption"     (hospital_id);
CREATE INDEX IF NOT EXISTS idx_predefined_package_hosp        ON "PredefinedPackage"  (hospital_id);
CREATE INDEX IF NOT EXISTS idx_service_template_hospital_id   ON "ServiceTemplate"    (hospital_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_hospital_id          ON "InPatient"          (hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_company_hospital_id  ON "InsuranceCompany"   (hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claim_hospital_id    ON "InsuranceClaim"     (hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_hospital_id                ON "Lab"                (hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_bill_hospital_id           ON "LabBill"            (hospital_id);
CREATE INDEX IF NOT EXISTS idx_expense_category_hospital_id   ON "ExpenseCategory"    (hospital_id);
CREATE INDEX IF NOT EXISTS idx_expense_hospital_id            ON "Expense"            (hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_medicine_hospital_id  ON "PharmacyMedicine"   (hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_supplier_hospital_id  ON "PharmacySupplier"   (hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_hospital_id     ON "PharmacyStock"      (hospital_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_hospital_id     ON "PurchaseOrder"      (hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_bill_hospital_id      ON "PharmacyBill"       (hospital_id);
CREATE INDEX IF NOT EXISTS idx_license_hospital_id            ON "License"            (hospital_id);
CREATE INDEX IF NOT EXISTS idx_optical_product_hospital_id    ON "OpticalProduct"     (hospital_id);
CREATE INDEX IF NOT EXISTS idx_optical_stock_hospital_id      ON "OpticalStock"       (hospital_id);
CREATE INDEX IF NOT EXISTS idx_optical_bill_hospital_id       ON "OpticalBill"        (hospital_id);
CREATE INDEX IF NOT EXISTS idx_call_log_hospital_id           ON "CallLog"            (hospital_id);
CREATE INDEX IF NOT EXISTS idx_inpatient_template_hosp        ON "InpatientTemplate"  (hospital_id);
CREATE INDEX IF NOT EXISTS idx_predefined_surgery_hosp        ON "PredefinedSurgery"  (hospital_id);
CREATE INDEX IF NOT EXISTS idx_predefined_discharge_hosp      ON "PredefinedDischarge"(hospital_id);

COMMIT;
