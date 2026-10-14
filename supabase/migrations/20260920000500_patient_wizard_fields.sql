-- Migration: 20260920000500_patient_wizard_fields.sql
-- Description: Add columns needed by main's real 3-step patient registration
--   wizard (PatientRegistrationStepper on main), which the initial React port
--   never carried over: Patient.patientCategory (an open, tenant-editable
--   "patient type" tag defaulting "Regular" — unrelated to patientType
--   OPD/IPD), and HospitalProfile's registration-fee config (already read/
--   written by the Settings module's hospital-profile-section.tsx, but the
--   columns backing it were never added to this schema).
-- Rollback:
--   ALTER TABLE "Patient" DROP COLUMN IF EXISTS "patientCategory";
--   ALTER TABLE "HospitalProfile" DROP COLUMN IF EXISTS "registrationFeeEnabled";
--   ALTER TABLE "HospitalProfile" DROP COLUMN IF EXISTS "registrationFeeAmount";
--   ALTER TABLE "HospitalProfile" DROP COLUMN IF EXISTS "registrationFeeDefaultChecked";

BEGIN;

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "patientCategory" TEXT;

ALTER TABLE "HospitalProfile" ADD COLUMN IF NOT EXISTS "registrationFeeEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "HospitalProfile" ADD COLUMN IF NOT EXISTS "registrationFeeAmount" DOUBLE PRECISION;
ALTER TABLE "HospitalProfile" ADD COLUMN IF NOT EXISTS "registrationFeeDefaultChecked" BOOLEAN NOT NULL DEFAULT true;

COMMIT;
