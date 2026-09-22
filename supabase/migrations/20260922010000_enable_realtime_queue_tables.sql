-- Migration: 20260922010000_enable_realtime_queue_tables.sql
-- Description: Enable Supabase Realtime (PostgreSQL logical replication / CDC) on the
--   tables whose writes drive the three real-time boards specified in ADR-003.
--
-- Without this migration, the frontend's Supabase Realtime subscriptions (using the
-- `postgres_changes` listener on these tables) silently receive nothing — the Realtime
-- service only broadcasts CDC events for tables that are members of the
-- supabase_realtime publication.
--
-- Channel → table mapping (ADR-003 channel naming convention):
--
--   hospital:{hospitalId}:queue
--     → "Patient"      — when appointment date changes or new patient registered,
--                        the OPD queue membership changes.
--     → "Prescription" — when a prescription is saved (new or updated), the patient's
--                        computed queue status changes (BILLING_ONLY → COMPLETED etc.).
--     → "EyeReading"   — when an eye reading is saved, the workup status changes
--                        (REGISTERED → WORKUP_DONE), updating queue position/status.
--
--   hospital:{hospitalId}:beds
--     → "InPatient"    — when an inpatient is admitted, transferred, or discharged, the
--                        bed board changes. Every write to this table is a board event.
--
--   hospital:{hospitalId}:appointments
--     → "Patient"      — appointment data lives on Patient.appointmentDate (there is no
--                        separate Appointment table in this schema). The same Patient
--                        publication entry covers both the queue and appointments channels.
--
-- Note on PII: ADR-003 requires that broadcast payloads never include patient name,
-- phone, or clinical data. Supabase Realtime column filtering (configured in the
-- Supabase dashboard or via the client-side subscription `filter` option) is the
-- mechanism for this — it is a client-side / dashboard concern, NOT enforced here
-- in the publication setup. The publication broadcasts the full row change; the
-- frontend subscription must filter to non-PII columns (status, updatedAt, id, etc.).
--
-- Rollback:
--   ALTER PUBLICATION supabase_realtime DROP TABLE "Patient";
--   ALTER PUBLICATION supabase_realtime DROP TABLE "Prescription";
--   ALTER PUBLICATION supabase_realtime DROP TABLE "EyeReading";
--   ALTER PUBLICATION supabase_realtime DROP TABLE "InPatient";

ALTER PUBLICATION supabase_realtime ADD TABLE "Patient";
ALTER PUBLICATION supabase_realtime ADD TABLE "Prescription";
ALTER PUBLICATION supabase_realtime ADD TABLE "EyeReading";
ALTER PUBLICATION supabase_realtime ADD TABLE "InPatient";
