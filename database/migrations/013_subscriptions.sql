-- ============================================================================
-- Migration 013: Subscriptions Table
-- Stores user subscription information for tier-based access control
-- ============================================================================
-- Create subscription tiers enum
DO $$ BEGIN CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'professional', 'enterprise');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- Create subscription status enum
DO $$ BEGIN CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'expired', 'paused');
EXCEPTION
WHEN duplicate_object THEN null;
END $$;
-- =============================================================================
-- SUBSCRIPTIONS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- Subscription details
    tier subscription_tier DEFAULT 'free' NOT NULL,
    status subscription_status DEFAULT 'active' NOT NULL,
    -- Billing dates
    starts_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    -- Payment info (optional, for reference)
    payment_provider TEXT,
    -- 'stripe', 'paypal', 'mercadopago', etc.
    external_subscription_id TEXT,
    -- ID from payment provider
    -- Trial info
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    is_trial BOOLEAN DEFAULT false,
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- Ensure one active subscription per user
    CONSTRAINT unique_active_subscription UNIQUE (user_id)
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
-- =============================================================================
-- RLS POLICIES
-- =============================================================================
-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR
SELECT USING (auth.uid() = user_id);
-- Only service role can insert/update (done via server actions)
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions FOR ALL USING (auth.jwt()->>'role' = 'service_role');
-- Authenticated users can insert their own (for initial free tier)
CREATE POLICY "Users can create own subscription" ON public.subscriptions FOR
INSERT WITH CHECK (auth.uid() = user_id);
-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================
-- Function to get current subscription for a user
CREATE OR REPLACE FUNCTION get_user_subscription(p_user_id UUID) RETURNS TABLE (
        tier subscription_tier,
        status subscription_status,
        expires_at TIMESTAMP WITH TIME ZONE,
        days_remaining INTEGER,
        is_active BOOLEAN
    ) AS $$ BEGIN RETURN QUERY
SELECT s.tier,
    s.status,
    s.expires_at,
    CASE
        WHEN s.expires_at IS NULL THEN NULL
        ELSE EXTRACT(
            DAY
            FROM (s.expires_at - NOW())
        )::INTEGER
    END as days_remaining,
    CASE
        WHEN s.status != 'active' THEN false
        WHEN s.expires_at IS NULL THEN true
        WHEN s.expires_at > NOW() THEN true
        ELSE false
    END as is_active
FROM public.subscriptions s
WHERE s.user_id = p_user_id
LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to create free subscription for new users
CREATE OR REPLACE FUNCTION create_free_subscription() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.subscriptions (user_id, tier, status, expires_at)
VALUES (NEW.id, 'free', 'active', NULL) ON CONFLICT (user_id) DO NOTHING;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Trigger to auto-create free subscription on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
AFTER
INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_free_subscription();
-- =============================================================================
-- UPDATE TRIGGER
-- =============================================================================
DROP TRIGGER IF EXISTS set_updated_at_subscriptions ON public.subscriptions;
CREATE TRIGGER set_updated_at_subscriptions BEFORE
UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
-- =============================================================================
-- SAMPLE DATA (for testing - remove in production)
-- =============================================================================
-- Uncomment to insert test data:
-- INSERT INTO public.subscriptions (user_id, tier, status, expires_at)
-- VALUES 
--   ('your-user-uuid', 'professional', 'active', NOW() + INTERVAL '30 days');