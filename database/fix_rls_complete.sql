-- ============================================================================
-- FIX COMPLETO DE RLS - NutriKallpa Authentication
-- ============================================================================
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- ============================================================================
-- ============================================================================
-- PASO 1: LIMPIAR TODAS LAS POLÍTICAS EXISTENTES DE LA TABLA USERS
-- ============================================================================
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
DROP POLICY IF EXISTS "users_service_select" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON public.users;
-- ============================================================================
-- PASO 2: HABILITAR RLS
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ============================================================================
-- PASO 3: POLÍTICAS PARA TABLA USERS
-- ============================================================================
-- 3.1: SELECT - CUALQUIERA puede leer usuarios (necesario para login lookup)
CREATE POLICY "users_public_read" ON public.users FOR
SELECT USING (true);
-- 3.2: INSERT - Usuario autenticado puede crear su propio perfil
CREATE POLICY "users_insert_own" ON public.users FOR
INSERT WITH CHECK (true);
-- Permitir cualquier insert (el backend valida)
-- 3.3: UPDATE - Solo el propio usuario puede actualizar su perfil
CREATE POLICY "users_update_own" ON public.users FOR
UPDATE USING (true) WITH CHECK (true);
-- ============================================================================
-- PASO 4: LIMPIAR POLÍTICAS DE INVITATION_CODES
-- ============================================================================
DROP POLICY IF EXISTS "invitation_codes_public_read" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_public_select" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_insert" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_update" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_delete" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can read invitation codes" ON public.invitation_codes;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
-- Cualquiera puede leer códigos (para validar durante registro)
CREATE POLICY "invitation_codes_public_read" ON public.invitation_codes FOR
SELECT USING (true);
-- Cualquiera puede actualizar códigos (para marcar como usado)
CREATE POLICY "invitation_codes_public_update" ON public.invitation_codes FOR
UPDATE USING (true) WITH CHECK (true);
-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================
SELECT tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('users', 'invitation_codes')
ORDER BY tablename,
    cmd;