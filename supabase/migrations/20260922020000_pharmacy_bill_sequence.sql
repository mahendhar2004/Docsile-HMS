-- Migration: 20260922020000_pharmacy_bill_sequence.sql
-- Description: Add atomic Postgres sequence for PharmacyBill.billNumber.
--   Closes the TOCTOU race in the old getNextBillNumber() helper (src/app/(hospital)/
--   pharmacy/actions.ts) which read the MAX billNumber and incremented in JS — safe at
--   low concurrency, but loses uniqueness under concurrent bill creation (same class
--   of bug as H-3 which was already fixed for patient/IP/prescription numbers).
--   Closes the "Pharmacy bill sequence" item in .sde/PROGRESS.md Known Deferred Items.
--
-- Format contract: 'PH-{year}-{zero-padded 4-digit sequence}'
--   Example: PH-2026-0001, PH-2026-0042
--   The old format (PH-YYYYMMDD-NNNN, daily-scoped) is superseded. Because the two
--   formats are incompatible, the new sequence starts at 1 — there is no collision risk
--   since existing rows use the old date-scoped prefix format (PH-YYYYMMDD-NNNN).
--   New bills will have a clearly distinct format.
--
-- Yearly reset: same pattern as prescription_number_seq — the cron job in
--   supabase/functions/reset-annual-sequences/ must also reset this sequence on
--   January 1:
--     SELECT setval('pharmacy_bill_number_seq', 1, false);
--
-- Alignment: Call initialize_pharmacy_bill_sequence() once after deploying to any
--   environment that already has PH-YYYY-NNNN formatted bills. Not needed for the
--   initial deploy since no bills in that format exist yet.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.next_pharmacy_bill_number(text);
--   DROP FUNCTION IF EXISTS public.initialize_pharmacy_bill_sequence();
--   DROP SEQUENCE IF EXISTS public.pharmacy_bill_number_seq;

BEGIN;

-- ─── Sequence ─────────────────────────────────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS public.pharmacy_bill_number_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;   -- no caching: guarantees no gaps on crash (same policy as other sequences)

-- ─── Alignment function ────────────────────────────────────────────────────────
-- Call once after deployment if there are already PH-YYYY-NNNN format bills in the DB.
-- Aligns the sequence to the current max so nextval() never duplicates an existing number.
-- Note: old-format bills (PH-YYYYMMDD-NNNN) are intentionally excluded — the formats
-- are incompatible and there is no collision risk between them.

CREATE OR REPLACE FUNCTION public.initialize_pharmacy_bill_sequence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := extract(year FROM now())::TEXT;
  v_max  BIGINT;
BEGIN
  -- Find max sequence number among new-format PH-YYYY-NNNN bills for the current year.
  -- split_part returns '' when the part doesn't exist; the ::BIGINT cast will fail for
  -- old-format bills (PH-YYYYMMDD-NNNN has 4 dash-parts, not 3), so we filter to
  -- bills whose number matches the new format exactly.
  SELECT COALESCE(
    MAX(split_part("billNumber", '-', 3)::BIGINT),
    0
  )
  INTO v_max
  FROM "PharmacyBill"
  WHERE "billNumber" ~ ('^PH-' || v_year || '-[0-9]+$')
    AND "billNumber" IS NOT NULL;

  IF v_max > 0 THEN
    PERFORM setval('pharmacy_bill_number_seq', v_max);
  END IF;
END;
$$;

-- ─── Wrapper function callable from Edge Functions via supabase.rpc() ─────────
-- Follows the exact pattern of next_prescription_number(p_year TEXT) in
-- migration 20260921130000_atomic_sequences.sql.

CREATE OR REPLACE FUNCTION public.next_pharmacy_bill_number(p_year TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq BIGINT;
BEGIN
  SELECT nextval('pharmacy_bill_number_seq') INTO v_seq;
  RETURN 'PH-' || p_year || '-' || lpad(v_seq::TEXT, 4, '0');
END;
$$;

-- ─── Grants ───────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.initialize_pharmacy_bill_sequence() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_pharmacy_bill_number(TEXT)      TO service_role;

COMMIT;
