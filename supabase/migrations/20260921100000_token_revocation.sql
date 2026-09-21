-- Migration: 20260921100000_token_revocation.sql
-- Description: Create token_revocation table for H-1 fix (logout token invalidation)
--   Allows the auth middleware to check whether a JWT jti has been revoked on logout.
--   Also stores refresh token jtis to enforce refresh-token rotation.
-- Related: ADR-002, ADR-005, Phase 2 §5 auth flow
-- Rollback:
--   DROP TABLE IF EXISTS public.token_revocation;

BEGIN;

CREATE TABLE IF NOT EXISTS public.token_revocation (
  jti         TEXT        NOT NULL,
  token_type  TEXT        NOT NULL DEFAULT 'access', -- 'access' | 'refresh'
  revoked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL,                  -- copy of JWT exp claim; drives cleanup

  CONSTRAINT token_revocation_pkey     PRIMARY KEY (jti),
  CONSTRAINT token_revocation_type_chk CHECK (token_type IN ('access', 'refresh'))
);

-- Look up a jti quickly on every authenticated request
CREATE INDEX IF NOT EXISTS idx_token_revocation_jti
  ON public.token_revocation (jti);

-- Cleanup: only rows that haven't expired yet matter for revocation checks.
-- A background job (or a Postgres periodic function) can:
--   DELETE FROM public.token_revocation WHERE expires_at < now();
-- This index makes that DELETE efficient.
CREATE INDEX IF NOT EXISTS idx_token_revocation_expires_at
  ON public.token_revocation (expires_at);

-- Enable RLS. No policies needed here:
--   - Only the service-role key (from Edge Functions) inserts/reads rows.
--   - No client-side access is ever needed or desired for this table.
--   - RLS with no permissive policies = default-deny for anon / authenticated roles.
ALTER TABLE public.token_revocation ENABLE ROW LEVEL SECURITY;

COMMIT;
