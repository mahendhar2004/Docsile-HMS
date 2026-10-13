-- Seed a minimal HospitalProfile + ADMIN Role + admin User so a brand new
-- (empty) database has at least one login-able account and a hospital row
-- for 20260921110000_hospital_id_backfill.sql to backfill against.
--
-- Rollback: DELETE FROM "User" WHERE email = 'admin@docsile.local';
--           DELETE FROM "Role" WHERE name = 'ADMIN';
--           DELETE FROM "HospitalProfile" WHERE name = 'Docsile Hospital';

BEGIN;

INSERT INTO "HospitalProfile" (id, name, "updatedAt")
SELECT gen_random_uuid()::text, 'Docsile Hospital', now()
WHERE NOT EXISTS (SELECT 1 FROM "HospitalProfile");

INSERT INTO "Role" (id, name, "displayName", permissions, "isSystem", "isActive", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'ADMIN',
  'Administrator',
  '["billing:create","billing:delete","billing:view","dashboard:view","data:export","doctor:consult","doctor:view","dues:edit","dues:view","expenses:create","expenses:delete","expenses:edit","expenses:view","inpatients:create","inpatients:delete","inpatients:discharge","inpatients:edit","inpatients:view","insurance:create","insurance:edit","insurance:view","labs:config","labs:create","labs:edit","labs:view","licenses:create","licenses:delete","licenses:edit","licenses:view","optical:create","optical:edit","optical:view","patients:create","patients:delete","patients:edit","patients:view","pharmacy:create","pharmacy:edit","pharmacy:view","reports:view","settings:edit","settings:view","staff:create","staff:deactivate","staff:edit","staff:view","workup:create","workup:edit","workup:view"]',
  TRUE,
  TRUE,
  now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE name = 'ADMIN');

INSERT INTO "User" (id, email, "passwordHash", "fullName", role, "isActive", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'admin@docsile.local',
  '$2b$10$WWrELmYXiu4lGFJFCJzcUOKV9a78Cv00NbF4nU8cfG5wRZ7YxuY.C',
  'Admin',
  'ADMIN',
  TRUE,
  now()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'admin@docsile.local');

COMMIT;
