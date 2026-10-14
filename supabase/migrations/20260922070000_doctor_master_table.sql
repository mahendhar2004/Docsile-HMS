-- ─── Doctor master entity ──────────────────────────────────────────────────
-- Net-new table — neither main nor this port has ever had a real Doctor
-- entity (doctors were only ever represented as a free-text
-- DropdownOption(fieldName='doctorName') value, or via User.role='DOCTOR'
-- for login/permissions, an unrelated concept). User explicitly requested a
-- full Doctor profile (name, department, specialization, consultation fee,
-- phone, active/inactive), managed centrally, used app-wide wherever a
-- "doctor name" field is picked (Patient Registration, IPD Admission,
-- Predefined Surgery templates).
--
-- Column/constraint pattern copied verbatim from MedicineMaster (the closest
-- existing master-data table): TEXT id (app-generated via crypto.randomUUID()
-- through the shared withTimestamps() helper, not a DB default — see
-- supabase/functions/_shared/db-helpers.ts), unique name per hospital,
-- isActive + sortOrder, createdBy/createdAt/updatedAt, hospital_id + RLS.
CREATE TABLE "Doctor" (
  "id"               TEXT        NOT NULL,
  "name"             TEXT        NOT NULL,
  "department"       TEXT,
  "specialization"   TEXT,
  "consultationFee"  DOUBLE PRECISION,
  "phone"            TEXT,
  "isActive"         BOOLEAN     NOT NULL DEFAULT TRUE,
  "sortOrder"        INTEGER     NOT NULL DEFAULT 0,
  "createdBy"        TEXT        NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "hospital_id"      TEXT        NOT NULL,

  CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Doctor_hospital_name_key" ON "Doctor"("hospital_id", "name");
CREATE INDEX "Doctor_hospital_id_idx"         ON "Doctor"("hospital_id");
CREATE INDEX "Doctor_isActive_idx"            ON "Doctor"("isActive");

ALTER TABLE "Doctor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Doctor"
  FOR ALL
  USING (hospital_id = current_setting('app.hospital_id', true));

-- Backfill: carry over every hospital's existing free-text doctor names
-- (DropdownOption fieldName='doctorName') as a starting Doctor roster, so no
-- name already in day-to-day use vanishes from suggestions the moment this
-- ships. Only the name is known from that source — every other field starts
-- blank/null for an admin to fill in later via the new Settings → Doctors tab.
-- "system" is used as createdBy since these rows have no single human author;
-- ON CONFLICT guards against re-running this migration or a name collision
-- with a hospital's DropdownOption duplicate.
INSERT INTO "Doctor" ("id", "name", "isActive", "createdBy", "createdAt", "updatedAt", "hospital_id")
SELECT
  gen_random_uuid()::text,
  d."value",
  TRUE,
  'system',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  d."hospital_id"
FROM "DropdownOption" d
WHERE d."fieldName" = 'doctorName'
ON CONFLICT ("hospital_id", "name") DO NOTHING;
