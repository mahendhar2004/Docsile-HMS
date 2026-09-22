-- Migration: 20260922000000_add_new_permission_keys_to_roles.sql
-- Description: Merge the 3 new permission groups introduced by the Edge Function
--   migration (billing:*, queue:view, call_logs:*) into existing Role rows'
--   `permissions` JSON (stored as TEXT). These permissions didn't exist before
--   this migration — see src/lib/permissions.ts ALL_PERMISSIONS and
--   .sde/PROGRESS.md "Known Deferred Items" for context.
--
-- Safe to re-run: only appends keys not already present in a role's array
-- (no duplicates), and does nothing to roles not matched by name below.
--
-- Rollback: re-run with the reverse array (remove the added keys) — not
-- automated here since removing a permission from a live role is a product
-- decision, not a mechanical inverse of this migration.

BEGIN;

DO $$
DECLARE
  new_keys_admin jsonb := '["billing:view","billing:create","billing:delete","queue:view","call_logs:view","call_logs:edit","call_logs:sync"]'::jsonb;
  new_keys_doctor jsonb := '["billing:view","queue:view"]'::jsonb;
  new_keys_receptionist jsonb := '["billing:view","billing:create","queue:view","call_logs:view","call_logs:edit","call_logs:sync"]'::jsonb;
  new_keys_nurse jsonb := '["queue:view"]'::jsonb;
  r RECORD;
  merged jsonb;
  key_to_add text;
BEGIN
  FOR r IN
    SELECT id, name, permissions FROM "Role"
    WHERE name IN ('ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE')
  LOOP
    merged := COALESCE(r.permissions::jsonb, '[]'::jsonb);

    CASE r.name
      WHEN 'ADMIN' THEN
        -- IMPORTANT: src/app/(auth)/login/actions.ts treats an EMPTY
        -- ADMIN.permissions array as "give this admin every permission via
        -- getAllPermissionKeys()". If we appended keys to an empty array
        -- here, we would accidentally downgrade that admin from "gets
        -- everything" to "gets only these 7 new keys". Skip ADMIN rows
        -- that are currently empty — the empty-array fallback already
        -- covers the new keys automatically (getAllPermissionKeys() now
        -- includes billing/queue/call_logs).
        IF jsonb_array_length(merged) > 0 THEN
          FOR key_to_add IN SELECT jsonb_array_elements_text(new_keys_admin) LOOP
            IF NOT merged @> to_jsonb(key_to_add) THEN
              merged := merged || to_jsonb(key_to_add);
            END IF;
          END LOOP;
        END IF;
      WHEN 'DOCTOR' THEN
        FOR key_to_add IN SELECT jsonb_array_elements_text(new_keys_doctor) LOOP
          IF NOT merged @> to_jsonb(key_to_add) THEN
            merged := merged || to_jsonb(key_to_add);
          END IF;
        END LOOP;
      WHEN 'RECEPTIONIST' THEN
        FOR key_to_add IN SELECT jsonb_array_elements_text(new_keys_receptionist) LOOP
          IF NOT merged @> to_jsonb(key_to_add) THEN
            merged := merged || to_jsonb(key_to_add);
          END IF;
        END LOOP;
      WHEN 'NURSE' THEN
        FOR key_to_add IN SELECT jsonb_array_elements_text(new_keys_nurse) LOOP
          IF NOT merged @> to_jsonb(key_to_add) THEN
            merged := merged || to_jsonb(key_to_add);
          END IF;
        END LOOP;
    END CASE;

    UPDATE "Role" SET permissions = merged::text WHERE id = r.id;
  END LOOP;
END;
$$;

COMMIT;
