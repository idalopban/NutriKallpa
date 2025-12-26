-- ============================================================================
-- Migration 014: Clean RLS Policies
-- Drops all existing policies and recreates them with secure, consistent rules
-- ============================================================================
-- =============================================================================
-- 1. PACIENTES - Owner: usuario_id (the nutritionist who created the patient)
-- =============================================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own patients" ON public.pacientes;
DROP POLICY IF EXISTS "Users can insert their own patients" ON public.pacientes;
DROP POLICY IF EXISTS "Users can update their own patients" ON public.pacientes;
DROP POLICY IF EXISTS "Users can delete their own patients" ON public.pacientes;
-- Create new secure policies
CREATE POLICY "pacientes_select_own" ON public.pacientes FOR
SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "pacientes_insert_own" ON public.pacientes FOR
INSERT WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "pacientes_update_own" ON public.pacientes FOR
UPDATE USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
CREATE POLICY "pacientes_delete_own" ON public.pacientes FOR DELETE USING (auth.uid() = usuario_id);
-- =============================================================================
-- 2. ANTHROPOMETRY_RECORDS - Owner: via patient's usuario_id (JOIN)
-- =============================================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view records of their patients" ON public.anthropometry_records;
DROP POLICY IF EXISTS "Users can insert records for their patients" ON public.anthropometry_records;
DROP POLICY IF EXISTS "Users can delete records of their patients" ON public.anthropometry_records;
DROP POLICY IF EXISTS "Users can update records of their patients" ON public.anthropometry_records;
-- Create new secure policies (via JOIN with pacientes)
CREATE POLICY "anthropometry_select_own" ON public.anthropometry_records FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = anthropometry_records.patient_id
                AND pacientes.usuario_id = auth.uid()
        )
    );
CREATE POLICY "anthropometry_insert_own" ON public.anthropometry_records FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = anthropometry_records.patient_id
                AND pacientes.usuario_id = auth.uid()
        )
    );
CREATE POLICY "anthropometry_update_own" ON public.anthropometry_records FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = anthropometry_records.patient_id
                AND pacientes.usuario_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.pacientes
            WHERE pacientes.id = anthropometry_records.patient_id
                AND pacientes.usuario_id = auth.uid()
        )
    );
CREATE POLICY "anthropometry_delete_own" ON public.anthropometry_records FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.pacientes
        WHERE pacientes.id = anthropometry_records.patient_id
            AND pacientes.usuario_id = auth.uid()
    )
);
-- =============================================================================
-- 3. CITAS - Owner: user_id (the nutritionist)
-- =============================================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.citas;
DROP POLICY IF EXISTS "Users can insert their own appointments" ON public.citas;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.citas;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.citas;
-- Create new secure policies
CREATE POLICY "citas_select_own" ON public.citas FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "citas_insert_own" ON public.citas FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "citas_update_own" ON public.citas FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "citas_delete_own" ON public.citas FOR DELETE USING (auth.uid() = user_id);
-- =============================================================================
-- 4. USER_PROFILES - Owner: id (matches auth.uid())
-- =============================================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
-- Create new secure policies
CREATE POLICY "profiles_select_own" ON public.user_profiles FOR
SELECT USING (auth.uid() = id);
-- Allow any authenticated user to create their own profile (for registration)
CREATE POLICY "profiles_insert_own" ON public.user_profiles FOR
INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.user_profiles FOR
UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
-- Note: No DELETE policy - users shouldn't delete their own profiles
-- (account deletion should be handled by Supabase Auth cascade)
-- =============================================================================
-- 5. DIET_PLANS - Owner: user_id (the nutritionist)
-- =============================================================================
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own diet plans" ON public.diet_plans;
DROP POLICY IF EXISTS "Users can insert their own diet plans" ON public.diet_plans;
DROP POLICY IF EXISTS "Users can update their own diet plans" ON public.diet_plans;
DROP POLICY IF EXISTS "Users can delete their own diet plans" ON public.diet_plans;
-- Create new secure policies
CREATE POLICY "diet_plans_select_own" ON public.diet_plans FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "diet_plans_insert_own" ON public.diet_plans FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diet_plans_update_own" ON public.diet_plans FOR
UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diet_plans_delete_own" ON public.diet_plans FOR DELETE USING (auth.uid() = user_id);
-- =============================================================================
-- 6. SUBSCRIPTIONS - Owner: user_id
-- =============================================================================
-- Drop existing policies (in case they conflict)
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
-- Recreate policies
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR
SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- Note: UPDATE is restricted - only service role or admin should update subscriptions
-- This prevents users from modifying their own subscription tier/expiration
-- =============================================================================
-- VERIFICATION: List all policies (run separately to check)
-- =============================================================================
-- SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;