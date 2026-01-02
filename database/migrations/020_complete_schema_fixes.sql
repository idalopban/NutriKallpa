-- ============================================================================
-- MIGRATION 020: Complete Schema Fixes
-- Date: 2025-12-31
-- Run this in Supabase SQL Editor
-- ============================================================================
-- ============================================================================
-- 1. USER_PROFILES: Add subscription fields
-- ============================================================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (
        subscription_status IN ('active', 'expired', 'trial', 'unlimited')
    );
-- ============================================================================
-- 2. INVITATION_CODES: Add subscription duration
-- ============================================================================
ALTER TABLE public.invitation_codes
ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 30;
-- ============================================================================
-- 3. PACIENTES: Add telefono and avatar fields
-- ============================================================================
ALTER TABLE public.pacientes
ADD COLUMN IF NOT EXISTS telefono TEXT DEFAULT NULL;
ALTER TABLE public.pacientes
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;
-- ============================================================================
-- 4. CITAS: Ensure notas column exists
-- ============================================================================
ALTER TABLE public.citas
ADD COLUMN IF NOT EXISTS notas TEXT DEFAULT NULL;
-- ============================================================================
-- Done!
-- ============================================================================
SELECT 'Migration 020 completed successfully!' AS status;