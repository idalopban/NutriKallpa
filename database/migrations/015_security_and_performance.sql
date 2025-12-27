-- ============================================================================
-- MIGRATION 015: Security Fixes & Performance Optimizations
-- NutriKallpa Database Audit Implementation
-- Date: 2025-12-27
-- ============================================================================
-- BACKUP YOUR DATABASE BEFORE RUNNING THIS MIGRATION!
-- Test in development environment first!
-- ============================================================================
-- ============================================================================
-- SECTION 1: CRITICAL SECURITY FIXES
-- ============================================================================
-- ----------------------------------------------------------------------------
-- FIX 1.1: Remove anon access to users table
-- ----------------------------------------------------------------------------
-- VULNERABILITY: Current policy allows anon role to view user profiles
-- RISK: Email addresses, phone numbers, clinic info exposed to unauthenticated users
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "users_select_own" ON public.users FOR
SELECT USING (
        id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    );
COMMENT ON POLICY "users_select_own" ON public.users IS 'SECURITY FIX: Users can only view their own profile. Removed anon access.';
-- ----------------------------------------------------------------------------
-- FIX 1.2: Restrict invitation code management to admins only
-- ----------------------------------------------------------------------------
--VULNERABILITY: Any authenticated user can create/delete invitation codes
-- RISK: Regular users can create unlimited admin codes or launch DoS attacks
DROP POLICY IF EXISTS "Authenticated users can create invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Authenticated users can delete invitation codes" ON public.invitation_codes;
-- Only admins can create codes
CREATE POLICY "invitation_codes_admin_insert" ON public.invitation_codes FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
                AND rol = 'admin'
        )
    );
-- Only admins can delete codes
CREATE POLICY "invitation_codes_admin_delete" ON public.invitation_codes FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
            AND rol = 'admin'
    )
);
-- Only admins can update codes (prevent marking active codes as used)
CREATE POLICY "invitation_codes_admin_update" ON public.invitation_codes FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE id::text = current_setting('request.jwt.claims', true)::json->>'sub'
                AND rol = 'admin'
        )
    );
COMMENT ON POLICY "invitation_codes_admin_insert" ON public.invitation_codes IS 'SECURITY FIX: Only administrators can create invitation codes.';
COMMENT ON POLICY "invitation_codes_admin_delete" ON public.invitation_codes IS 'SECURITY FIX: Only administrators can delete invitation codes.';
-- ----------------------------------------------------------------------------
-- FIX 1.3: Fix pediatric measurements policy (consistent with other tables)
-- ----------------------------------------------------------------------------
-- ISSUE: Current policy uses ambiguous admin check with wrong table reference
DROP POLICY IF EXISTS "pediatric_measurements_user_policy" ON public.pediatric_measurements;
-- Use consistent pattern: JOIN with pacientes table
CREATE POLICY "pediatric_select_own" ON public.pediatric_measurements FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = pediatric_measurements.patient_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "pediatric_insert_own" ON public.pediatric_measurements FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = pediatric_measurements.patient_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "pediatric_update_own" ON public.pediatric_measurements FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = pediatric_measurements.patient_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = pediatric_measurements.patient_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "pediatric_delete_own" ON public.pediatric_measurements FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.pacientes
        WHERE pacientes.id = pediatric_measurements.patient_id
            AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    )
);
-- ----------------------------------------------------------------------------
-- FIX 1.4: Split granular CRUD policies for patient_streaks
-- ----------------------------------------------------------------------------
-- ISSUE: Current "FOR ALL" policy is less granular, harder to audit
DROP POLICY IF EXISTS "Nutritionists can manage their patients' streaks" ON public.patient_streaks;
DROP POLICY IF EXISTS "Nutritionists can view their patients' streaks" ON public.patient_streaks;
CREATE POLICY "streaks_select_own" ON public.patient_streaks FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_streaks.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "streaks_insert_own" ON public.patient_streaks FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_streaks.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "streaks_update_own" ON public.patient_streaks FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_streaks.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_streaks.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "streaks_delete_own" ON public.patient_streaks FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.pacientes
        WHERE pacientes.id = patient_streaks.paciente_id
            AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    )
);
-- ----------------------------------------------------------------------------
-- FIX 1.5: Split granular CRUD policies for patient_achievements
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Nutritionists can manage their patients' achievements" ON public.patient_achievements;
DROP POLICY IF EXISTS "Nutritionists can view their patients' achievements" ON public.patient_achievements;
CREATE POLICY "achievements_select_own" ON public.patient_achievements FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_achievements.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "achievements_insert_own" ON public.patient_achievements FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_achievements.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "achievements_update_own" ON public.patient_achievements FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_achievements.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = patient_achievements.paciente_id
                AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
        )
    );
