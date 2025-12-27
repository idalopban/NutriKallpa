-- ============================================================================
-- COMVIDA: Database Schema for Secure Authentication
-- Run this SQL in your PostgreSQL database
-- ============================================================================
-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) DEFAULT 'usuario',
  especialidad VARCHAR(255),
  cmp VARCHAR(50),
  telefono VARCHAR(50),
  bio TEXT,
  photo_url TEXT,
  clinic_name VARCHAR(255),
  clinic_address TEXT,
  clinic_phone VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 2. Create invitation_codes table
CREATE TABLE IF NOT EXISTS invitation_codes (
  code VARCHAR(50) PRIMARY KEY,
  rol VARCHAR(50) DEFAULT 'usuario',
  status VARCHAR(20) DEFAULT 'active',
  used_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_status ON invitation_codes(status);
-- ============================================================================
-- DEFAULT ADMIN USER (for initial setup)
-- ============================================================================
-- Email: admin@nutrikallpa.com
-- Password: NutriKallpa2024!
-- ============================================================================
INSERT INTO users (
    email,
    password_hash,
    nombre,
    rol,
    especialidad,
    cmp
  )
VALUES (
    'admin@nutrikallpa.com',
    '$2b$10$9OGISMILIfDak3cyfZXJWObAcasVgr7X64CJrkSEEsk9Qcx22Au4aa',
    'Administrador NutriKallpa',
    'admin',
    'Gestión del Sistema',
    '00000'
  ) ON CONFLICT (email) DO
UPDATE
SET password_hash = EXCLUDED.password_hash,
  updated_at = NOW();
-- ============================================================================
-- SAMPLE INVITATION CODES (for testing)
-- ============================================================================
INSERT INTO invitation_codes (code, rol, status)
VALUES ('ADMIN-2024', 'admin', 'active'),
  ('USER-2024', 'usuario', 'active') ON CONFLICT (code) DO NOTHING;