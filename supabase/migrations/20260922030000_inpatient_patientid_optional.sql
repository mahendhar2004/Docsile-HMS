-- Migration: 20260922030000_inpatient_patientid_optional.sql
-- Description: InPatient is a self-contained demographic + admission +
--   operation + billing record in main (name/age/gender/phone/address all
--   live on the row itself) — InPatient.patientId is only an OPTIONAL
--   reference to an existing OPD patient found via lookup during admission,
--   never a required link. The column was left NOT NULL from an earlier
--   migration phase that assumed every InPatient must reference a Patient
--   row, which blocked admitting a patient with no prior OPD visit (FK
--   violation on patientId = '' since the column disallowed NULL).
-- Rollback:
--   -- Only safe if no existing rows have patientId IS NULL.
--   ALTER TABLE "InPatient" ALTER COLUMN "patientId" SET NOT NULL;

BEGIN;

ALTER TABLE "InPatient" ALTER COLUMN "patientId" DROP NOT NULL;

COMMIT;
