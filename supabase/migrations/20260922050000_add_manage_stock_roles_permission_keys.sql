-- Migration: 20260922050000_add_manage_stock_roles_permission_keys.sql
-- Description: Backfill 4 permission keys into the ADMIN role's `permissions`
--   JSON that were added to supabase/functions/staff/service.ts's
--   ALL_PERMISSION_KEYS (the Edge Function's canonical permission list) after
--   migration 20260922000000_add_new_permission_keys_to_roles.sql last ran —
--   pharmacy:manage_stock, pharmacy:purchase_orders, optical:manage_stock,
--   staff:manage_roles. Discovered live: a logged-in ADMIN session's JWT
--   (supabase/functions/auth/service.ts getRolePermissions()) was missing all
--   four, so every admin was getting 403 Forbidden on Pharmacy's Add
--   Stock/Receive PO actions, Optical's stock management, and Staff's role
--   management — despite the frontend showing those buttons as available
--   (usePermissions() trusts role === "ADMIN" and bypasses locally, but the
--   backend's requirePermission() guard checks the DB-seeded array literally
--   with no role-based bypass — see supabase/functions/_shared/
--   permission-guard.ts and its own docstring on that design choice).
--
-- Only ADMIN is touched: DOCTOR/RECEPTIONIST/OPTOMETRIST/NURSE's permission
-- lists in SYSTEM_ROLES deliberately never included these 4 keys, so they
-- need no change here.
--
-- Safe to re-run: only appends keys not already present in a role's array
-- (no duplicates). Same empty-array skip as 20260922000000 — an empty ADMIN
-- permissions array is a distinct, intentionally-untouched data state (see
-- that migration's own comment); this one only ever backfills a non-empty,
-- already-seeded-but-since-gone-stale array.
--
-- Rollback: re-run with the reverse array (remove the added keys) — not
-- automated here since removing a permission from a live role is a product
-- decision, not a mechanical inverse of this migration.

BEGIN;

DO $$
DECLARE
  new_keys_admin jsonb := '["pharmacy:manage_stock","pharmacy:purchase_orders","optical:manage_stock","staff:manage_roles"]'::jsonb;
  r RECORD;
  merged jsonb;
  key_to_add text;
BEGIN
  FOR r IN
    SELECT id, name, permissions FROM "Role"
    WHERE name = 'ADMIN'
  LOOP
    merged := COALESCE(r.permissions::jsonb, '[]'::jsonb);

    IF jsonb_array_length(merged) > 0 THEN
      FOR key_to_add IN SELECT jsonb_array_elements_text(new_keys_admin) LOOP
        IF NOT merged @> to_jsonb(key_to_add) THEN
          merged := merged || to_jsonb(key_to_add);
        END IF;
      END LOOP;
    END IF;

    UPDATE "Role" SET permissions = merged::text WHERE id = r.id;
  END LOOP;
END;
$$;

COMMIT;
