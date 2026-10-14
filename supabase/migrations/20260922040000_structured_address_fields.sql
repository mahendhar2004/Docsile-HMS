-- Migration: 20260922040000_structured_address_fields.sql
-- Description: Add structured address columns (addressLine, area, city,
--   state, pincode) to Patient and InPatient, so future analytics can break
--   down patient origin (city/state/pincode) — not possible with a single
--   free-text address blob. The old "address" column is kept, nullable and
--   unused going forward, since many read-only display sites (receipts,
--   reports, exports, patient-detail-panel) still read it; no migration of
--   existing data into the new columns is attempted (there is nothing
--   structured to parse out of the old free-text values).
-- Rollback:
--   ALTER TABLE "Patient" DROP COLUMN IF EXISTS "addressLine";
--   ALTER TABLE "Patient" DROP COLUMN IF EXISTS "area";
--   ALTER TABLE "Patient" DROP COLUMN IF EXISTS "city";
--   ALTER TABLE "Patient" DROP COLUMN IF EXISTS "state";
--   ALTER TABLE "Patient" DROP COLUMN IF EXISTS "pincode";
--   ALTER TABLE "InPatient" DROP COLUMN IF EXISTS "addressLine";
--   ALTER TABLE "InPatient" DROP COLUMN IF EXISTS "area";
--   ALTER TABLE "InPatient" DROP COLUMN IF EXISTS "city";
--   ALTER TABLE "InPatient" DROP COLUMN IF EXISTS "state";
--   ALTER TABLE "InPatient" DROP COLUMN IF EXISTS "pincode";

BEGIN;

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "addressLine" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "pincode" TEXT;

ALTER TABLE "InPatient" ADD COLUMN IF NOT EXISTS "addressLine" TEXT;
ALTER TABLE "InPatient" ADD COLUMN IF NOT EXISTS "area" TEXT;
ALTER TABLE "InPatient" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "InPatient" ADD COLUMN IF NOT EXISTS "state" TEXT;
ALTER TABLE "InPatient" ADD COLUMN IF NOT EXISTS "pincode" TEXT;

-- Index city/state for the analytics use case this is explicitly for
-- ("where are patients coming from") — these are the columns a region/
-- origin breakdown query would GROUP BY or WHERE on.
CREATE INDEX IF NOT EXISTS "idx_patient_city" ON "Patient" ("city") WHERE "city" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_patient_state" ON "Patient" ("state") WHERE "state" IS NOT NULL;

COMMIT;
