# supabase/migrations — Migration File Structure

## Convention

Migration files follow the Supabase CLI convention:

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Timestamps are UTC. Each file contains one logical change wrapped in `BEGIN; ... COMMIT;`.

## Relationship to the Legacy SQL Files at the Repo Root

The following SQL files at the repo root (and under `db/`) represent the baseline schema
that was already applied to the live database before this migration directory existed.
They are NOT managed by Supabase CLI and should not be run again:

| File | Status |
|---|---|
| `supabase-migration.sql` | Baseline schema (36 tables). Applied to live DB. Do not re-run. |
| `supabase-migration-extended-vitals.sql` | Adds `Prescription.heightCm`, `weightKg`. Applied. |
| `supabase-migration-lab-header.sql` | Adds `Lab.printHeaderKey`. Applied. |
| `supabase-migration-predefined-discharge.sql` | Adds `PredefinedDischarge` table. Applied. |
| `supabase-migration-predefined-surgery.sql` | Adds `PredefinedSurgery` table; drops `InPatient.onDutyDoctor`, adds `onDutyDoctors`. Applied. |
| `supabase-migration-registration-fee.sql` | Adds `HospitalProfile` registration fee columns. Applied. |
| `supabase-migration-user-preferences.sql` | Adds `User.preferences`. Applied. |
| `create_call_log_table.sql` | Adds `CallLog` table. Applied. |
| `create_inpatient_template_table.sql` | Adds `InpatientTemplate` table with legacy permissive RLS policies (replaced by this directory's 20260921120000). Applied. |
| `db/create-hospital-db.sql` | Full Prisma-generated schema dump. Represents the Prisma ORM's view of the DB. More complete than `supabase-migration.sql` (includes `StaffAttendance`, `PredefinedSurgery`, `PredefinedDischarge`, `SocialPost`, `OAuthState`). Used as the reference for the DB state prior to this directory. Do not re-run. |
| `db/migrations/prescription-height-weight.sql` | Duplicate of `supabase-migration-extended-vitals.sql`. Applied. |
| `db/migrations/social-module.sql` | Adds `SocialPost`, `OAuthState`, and `HospitalProfile` social columns. Applied. |

These files are kept in the repo for audit/history purposes. They are the "baseline"
that the migrations in this directory build on top of.

## New Migrations (this directory manages these going forward)

| File | Applies | Issue Fixed |
|---|---|---|
| `20260921100000_token_revocation.sql` | `token_revocation` table | H-1 |
| `20260921110000_hospital_id_backfill.sql` | `hospital_id` column on all entity tables | ADR-002 |
| `20260921120000_rls_tenant_isolation.sql` | RLS tenant isolation policies | ADR-002 |
| `20260921130000_atomic_sequences.sql` | Postgres sequences for atomic ID generation | H-3 |
| `20260921140000_pagination_indexes.sql` | Composite indexes for cursor/offset pagination | H-6 |

## Rules

1. Never edit a migration file after it has been applied to any environment.
2. New schema changes always get a new file — never append to existing migrations.
3. Every file must wrap its statements in `BEGIN; ... COMMIT;`.
4. Include a `-- Rollback:` comment block at the top describing how to reverse the migration.
5. Generate timestamps with: `date -u +"%Y%m%d%H%M%S"`
