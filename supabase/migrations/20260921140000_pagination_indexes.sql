-- Migration: 20260921140000_pagination_indexes.sql
-- Description: Add composite indexes to support the two-strategy pagination approach
--   defined in Phase 2 §13.2 (closes H-6: unbounded patient list queries).
--
-- Strategy mapping:
--   Cursor-based (hospital_id, createdAt DESC): Patient search, growing/unbounded result sets
--   Offset-based (hospital_id, appointmentDate DESC): Patient day-list, InPatient list,
--     bounded by date scope; page-number UI navigation
--
-- Prerequisite: migration 20260921110000 (hospital_id must exist on all tables)
--
-- Rollback:
--   DROP INDEX IF EXISTS idx_patient_hospital_created_at;
--   DROP INDEX IF EXISTS idx_patient_hospital_appointment_date;
--   DROP INDEX IF EXISTS idx_patient_hospital_phone;
--   DROP INDEX IF EXISTS idx_patient_hospital_name;
--   DROP INDEX IF EXISTS idx_inpatient_hospital_admission_date;
--   DROP INDEX IF EXISTS idx_inpatient_hospital_status;
--   DROP INDEX IF EXISTS idx_prescription_hospital_date;
--   DROP INDEX IF EXISTS idx_lab_bill_hospital_created_at;
--   DROP INDEX IF EXISTS idx_pharmacy_bill_hospital_date;
--   DROP INDEX IF EXISTS idx_optical_bill_hospital_date;
--   DROP INDEX IF EXISTS idx_expense_hospital_date;
--   DROP INDEX IF EXISTS idx_pharmacy_stock_hospital_expiry;
--   DROP INDEX IF EXISTS idx_call_log_hospital_start_time;
--   DROP INDEX IF EXISTS idx_insurance_claim_hospital_created_at;

BEGIN;

-- ─── Patient: cursor-based search (unbounded) ─────────────────────────────────
-- Used by: getPatients() with search param, infinite-scroll patient history
-- Query pattern: WHERE hospital_id = ? AND (createdAt < cursor OR id < cursor)
--   ORDER BY createdAt DESC, id DESC LIMIT ?
CREATE INDEX IF NOT EXISTS idx_patient_hospital_created_at
  ON "Patient" (hospital_id, "createdAt" DESC);

-- ─── Patient: offset-based day-list (bounded by appointmentDate) ──────────────
-- Used by: getPatients() with date filter (the common daily workflow)
-- Query pattern: WHERE hospital_id = ? AND appointmentDate::date = ?
--   ORDER BY appointmentDate DESC LIMIT ? OFFSET ?
CREATE INDEX IF NOT EXISTS idx_patient_hospital_appointment_date
  ON "Patient" (hospital_id, "appointmentDate" DESC);

-- ─── Patient: search by phone (common lookup pattern) ────────────────────────
-- Query pattern: WHERE hospital_id = ? AND phone ILIKE ?
CREATE INDEX IF NOT EXISTS idx_patient_hospital_phone
  ON "Patient" (hospital_id, "phone");

-- ─── Patient: search by firstName + lastName ──────────────────────────────────
-- Query pattern: WHERE hospital_id = ? AND (firstName ILIKE ? OR lastName ILIKE ?)
-- Partial index or prefix index is not possible without pg_trgm extension;
-- simple B-tree on (hospital_id, firstName) covers equality and prefix scans.
CREATE INDEX IF NOT EXISTS idx_patient_hospital_first_name
  ON "Patient" (hospital_id, "firstName");

CREATE INDEX IF NOT EXISTS idx_patient_hospital_last_name
  ON "Patient" (hospital_id, "lastName");

-- ─── InPatient: offset-based list by admissionDate ───────────────────────────
-- Used by: getInPatients() with date or status filter
-- Query pattern: WHERE hospital_id = ? AND status = ? ORDER BY admissionDate DESC
CREATE INDEX IF NOT EXISTS idx_inpatient_hospital_admission_date
  ON "InPatient" (hospital_id, "admissionDate" DESC);

CREATE INDEX IF NOT EXISTS idx_inpatient_hospital_status
  ON "InPatient" (hospital_id, "status", "admissionDate" DESC);

-- ─── Prescription: by date within hospital ────────────────────────────────────
-- Used by: prescription list view filtered by date
CREATE INDEX IF NOT EXISTS idx_prescription_hospital_date
  ON "Prescription" (hospital_id, "prescriptionDate" DESC);

-- ─── LabBill: list by hospital + date ────────────────────────────────────────
-- Used by: lab billing list, analytics
CREATE INDEX IF NOT EXISTS idx_lab_bill_hospital_created_at
  ON "LabBill" (hospital_id, "createdAt" DESC);

-- ─── PharmacyBill: list by hospital + date ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pharmacy_bill_hospital_date
  ON "PharmacyBill" (hospital_id, "billDate" DESC);

-- ─── OpticalBill: list by hospital + date ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_optical_bill_hospital_date
  ON "OpticalBill" (hospital_id, "billDate" DESC);

-- ─── Expense: list by hospital + date ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expense_hospital_date
  ON "Expense" (hospital_id, "date" DESC);

-- ─── PharmacyStock: list by hospital + expiry ────────────────────────────────
-- Used by: stock expiry dashboard, stock list pagination
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_hospital_expiry
  ON "PharmacyStock" (hospital_id, "expiryDate");

-- ─── CallLog: list by hospital + start time ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_call_log_hospital_start_time
  ON "CallLog" (hospital_id, "startTime" DESC);

-- ─── InsuranceClaim: list by hospital + date ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_insurance_claim_hospital_created_at
  ON "InsuranceClaim" (hospital_id, "createdAt" DESC);

-- ─── License: expiry alerts by hospital ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_license_hospital_expiry
  ON "License" (hospital_id, "expiryDate");

COMMIT;
