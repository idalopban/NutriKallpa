-- ============================================================================
-- FIX RLS POLICIES - NutriKallpa Authentication Recovery
-- ============================================================================
-- PROBLEMA: RLS activado sin políticas = TODO BLOQUEADO
-- SOLUCIÓN: Políticas específicas para cada operación
-- 
-- EJECUTAR EN: Supabase Dashboard > SQL Editor
-- ============================================================================
-- ============================================================================
-- PASO 1: TABLA `users` (Perfiles de Nutricionistas)
-- ============================================================================
-- Limpiar políticas existentes (evita conflictos)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role full access" ON public.users;
-- POLÍTICA 1: SELECT - Usuario ve solo su propio perfil
-- Usa auth.uid() que es la función de Supabase para obtener el ID del usuario autenticado
CREATE POLICY "users_select_own" ON public.users FOR
SELECT USING (id = auth.uid());
-- POLÍTICA 2: INSERT - Permitir que el service_role (backend) cree usuarios
-- Tu backend usa SUPABASE_SERVICE_ROLE_KEY, que bypasea RLS automáticamente
-- PERO si usas el anon key para registro, necesitas esta política:
CREATE POLICY "users_insert_authenticated" ON public.users FOR
INSERT WITH CHECK (id = auth.uid());
-- POLÍTICA 3: UPDATE - Usuario solo edita su propio perfil
CREATE POLICY "users_update_own" ON public.users FOR
UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- ============================================================================
-- PASO 2: TABLA `invitation_codes` (Códigos de Invitación)
-- ============================================================================
-- Limpiar políticas existentes
DROP POLICY IF EXISTS "invitation_codes_public_select" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_insert" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_update" ON public.invitation_codes;
DROP POLICY IF EXISTS "invitation_codes_admin_delete" ON public.invitation_codes;
DROP POLICY IF EXISTS "Authenticated users can create invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Authenticated users can delete invitation codes" ON public.invitation_codes;
DROP POLICY IF EXISTS "Anyone can read invitation codes" ON public.invitation_codes;
-- POLÍTICA CRÍTICA: SELECT público para validar códigos durante registro
-- Sin esta política, el registro SIEMPRE fallará porque no puede verificar el código
CREATE POLICY "invitation_codes_public_select" ON public.invitation_codes FOR
SELECT USING (true);
-- Permite a CUALQUIERA (incluyendo anon) leer códigos
-- POLÍTICA: Solo admins pueden crear códigos
CREATE POLICY "invitation_codes_admin_insert" ON public.invitation_codes FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE users.id = auth.uid()
                AND users.rol = 'admin'
        )
    );
-- POLÍTICA: Solo admins pueden actualizar códigos (marcar como usado)
-- NOTA: Tu backend usa service_role que bypasea RLS, así que esto es para seguridad extra
CREATE POLICY "invitation_codes_admin_update" ON public.invitation_codes FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.users
            WHERE users.id = auth.uid()
                AND users.rol = 'admin'
        )
    );
-- POLÍTICA: Solo admins pueden eliminar códigos
CREATE POLICY "invitation_codes_admin_delete" ON public.invitation_codes FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.users
        WHERE users.id = auth.uid()
            AND users.rol = 'admin'
    )
);
-- ============================================================================
-- PASO 3: VERIFICACIÓN (Ejecutar después para confirmar)
-- ============================================================================
-- Ver todas las políticas creadas:
-- SELECT tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('users', 'invitation_codes')
-- ORDER BY tablename, cmd;
-- ============================================================================
-- EXPLICACIÓN DE POR QUÉ FALLABA
-- ============================================================================
-- 
-- 1. RLS ACTIVADO + SIN POLÍTICAS = BLOQUEO TOTAL
--    Cuando haces `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` sin crear
--    políticas, Supabase asume "denegar todo por defecto".
--
-- 2. TU BACKEND USA SERVICE_ROLE_KEY (SUPABASE_SERVICE_ROLE_KEY)
--    Esta clave BYPASEA RLS automáticamente. Por eso el script fix-admin.js
--    funcionó (insertó el código de invitación).
--
-- 3. EL FRONTEND USA ANON_KEY (NEXT_PUBLIC_SUPABASE_ANON_KEY)
--    Esta clave SÍ está sujeta a RLS. Sin políticas para `anon`, 
--    el registro no puede:
--    a) Leer invitation_codes para validar el código
--    b) Insertar en users para crear el perfil
--
-- 4. LA SOLUCIÓN:
--    - invitation_codes: SELECT público (para validar durante registro)
--    - users: INSERT con auth.uid() (solo puedes crear tu propio perfil)
--
-- ============================================================================
-- NOTA IMPORTANTE PARA TU ARQUITECTURA
-- ============================================================================
-- 
-- Tu código en `auth-actions.ts` usa `createPostgrestClient()` que usa
-- POSTGREST_API_KEY. Si este es el SERVICE_ROLE_KEY, entonces RLS se bypasea
-- y estas políticas solo aplican a llamadas desde el frontend con ANON_KEY.
--
-- Si POSTGREST_API_KEY es el ANON_KEY, entonces necesitas asegurar que
-- las operaciones de registro usen el SERVICE_ROLE_KEY.
--
-- RECOMENDACIÓN: Usa `createSupabaseAdmin()` (que usa SERVICE_ROLE_KEY) 
-- para TODAS las operaciones de base de datos en Server Actions.
-- ============================================================================