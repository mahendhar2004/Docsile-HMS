-- Migration: 20260922060000_peek_sequence_functions.sql
-- Description: Add non-consuming "peek" variants of next_patient_number()/
--   next_ip_number() for the UI's next-ID preview (GET /patients/next-id,
--   GET /inpatients/next-id).
--
-- Bug fixed: those preview endpoints were calling next_patient_number()/
--   next_ip_number() directly — the SAME nextval()-advancing functions
--   createPatient()/createInPatient() use to assign the real, final ID.
--   Every time the registration/admission dialog opened (even if the user
--   cancelled without saving), it silently burned a real sequence value,
--   so the previewed "next patient ID" kept climbing with no patient ever
--   created. The real ID is independently re-derived via next_patient_number()/
--   next_ip_number() at actual insert time regardless of what the preview
--   showed, so the preview never needed to consume a slot at all — it only
--   needs to show what nextval() WOULD return right now.
--
-- These peek functions read a sequence's current state via its own relation
-- (every Postgres sequence can be SELECTed from directly) without calling
-- nextval(), so repeatedly opening/closing the dialog no longer advances
-- anything. next_patient_number()/next_ip_number() themselves are untouched —
-- still the sole, atomic source of truth for real ID assignment (H-3).
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.peek_patient_number();
--   DROP FUNCTION IF EXISTS public.peek_ip_number();

BEGIN;

CREATE OR REPLACE FUNCTION public.peek_patient_number()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END
    FROM patient_number_seq;
$$;

CREATE OR REPLACE FUNCTION public.peek_ip_number()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END
    FROM ip_number_seq;
$$;

GRANT EXECUTE ON FUNCTION public.peek_patient_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.peek_ip_number()      TO service_role;

COMMIT;
