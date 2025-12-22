-- ============================================================================
-- NUTRIKALLPA: Subscription System Migration
-- Migration: 008_subscription_system.sql
-- Description: Adds subscription duration to invitation codes and expiration
--              tracking to users for time-based access control.
-- ============================================================================

-- =============================================================================
-- 1. ADD SUBSCRIPTION DURATION TO INVITATION CODES
-- =============================================================================

-- Add column for subscription duration in days (default: 30 days / 1 month)
ALTER TABLE invitation_codes 
ADD COLUMN IF NOT EXISTS subscription_days INTEGER DEFAULT 30;

-- Comment for documentation
COMMENT ON COLUMN invitation_codes.subscription_days IS 
  'Number of days the subscription will be active after the code is used. Common values: 7 (trial), 30 (month), 90 (quarter), 365 (year)';

-- =============================================================================
-- 2. ADD SUBSCRIPTION FIELDS TO USERS TABLE
-- =============================================================================

-- Subscription expiration date
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Subscription status for quick filtering
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active' 
  CHECK (subscription_status IN ('active', 'expired', 'trial', 'unlimited'));

-- Comments for documentation
COMMENT ON COLUMN users.subscription_expires_at IS 
  'Timestamp when the user subscription expires. NULL means unlimited access (legacy users or admins)';

COMMENT ON COLUMN users.subscription_status IS 
  'Current subscription status: active, expired, trial, or unlimited';

-- =============================================================================
-- 3. CREATE INDEX FOR PERFORMANCE
-- =============================================================================

-- Index for efficiently querying expired subscriptions
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires 
  ON users(subscription_expires_at) 
  WHERE subscription_expires_at IS NOT NULL;

-- =============================================================================
-- 4. SET EXISTING USERS TO UNLIMITED (GRANDFATHERING)
-- =============================================================================

-- Existing users before this migration get unlimited access
UPDATE users 
SET subscription_status = 'unlimited' 
WHERE subscription_expires_at IS NULL 
  AND subscription_status = 'active';

-- =============================================================================
-- 5. HELPER FUNCTION: Check if subscription is active
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_subscription_active(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_record RECORD;
BEGIN
    SELECT subscription_expires_at, subscription_status 
    INTO user_record
    FROM users 
    WHERE id = user_id;
    
    -- Unlimited users always have access
    IF user_record.subscription_status = 'unlimited' THEN
        RETURN TRUE;
    END IF;
    
    -- Check if expired
    IF user_record.subscription_expires_at IS NOT NULL 
       AND user_record.subscription_expires_at < NOW() THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_subscription_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscription_active(UUID) TO anon;

-- =============================================================================
-- 6. CRON JOB QUERY (Run daily to auto-update expired statuses)
-- Note: Execute this manually or set up a scheduled function in Supabase
-- =============================================================================

-- UPDATE users 
-- SET subscription_status = 'expired' 
-- WHERE subscription_expires_at < NOW() 
--   AND subscription_status IN ('active', 'trial');
