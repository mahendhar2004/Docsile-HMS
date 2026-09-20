-- Add height (cm) and weight (kg) vitals to Prescription
ALTER TABLE "Prescription"
  ADD COLUMN IF NOT EXISTS "heightCm" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "weightKg" DOUBLE PRECISION;

-- Force PostgREST to refresh its schema cache so Supabase clients see the new columns
NOTIFY pgrst, 'reload schema';
