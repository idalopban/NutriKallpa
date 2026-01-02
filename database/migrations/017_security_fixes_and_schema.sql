-- ============================================================================
-- MIGRATION 017: Critical Security Fixes & Schema Corrections
-- NutriKallpa Database - Audit Implementation
-- Date: 2025-12-27
-- ============================================================================
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS MIGRATION!
-- ============================================================================
-- ============================================================================
-- SECTION 1: CRITICAL SECURITY FIXES
-- ============================================================================
-- ----------------------------------------------------------------------------
-- FIX 1.1: Remove anon access to users table
-- VULNERABILITY: Current policy allows anon role to view user profiles
-- RISK: Email addresses, phone numbers, clinic info exposed
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own_secure" ON public.users FOR
SELECT USING (
        id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    );
COMMENT ON POLICY "users_select_own_secure" ON public.users IS 'SECURITY FIX 2025-12-27: Users can ONLY view their own profile. Removed anon access.';
-- ----------------------------------------------------------------------------
-- FIX 1.2: Restrict invitation code management to admins only
-- VULNERABILITY: Any authenticated user could create admin invite codes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can create invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Authenticated users can delete invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Authenticated users can update invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_insert" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_delete" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_update" ON public.invitation_codes;
-- Only admins can create codes
CREATE POLICY "invitation_codes_admin_insert_v2" ON public.invitation_codes FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
                AND rol = 'admin'
        )
    );
-- Only admins can delete codes
CREATE POLICY "invitation_codes_admin_delete_v2" ON public.invitation_codes FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
            AND rol = 'admin'
    )
);
-- Only admins can update codes
CREATE POLICY "invitation_codes_admin_update_v2" ON public.invitation_codes FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
                AND rol = 'admin'
        )
    );
COMMENT ON POLICY "invitation_codes_admin_insert_v2" ON public.invitation_codes IS 'SECURITY FIX 2025-12-27: Only administrators can create invitation codes.';
-- ============================================================================
-- SECTION 2: ADD MISSING COLUMNS TO ANTHROPOMETRY_RECORDS
-- These were in the UI but missing from the database schema
-- ============================================================================
-- Trunk diameters (Kerr 5-Component Model)
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS biacromial NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS biiliocristal NUMERIC(5, 2) DEFAULT NULL;
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS biestiloideo NUMERIC(5, 2) DEFAULT NULL;
-- Head circumference (Kerr 5-Component Model residual mass)
ALTER TABLE public.anthropometry_records
ADD COLUMN IF NOT EXISTS head_circumference NUMERIC(5, 2) DEFAULT NULL;
-- Add documentation
COMMENT ON COLUMN public.anthropometry_records.biacromial IS 'Diámetro biacromial (hombros) en cm. ISAK: 20-60 cm. Kerr 5C bone mass.';
COMMENT ON COLUMN public.anthropometry_records.biiliocristal IS 'Diámetro biiliocristal (caderas) en cm. ISAK: 15-50 cm. Kerr 5C bone/residual.';
COMMENT ON COLUMN public.anthropometry_records.biestiloideo IS 'Diámetro biestiloideo (muñeca) en cm. ISAK: 4-8 cm. Frame size assessment.';
COMMENT ON COLUMN public.anthropometry_records.head_circumference IS 'Perímetro cefálico en cm. Range: 50-65 cm. Kerr 5C residual mass calculation.';
-- ============================================================================
-- SECTION 3: PERFORMANCE INDICES
-- ============================================================================
-- 3.1: Antropometría: Búsqueda por paciente + fecha (historial)
CREATE INDEX IF NOT EXISTS idx_anthropometry_patient_date ON public.anthropometry_records(patient_id, created_at DESC);
-- 3.2: Trunk diameters (partial index for 5C model queries)
CREATE INDEX IF NOT EXISTS idx_anthropometry_trunk_diameters ON public.anthropometry_records(biacromial, biiliocristal)
WHERE biacromial IS NOT NULL
    OR biiliocristal IS NOT NULL;
-- 3.3: Pacientes: Búsqueda por nombre (UI de búsqueda)
CREATE INDEX IF NOT EXISTS idx_pacientes_nombre_apellido ON public.pacientes(nombre, apellido);
-- 3.4: Citas: Agenda del día (excluyendo canceladas)
CREATE INDEX IF NOT EXISTS idx_citas_fecha_hora_active ON public.citas(fecha, hora)
WHERE estado != 'cancelada';
-- 3.5: Dietas: Planes activos del paciente
CREATE INDEX IF NOT EXISTS idx_diet_plans_patient_active ON public.diet_plans(patient_id, created_at DESC)
WHERE status = 'active';
-- ============================================================================
-- SECTION 4: VALIDATION CONSTRAINTS
-- ============================================================================
-- 4.1: Trunk diameters valid ranges
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_biacromial_valid CHECK (
        biacromial IS NULL
        OR (
            biacromial >= 10
            AND biacromial <= 70
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_biiliocristal_valid CHECK (
        biiliocristal IS NULL
        OR (
            biiliocristal >= 10
            AND biiliocristal <= 60
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_head_circumference_valid CHECK (
        head_circumference IS NULL
        OR (
            head_circumference >= 40
            AND head_circumference <= 70
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================================
-- SECTION 5: GRANTS
-- ============================================================================
-- Ensure authenticated users can access the new columns
GRANT SELECT,
    INSERT,
    UPDATE ON public.anthropometry_records TO authenticated;
-- ============================================================================
-- VERIFICATION LOG
-- ============================================================================
DO $$ BEGIN RAISE NOTICE '=============================================';
RAISE NOTICE 'Migration 017 completed successfully!';
RAISE NOTICE '---------------------------------------------';
RAISE NOTICE '✅ Fixed: Anonymous access to users table';
RAISE NOTICE '✅ Fixed: Invitation codes restricted to admins';
RAISE NOTICE '✅ Added: biacromial, biiliocristal, biestiloideo columns';
RAISE NOTICE '✅ Added: head_circumference column';
RAISE NOTICE '✅ Created: 5 performance indices';
RAISE NOTICE '✅ Added: Validation constraints';
RAISE NOTICE '=============================================';
END $$;