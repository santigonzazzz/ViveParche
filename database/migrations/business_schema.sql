-- Business Dashboard Schema Extensions
-- Run this migration to add business-specific tables

-- =====================================================
-- SUBSCRIPTIONS & PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    price DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'COP',
    features JSONB NOT NULL DEFAULT '{}',
    limits JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_type ON subscriptions(plan_type);

-- =====================================================
-- ANALYTICS CACHE (for performance)
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    period TEXT NOT NULL,
    data JSONB NOT NULL,
    computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_analytics_cache_user_metric ON analytics_cache(user_id, metric_type, period);
CREATE INDEX idx_analytics_cache_expires ON analytics_cache(expires_at);

-- =====================================================
-- AI MARKETING CAMPAIGNS
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    message_template TEXT NOT NULL,
    target_audience TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    metrics JSONB DEFAULT '{"emails_sent": 0, "whatsapp_sent": 0, "notifications_sent": 0, "engagement_rate": 0}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_campaigns_user_id ON ai_campaigns(user_id);
CREATE INDEX idx_ai_campaigns_status ON ai_campaigns(status);
CREATE INDEX idx_ai_campaigns_event_id ON ai_campaigns(event_id);

-- =====================================================
-- CHAT MESSAGES
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'ai', 'staff')),
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_store ON chat_messages(store_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);

-- =====================================================
-- CHAT CONVERSATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL DEFAULT 'lead' CHECK (category IN ('lead', 'past_guest', 'active')),
    last_message TEXT,
    unread_count INTEGER DEFAULT 0,
    sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_conversations_store ON chat_conversations(store_id);
CREATE INDEX idx_chat_conversations_customer ON chat_conversations(customer_id);
CREATE INDEX idx_chat_conversations_category ON chat_conversations(category);
CREATE INDEX idx_chat_conversations_updated ON chat_conversations(updated_at DESC);

-- =====================================================
-- TEAM INVITATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('staff', 'manager')),
    code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_invitations_store ON team_invitations(store_id);
CREATE INDEX idx_team_invitations_code ON team_invitations(code);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);

-- =====================================================
-- NOTIFICATION PREFERENCES
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    new_messages BOOLEAN DEFAULT TRUE,
    bookings BOOLEAN DEFAULT TRUE,
    daily_summary BOOLEAN DEFAULT TRUE,
    ai_suggestions BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    web_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);

-- =====================================================
-- AUDIT LOGS (for security)
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =====================================================
-- AI CONFIGURATION
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    tone TEXT NOT NULL DEFAULT 'professional' CHECK (tone IN ('professional', 'vibey', 'energetic')),
    custom_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_configurations_user ON ai_configurations(user_id);

-- =====================================================
-- UPDATE EXISTING TABLES
-- =====================================================

-- Add role column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'owner', 'staff', 'manager'));

-- Add subscription-related columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_logo TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS store_address TEXT;

-- Add metadata and stats to events for enhanced tracking
ALTER TABLE events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS manual_tickets_sold INTEGER DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_configurations_updated_at BEFORE UPDATE ON ai_configurations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_campaigns_updated_at BEFORE UPDATE ON ai_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id)
SELECT id FROM profiles
WHERE role IN ('owner', 'manager', 'staff')
ON CONFLICT (user_id) DO NOTHING;

-- Insert default AI configurations for existing business users
INSERT INTO ai_configurations (user_id, tone)
SELECT id, 'professional' FROM profiles
WHERE role = 'owner'
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE subscriptions IS 'Store subscription plans and billing';
COMMENT ON TABLE analytics_cache IS 'Cached analytics for performance optimization';
COMMENT ON TABLE ai_campaigns IS 'AI-generated marketing campaigns and suggestions';
COMMENT ON TABLE chat_messages IS 'Individual chat messages between customers and stores';
COMMENT ON TABLE chat_conversations IS 'Chat conversation threads';
COMMENT ON TABLE team_invitations IS 'Invitations for team members to join stores';
COMMENT ON TABLE notification_preferences IS 'User notification settings';
COMMENT ON TABLE audit_logs IS 'Security audit trail for sensitive operations';
COMMENT ON TABLE ai_configurations IS 'AI chatbot configuration per store';
