-- ============================================================================
-- COMVIDA: Security Fixes Migration
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- 1. ADD RECOVERY CODE COLUMNS
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS recovery_code VARCHAR(6);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS recovery_code_expires TIMESTAMPTZ;

-- 2. ENABLE RLS ON USERS TABLE
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. DROP EXISTING POLICIES IF THEY EXIST (to avoid duplicates)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Users can update records of their patients" ON public.anthropometry_records;

-- 4. CREATE POLICIES FOR USERS TABLE
CREATE POLICY "Users can view their own profile"
  ON public.users FOR SELECT
  USING (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'anon'
  );

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (id::text = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (id::text = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Service role can insert users"
  ON public.users FOR INSERT
  WITH CHECK (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'anon'
  );

CREATE POLICY "Admins can delete users"
  ON public.users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id::text = current_setting('request.jwt.claims', true)::json->>'sub'
      AND u.rol = 'admin'
    )
  );

-- 5. CREATE UPDATE POLICY FOR ANTHROPOMETRY
CREATE POLICY "Users can update records of their patients"
  ON public.anthropometry_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pacientes
      WHERE public.pacientes.id = public.anthropometry_records.patient_id
      AND public.pacientes.usuario_id = auth.uid()
    )
  );

-- 6. CREATE INDEX
CREATE INDEX IF NOT EXISTS idx_users_recovery_code ON public.users(recovery_code) 
  WHERE recovery_code IS NOT NULL;

-- 7. GRANTS
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.anthropometry_records TO authenticated;
GRANT SELECT, INSERT ON public.users TO anon;
GRANT SELECT, UPDATE ON public.invitation_codes TO anon;
