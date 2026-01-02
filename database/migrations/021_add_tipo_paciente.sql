-- ============================================================================
-- MIGRATION 021: Fix Measurement Persistence
-- Date: 2025-12-31
-- Run this in Supabase SQL Editor
-- ============================================================================
-- 1. Add tipo_paciente column to anthropometry_records
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS tipo_paciente TEXT DEFAULT 'general';
-- 2. Add comment for clarity
COMMENT ON COLUMN public.anthropometry_records.tipo_paciente IS 'Categoría del paciente durante la evaluación (adulto, pediatrico, etc.)';
-- 3. Backfill old pediatric records based on age if possible
UPDATE public.anthropometry_records
SET tipo_paciente = 'pediatrico'
WHERE age < 18
    AND (
        tipo_paciente IS NULL
        OR tipo_paciente = 'general'
    );
-- Done!
SELECT 'Migration 021 completed successfully!' AS status;