CREATE POLICY "achievements_delete_own" ON public.patient_achievements FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.pacientes
        WHERE pacientes.id = patient_achievements.paciente_id
            AND pacientes.usuario_id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    )
);
-- ============================================================================
-- SECTION 2: PERFORMANCE OPTIMIZATIONS - INDEXES
-- ============================================================================
-- ----------------------------------------------------------------------------
-- INDEX 2.1: Gamification - Speed up streak expiration checks
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_patient_streaks_activity_date ON public.patient_streaks(last_activity_date)
WHERE current_streak > 0;
COMMENT ON INDEX idx_patient_streaks_activity_date IS 'Optimizes queries for checking expired streaks (only active streaks)';
-- ----------------------------------------------------------------------------
-- INDEX 2.2: Diet Plans - Filter by active status
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_diet_plans_status ON public.diet_plans(status)
WHERE status = 'active';
COMMENT ON INDEX idx_diet_plans_status IS 'Partial index for active diet plans only (reduces index size)';
-- ----------------------------------------------------------------------------
-- INDEX 2.3: Appointments - User + Date range queries (agenda view)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_citas_user_fecha ON public.citas(user_id, fecha DESC)
WHERE estado != 'cancelada';
COMMENT ON INDEX idx_citas_user_fecha IS 'Optimizes agenda view (excludes cancelled appointments from index)';
-- ----------------------------------------------------------------------------
-- INDEX 2.4: Anthropometry - Evaluator lookups (multi-nutritionist clinics)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_anthropometry_evaluator ON public.anthropometry_records(evaluator_id)
WHERE evaluator_id IS NOT NULL;
COMMENT ON INDEX idx_anthropometry_evaluator IS 'Enables fast filtering by evaluator in multi-nutritionist clinics';
-- ----------------------------------------------------------------------------
-- INDEX 2.5: Users - Subscription expiration (for cron jobs)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_subscription_active_expires ON public.users(subscription_expires_at)
WHERE subscription_status IN ('active', 'trial');
COMMENT ON INDEX idx_users_subscription_active_expires IS 'Optimizes subscription expiration checks (only active/trial users)';
-- ============================================================================
-- SECTION 3: DATA TYPE PRECISION - NUMERIC COLUMNS
-- ============================================================================
-- ----------------------------------------------------------------------------
-- 3.1: Basic Anthropometry Measurements
-- ----------------------------------------------------------------------------
DO $$ BEGIN -- Weight and Height
ALTER TABLE public.anthropometry_records
ALTER COLUMN weight TYPE NUMERIC(6, 2);
-- Max 9999.99 kg
ALTER TABLE public.anthropometry_records
ALTER COLUMN height TYPE NUMERIC(5, 2);
-- Max 999.99 cm
-- Skinfolds (mm) - precision to 0.01mm
ALTER TABLE public.anthropometry_records
ALTER COLUMN triceps TYPE NUMERIC(5, 2),
    ALTER COLUMN subscapular TYPE NUMERIC(5, 2),
    ALTER COLUMN biceps TYPE NUMERIC(5, 2),
    ALTER COLUMN iliac_crest TYPE NUMERIC(5, 2),
    ALTER COLUMN supraspinale TYPE NUMERIC(5, 2),
    ALTER COLUMN abdominal TYPE NUMERIC(5, 2),
    ALTER COLUMN thigh TYPE NUMERIC(5, 2),
    ALTER COLUMN calf TYPE NUMERIC(5, 2);
-- Girths (cm)
ALTER TABLE public.anthropometry_records
ALTER COLUMN arm_relaxed TYPE NUMERIC(5, 2),
    ALTER COLUMN arm_flexed TYPE NUMERIC(5, 2),
    ALTER COLUMN waist TYPE NUMERIC(5, 2),
    ALTER COLUMN hip TYPE NUMERIC(5, 2),
    ALTER COLUMN thigh_mid TYPE NUMERIC(5, 2),
    ALTER COLUMN calf_max TYPE NUMERIC(5, 2);
-- Breadths (cm)
ALTER TABLE public.anthropometry_records
ALTER COLUMN humerus TYPE NUMERIC(5, 2),
    ALTER COLUMN femur TYPE NUMERIC(5, 2);
-- Results
ALTER TABLE public.anthropometry_records
ALTER COLUMN body_fat_percent TYPE NUMERIC(5, 2),
    ALTER COLUMN muscle_mass_kg TYPE NUMERIC(6, 2),
    ALTER COLUMN somatotype_endo TYPE NUMERIC(4, 2),
    ALTER COLUMN somatotype_meso TYPE NUMERIC(4, 2),
    ALTER COLUMN somatotype_ecto TYPE NUMERIC(4, 2);
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'Warning: Some columns may not exist or already have precision set';
END $$;
-- ============================================================================
-- SECTION 4: VALIDATION - CHECK CONSTRAINTS
-- ============================================================================
-- ----------------------------------------------------------------------------
-- 4.1: Body Fat Percentage (0-100%)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_body_fat_valid CHECK (
        body_fat_percent IS NULL
        OR (
            body_fat_percent >= 0
            AND body_fat_percent <= 100
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ----------------------------------------------------------------------------
-- 4.2: Somatotype Components (0-12 range per Heath-Carter standard)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_somatotype_endo_valid CHECK (
        somatotype_endo IS NULL
        OR (
            somatotype_endo >= 0
            AND somatotype_endo <= 12
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_somatotype_meso_valid CHECK (
        somatotype_meso IS NULL
        OR (
            somatotype_meso >= 0
            AND somatotype_meso <= 12
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_somatotype_ecto_valid CHECK (
        somatotype_ecto IS NULL
        OR (
            somatotype_ecto >= 0
            AND somatotype_ecto <= 12
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ----------------------------------------------------------------------------
-- 4.3: Weight and Height Ranges (sanity checks)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_weight_valid CHECK (
        weight > 0
        AND weight < 500
    );
-- 0-500 kg reasonable range
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_height_valid CHECK (
        height > 0
        AND height < 300
    );
-- 0-300 cm reasonable range
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ----------------------------------------------------------------------------
-- 4.4: Muscle Mass Validation (cannot exceed total weight)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
ALTER TABLE public.anthropometry_records
ADD CONSTRAINT check_muscle_mass_valid CHECK (
        muscle_mass_kg IS NULL
        OR (
            muscle_mass_kg >= 0
            AND muscle_mass_kg <= weight
        )
    );
EXCEPTION
WHEN duplicate_object THEN NULL;
END $$;
-- ============================================================================
-- VERIFICATION QUERIES (Run separately to validate)
-- ============================================================================
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE tablename IN ('users', 'invitation_codes', 'patient_streaks')
-- ORDER BY tablename, cmd;