-- ============================================================================
-- NUTRIKALLPA: User Account Status Migration
-- Migration: 011_user_account_status.sql
-- Description: Adds is_active field to users table for account activation control
-- ============================================================================
-- =============================================================================
-- 1. ADD IS_ACTIVE COLUMN TO USERS TABLE
-- =============================================================================
-- Add column for account activation status (default: active)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
-- Comment for documentation
COMMENT ON COLUMN users.is_active IS 'Account activation status. FALSE prevents login. Controlled by administrators.';
-- =============================================================================
-- 2. CREATE INDEX FOR PERFORMANCE
-- =============================================================================
-- Index for efficiently querying active/inactive users
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
-- =============================================================================
-- 3. SET EXISTING USERS TO ACTIVE
-- =============================================================================
-- Ensure all existing users are active (no impact if column didn't exist before)
UPDATE users
SET is_active = TRUE
WHERE is_active IS NULL;