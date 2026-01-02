-- ============================================================================
-- MIGRATION 018: Fix Head Circumference Constraint for Pediatric Use
-- NutriKallpa Database
-- Date: 2025-12-31
-- ============================================================================
-- ISSUE: Migration 017 created head_circumference constraint with range 40-70 cm
-- which is valid for adults but NOT for infants (newborns: ~33-37 cm)
-- WHO Reference: Newborn HC ~35 cm, range 25-60 cm for 0-5 years
-- ============================================================================
-- Drop existing constraint
ALTER TABLE public.anthropometry_records DROP CONSTRAINT IF EXISTS check_head_circumference_valid;
-- Recreate with corrected range (WHO 0-5 years reference)
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_head_circumference_valid CHECK (
        head_circumference IS NULL
        OR (
            head_circumference >= 25
            AND head_circumference <= 65
        )
    );
-- Update documentation
COMMENT ON COLUMN public.anthropometry_records.head_circumference IS 'Perímetro cefálico en cm. Range: 25-65 cm (WHO 0-5 years reference). Used for Kerr 5C residual mass and pediatric growth assessment.';
-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$ BEGIN RAISE NOTICE 'Migration 018 completed: head_circumference constraint updated to 25-65 cm range.';
END $$;