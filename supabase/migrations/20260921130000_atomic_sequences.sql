-- Migration: 20260921130000_atomic_sequences.sql
-- Description: Replace the JS-side "read last id → increment → insert" TOCTOU pattern
--   with Postgres sequences. Fixes issue H-3: concurrent registrations see the same
--   "last ID" and generate duplicate sequential IDs.
--
-- Sequences created:
--   patient_number_seq      — for Patient.patientId (simple incrementing integer)
--   ip_number_seq           — for InPatient.ipNumber  (simple incrementing integer)
--   prescription_number_seq — for Prescription.prescriptionNumber within a given year
--   insurance_claim_num_seq — for InsuranceClaim.claimNumber within a given year
--
-- Format contract (must match what the Edge Functions generate):
--   patientId:          nextval('patient_number_seq') → the number itself (Edge Function
--                       formats it as needed, e.g., "42" or "P-0042")
--   ipNumber:           nextval('ip_number_seq') → number, Edge Function formats as "IP-0042"
--   prescriptionNumber: '{YYYY}-{nextval(prescription_number_seq) zero-padded to 4}'
--                       The sequence is reset to 1 at year-start via a scheduled Edge
--                       Function (see note below on yearly reset).
--   claimNumber:        'INS-{YYYY}-{nextval(insurance_claim_num_seq) zero-padded to 4}'
--
-- Initializing start values: We set the start value higher than any current row to avoid
--   collision with existing data. The Edge Function must read the current max and use
--   SETVAL to initialize if the sequence start is lower (idempotent startup check).
--   This migration seeds each sequence at 1 — the first Edge Function deployment should
--   call initialize_sequences() below to align with live data.
--
-- Yearly reset for prescriptionNumber and claimNumber:
--   These IDs include the year prefix. The sequence itself is a global counter; the
--   year is prepended at format time. At year boundary, a Supabase Edge Function
--   cron job runs: SELECT setval('prescription_number_seq', 1, false) to reset to 1.
--   The false argument means nextval() will return 1 (not 2) on the next call.
--   See the scheduled Edge Function in supabase/functions/reset-annual-sequences/.
--
-- Rollback:
--   DROP SEQUENCE IF EXISTS public.patient_number_seq;
--   DROP SEQUENCE IF EXISTS public.ip_number_seq;
--   DROP SEQUENCE IF EXISTS public.prescription_number_seq;
--   DROP SEQUENCE IF EXISTS public.insurance_claim_num_seq;
--   DROP FUNCTION IF EXISTS public.initialize_sequences();
--   DROP FUNCTION IF EXISTS public.next_patient_number();
--   DROP FUNCTION IF EXISTS public.next_ip_number();
--   DROP FUNCTION IF EXISTS public.next_prescription_number(text);
--   DROP FUNCTION IF EXISTS public.next_insurance_claim_number(text);

BEGIN;

-- ─── Sequences ───────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.patient_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;   -- no caching: guarantees no gaps on crash (acceptable small perf cost)

CREATE SEQUENCE IF NOT EXISTS public.ip_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Yearly-scoped sequences (reset at year-start; initialized to 1 here):
CREATE SEQUENCE IF NOT EXISTS public.prescription_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE SEQUENCE IF NOT EXISTS public.insurance_claim_num_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ─── Alignment function: call once after deploying to live DB ────────────────
-- Sets each sequence to max(current value, highest existing row number) so
-- nextval() always returns a value higher than any existing ID in the table.
-- Edge Function startup check calls this before the first ID generation.

CREATE OR REPLACE FUNCTION public.initialize_sequences()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_patient     BIGINT;
  v_max_ip          BIGINT;
  v_max_rx          BIGINT;
  v_max_claim       BIGINT;
  v_year            TEXT := extract(year FROM now())::TEXT;
BEGIN
  -- Patient number: strip all non-digits and take max
  SELECT COALESCE(MAX(regexp_replace("patientId", '\D', '', 'g')::BIGINT), 0)
    INTO v_max_patient
    FROM "Patient"
   WHERE "patientId" ~ '^\D*\d+\D*$';

  IF v_max_patient > 0 THEN
    PERFORM setval('patient_number_seq', v_max_patient);
  END IF;

  -- IP number: strip all non-digits and take max
  SELECT COALESCE(MAX(regexp_replace("ipNumber", '\D', '', 'g')::BIGINT), 0)
    INTO v_max_ip
    FROM "InPatient"
   WHERE "ipNumber" ~ '^\D*\d+\D*$';

  IF v_max_ip > 0 THEN
    PERFORM setval('ip_number_seq', v_max_ip);
  END IF;

  -- Prescription number for current year: last numeric segment
  SELECT COALESCE(MAX(split_part("prescriptionNumber", '-', 2)::BIGINT), 0)
    INTO v_max_rx
    FROM "Prescription"
   WHERE "prescriptionNumber" LIKE v_year || '-%'
     AND "prescriptionNumber" IS NOT NULL;

  IF v_max_rx > 0 THEN
    PERFORM setval('prescription_number_seq', v_max_rx);
  END IF;

  -- Insurance claim number for current year: last numeric segment
  SELECT COALESCE(MAX(split_part("claimNumber", '-', 3)::BIGINT), 0)
    INTO v_max_claim
    FROM "InsuranceClaim"
   WHERE "claimNumber" LIKE 'INS-' || v_year || '-%'
     AND "claimNumber" IS NOT NULL;

  IF v_max_claim > 0 THEN
    PERFORM setval('insurance_claim_num_seq', v_max_claim);
  END IF;
END;
$$;

-- ─── Convenience wrapper functions callable from Edge Functions ───────────────
-- These are the functions the shared-kernel/id-generators module calls.
-- Using SECURITY DEFINER so they work with the service_role context.

CREATE OR REPLACE FUNCTION public.next_patient_number()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('patient_number_seq');
$$;

CREATE OR REPLACE FUNCTION public.next_ip_number()
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT nextval('ip_number_seq');
$$;

-- Returns formatted prescription number: '{year}-{zero-padded 4-digit sequence}'
CREATE OR REPLACE FUNCTION public.next_prescription_number(p_year TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  SELECT nextval('prescription_number_seq') INTO v_seq;
  RETURN p_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- Returns formatted insurance claim number: 'INS-{year}-{zero-padded 4-digit sequence}'
CREATE OR REPLACE FUNCTION public.next_insurance_claim_number(p_year TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  SELECT nextval('insurance_claim_num_seq') INTO v_seq;
  RETURN 'INS-' || p_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- ─── Grant execute to the service_role (used by Edge Functions) ──────────────
GRANT EXECUTE ON FUNCTION public.initialize_sequences()                    TO service_role;
GRANT EXECUTE ON FUNCTION public.next_patient_number()                     TO service_role;
GRANT EXECUTE ON FUNCTION public.next_ip_number()                          TO service_role;
GRANT EXECUTE ON FUNCTION public.next_prescription_number(TEXT)            TO service_role;
GRANT EXECUTE ON FUNCTION public.next_insurance_claim_number(TEXT)         TO service_role;

COMMIT;
