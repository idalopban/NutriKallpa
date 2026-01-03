-- ============================================================================
-- MIGRATION: 025_security_hardening.sql
-- DESCRIPTION: Enforce RLS on 'pacientes' table to prevent unauthorized access.
-- AUTHOR: Antigravity (Security Arch.)
-- DATE: 2026-01-03
-- ============================================================================
-- 1. Enable RLS on the table (Idempotent operation)
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
-- 2. Clean up old policies to avoid conflicts
DROP POLICY IF EXISTS "Nutricionistas ven sus propios pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Nutricionistas crean pacientes para sí mismos" ON public.pacientes;
DROP POLICY IF EXISTS "Nutricionistas gestionan sus propios pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Users can view their own patients" ON public.pacientes;
DROP POLICY IF EXISTS "Users can insert their own patients" ON public.pacientes;
DROP POLICY IF EXISTS "Users can update their own patients" ON public.pacientes;
DROP POLICY IF EXISTS "Users can delete their own patients" ON public.pacientes;
-- 3. SELECT Policy: A user can only view patients where they are the owner
CREATE POLICY "owner_select_pacientes" ON public.pacientes FOR
SELECT USING (auth.uid() = usuario_id);
-- 4. INSERT Policy: A user can only insert patients assigned to themselves
CREATE POLICY "owner_insert_pacientes" ON public.pacientes FOR
INSERT WITH CHECK (auth.uid() = usuario_id);
-- 5. UPDATE Policy: A user can only update their own patients
CREATE POLICY "owner_update_pacientes" ON public.pacientes FOR
UPDATE USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);
-- 6. DELETE Policy: A user can only delete their own patients
CREATE POLICY "owner_delete_pacientes" ON public.pacientes FOR DELETE USING (auth.uid() = usuario_id);