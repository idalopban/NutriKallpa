-- ============================================================================
-- CONSOLIDATED MIGRATION FIX: NutriKallpa Database Corrections
-- Date: 2025-12-31
-- Run this in Supabase SQL Editor
-- ============================================================================
-- FIX 1: Head Circumference Constraint (infants: 25-65 cm)
ALTER TABLE public.anthropometry_records DROP CONSTRAINT IF EXISTS check_head_circumference_valid;
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_head_circumference_valid CHECK (
        head_circumference IS NULL
        OR (
            head_circumference >= 25
            AND head_circumference <= 65
        )
    );
-- FIX 2: Add sitting_height column (for Cormic Index)
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS sitting_height NUMERIC(5, 2) DEFAULT NULL;
-- FIX 3: Add neck circumference column
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS neck NUMERIC(5, 2) DEFAULT NULL;
-- FIX 4: Ensure all Kerr 5C columns exist
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS biacromial NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS biiliocristal NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS biestiloideo NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS head_circumference NUMERIC(5, 2) DEFAULT NULL;
-- FIX 5: Update constraints with valid ranges
ALTER TABLE public.anthropometry_records DROP CONSTRAINT IF EXISTS check_biacromial_valid;
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_biacromial_valid CHECK (
        biacromial IS NULL
        OR (
            biacromial >= 10
            AND biacromial <= 70
        )
    );
ALTER TABLE public.anthropometry_records DROP CONSTRAINT IF EXISTS check_biiliocristal_valid;
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_biiliocristal_valid CHECK (
        biiliocristal IS NULL
        OR (
            biiliocristal >= 10
            AND biiliocristal <= 60
        )
    );
-- FIX 6: Performance index
CREATE INDEX IF NOT EXISTS idx_anthropometry_head_circ ON public.anthropometry_records(head_circumference)
WHERE head_circumference IS NOT NULL;
-- Done!
SELECT 'Migration completed successfully!' AS status;