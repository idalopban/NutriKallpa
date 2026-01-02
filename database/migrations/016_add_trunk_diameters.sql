-- =============================================================
-- MIGRATION: Add Trunk Diameters for Kerr 5-Component Model
-- File: 016_add_trunk_diameters.sql
-- Date: 2024-12-27
-- Description: Adds biacromial and biiliocristal diameters to 
--              improve bone mass and residual mass calculations
-- =============================================================
-- Add biacromial diameter column (shoulder width)
ALTER TABLE public.medidas_antropometricas
ADD COLUMN IF NOT EXISTS biacromial DECIMAL(5, 2) DEFAULT NULL;
-- Add biiliocristal diameter column (hip width)
ALTER TABLE public.medidas_antropometricas
ADD COLUMN IF NOT EXISTS biiliocristal DECIMAL(5, 2) DEFAULT NULL;
-- Add comments for documentation
COMMENT ON COLUMN public.medidas_antropometricas.biacromial IS 'Diámetro biacromial (hombros) en cm. Rango ISAK: 20-60 cm. Usado en modelo Kerr para masa ósea.';
COMMENT ON COLUMN public.medidas_antropometricas.biiliocristal IS 'Diámetro biiliocristal/bicrestal (caderas) en cm. Rango ISAK: 15-50 cm. Usado en modelo Kerr para masa ósea y residual.';
-- Create index for performance on common queries
CREATE INDEX IF NOT EXISTS idx_medidas_trunk_diameters ON public.medidas_antropometricas (biacromial, biiliocristal)
WHERE biacromial IS NOT NULL
    OR biiliocristal IS NOT NULL;
-- Grant permissions
GRANT SELECT,
    INSERT,
    UPDATE ON public.medidas_antropometricas TO authenticated;
GRANT SELECT,
    INSERT,
    UPDATE ON public.medidas_antropometricas TO anon;
-- Log migration
DO $$ BEGIN RAISE NOTICE 'Migration 016_add_trunk_diameters completed successfully';
END $$;