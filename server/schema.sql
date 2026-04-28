-- ============================================
-- Ai Webinar SaaS — PostgreSQL Database Schema
-- Brand: The Solo Shop
-- ============================================

-- Bật extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USERS — Quản lý người dùng
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'sub_admin', -- 'super_admin', 'sub_admin', 'member'
    avatar_url TEXT DEFAULT 'https://storage.googleapis.com/msgsndr/ZvTjUqBlrPvdA6D95vnu/media/68b45aa9ee3c10815523bcd0.jpeg',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. SUB_ACCOUNTS — Multi-tenant workspace
-- ============================================
CREATE TABLE IF NOT EXISTS sub_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    domain_prefix VARCHAR(100) UNIQUE,
    plan VARCHAR(50) DEFAULT 'pro', -- 'free', 'pro', 'enterprise'
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'deleted'
    settings_json JSONB DEFAULT '{}',
    max_webinars INTEGER DEFAULT 100,
    max_attendees INTEGER DEFAULT 10000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. USER_SUB_ACCOUNTS — Quan hệ user-tenant
-- ============================================
CREATE TABLE IF NOT EXISTS user_sub_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin', -- 'admin', 'member', 'viewer'
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, sub_account_id)
);

-- ============================================
-- 4. WEBINARS — Quản lý webinar
-- ============================================
CREATE TABLE IF NOT EXISTS webinars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    room_code VARCHAR(20) UNIQUE NOT NULL,
    display_threshold INTEGER DEFAULT 0,
    video_type VARCHAR(50) DEFAULT 'mp4', -- 'mp4', 'youtube', 'vimeo'
    video_url TEXT,
    thumbnail_url TEXT,
    schedule_type VARCHAR(50) DEFAULT 'on_demand', -- 'on_demand', 'recurring', 'jit'
    rrule TEXT, -- RRULE string cho recurring
    jit_window INTEGER DEFAULT 15, -- phút
    jit_rounding INTEGER DEFAULT 5, -- phút
    timezone VARCHAR(100) DEFAULT 'Asia/Ho_Chi_Minh',
    duration_seconds INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    cta_enabled BOOLEAN DEFAULT false,
    cta_text VARCHAR(255),
    cta_url TEXT,
    cta_time_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webinars_sub_account ON webinars(sub_account_id);
CREATE INDEX idx_webinars_room_code ON webinars(room_code);
CREATE INDEX idx_webinars_status ON webinars(status);

-- ============================================
-- 5. ATTENDEES — Người tham gia webinar
-- ============================================
CREATE TABLE IF NOT EXISTS attendees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    ghl_contact_id VARCHAR(255),
    ghl_sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    status VARCHAR(50) DEFAULT 'registered', -- 'registered', 'joined', 'watching', 'completed', 'dropped'
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    source VARCHAR(100) DEFAULT 'direct',
    utm_source VARCHAR(255),
    utm_medium VARCHAR(255),
    utm_campaign VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendees_sub_account ON attendees(sub_account_id);
CREATE INDEX idx_attendees_webinar ON attendees(webinar_id);
CREATE INDEX idx_attendees_email ON attendees(email);

-- ============================================
-- 6. WEBINAR_SESSIONS — Phiên xem webinar
-- ============================================
CREATE TABLE IF NOT EXISTS webinar_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    watch_duration_seconds INTEGER DEFAULT 0,
    join_latency_ms INTEGER DEFAULT 0,
    return_count INTEGER DEFAULT 0,
    device_type VARCHAR(50), -- 'desktop', 'tablet', 'mobile'
    browser VARCHAR(100),
    os VARCHAR(100),
    country VARCHAR(100),
    city VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' -- 'active', 'completed', 'dropped'
);

CREATE INDEX idx_sessions_sub_account ON webinar_sessions(sub_account_id);
CREATE INDEX idx_sessions_webinar ON webinar_sessions(webinar_id);
CREATE INDEX idx_sessions_attendee ON webinar_sessions(attendee_id);

-- ============================================
-- 7. CHAT_MESSAGES — Script chat giả lập
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    time_offset_ms INTEGER NOT NULL DEFAULT 0,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'viewer', -- 'viewer', 'admin'
    color VARCHAR(7) DEFAULT '#6366f1',
    is_pinned BOOLEAN DEFAULT false,
    pin_duration_seconds INTEGER DEFAULT 0,
    scope VARCHAR(50) DEFAULT 'broadcast', -- 'broadcast', 'self'
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_webinar ON chat_messages(webinar_id);
CREATE INDEX idx_chat_time ON chat_messages(time_offset_ms);

-- ============================================
-- 8. SEEDING_NOTIFICATIONS — Thông báo giả lập
-- ============================================
CREATE TABLE IF NOT EXISTS seeding_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    time_offset_ms INTEGER NOT NULL DEFAULT 0,
    customer_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seeding_webinar ON seeding_notifications(webinar_id);

-- ============================================
-- 9. ANALYTICS_EVENTS — Tracking sự kiện
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    attendee_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
    session_id UUID REFERENCES webinar_sessions(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_payload JSONB DEFAULT '{}',
    video_time_seconds REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_sub_account ON analytics_events(sub_account_id);
CREATE INDEX idx_analytics_webinar ON analytics_events(webinar_id);
CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);

-- ============================================
-- 10. INTEGRATIONS — Tích hợp bên thứ 3
-- ============================================
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- 'gohighlevel', 'smtp', 'zapier'
    config_encrypted TEXT,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sub_account_id, provider)
);

-- ============================================
-- 11. CTA_EVENTS — Theo dõi CTA clicks
-- ============================================
CREATE TABLE IF NOT EXISTS cta_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sub_account_id UUID NOT NULL REFERENCES sub_accounts(id) ON DELETE CASCADE,
    webinar_id UUID NOT NULL REFERENCES webinars(id) ON DELETE CASCADE,
    attendee_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
    session_id UUID REFERENCES webinar_sessions(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'viewed', 'clicked'
    video_time_seconds REAL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cta_webinar ON cta_events(webinar_id);

-- ============================================
-- 12. PRODUCTS — Sản phẩm/gói dịch vụ SaaS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'subscription', -- 'subscription', 'one_time', 'free'
    price DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'VND',
    access_model VARCHAR(50) DEFAULT 'subscription',
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. ORDERS — Đơn hàng
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    total_amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'VND',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled', 'refunded'
    payment_code VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. PAYMENTS — Thanh toán
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) DEFAULT 0,
    payment_code VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    raw_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. ENTITLEMENTS — Quyền truy cập
-- ============================================
CREATE TABLE IF NOT EXISTS entitlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE SET NULL,
    access_type VARCHAR(50) DEFAULT 'full',
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 16. AFFILIATE_ACCOUNTS — Hệ thống affiliate
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(50) UNIQUE NOT NULL,
    commission_rate DECIMAL(5,2) DEFAULT 20.00,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. AFFILIATE_CLICKS — Tracking clicks
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES affiliate_accounts(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 18. AFFILIATE_CONVERSIONS — Hoa hồng
-- ============================================
CREATE TABLE IF NOT EXISTS affiliate_conversions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES affiliate_accounts(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    commission DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'paid'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 19. REVENUE_EVENTS — Tracking doanh thu
-- ============================================
CREATE TABLE IF NOT EXISTS revenue_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'VND',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 20. FUNNEL_EVENTS — Tracking funnel
-- ============================================
CREATE TABLE IF NOT EXISTS funnel_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    attendee_id UUID REFERENCES attendees(id) ON DELETE SET NULL,
    webinar_id UUID REFERENCES webinars(id) ON DELETE SET NULL,
    sub_account_id UUID REFERENCES sub_accounts(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_funnel_event_name ON funnel_events(event_name);
CREATE INDEX idx_funnel_created ON funnel_events(created_at);

-- ============================================
-- 21. PERMISSIONS TABLE — Quản lý quyền
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 22. ROLE_PERMISSIONS — Gắn quyền với role
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role VARCHAR(50) NOT NULL,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- ============================================
-- SEED DATA — Dữ liệu khởi tạo
-- ============================================

-- Tạo các quyền mặc định
INSERT INTO permissions (name, description, category) VALUES
    ('can_view_dashboard', 'Xem dashboard tổng quan', 'dashboard'),
    ('can_manage_webinars', 'Tạo/sửa/xóa webinar', 'webinars'),
    ('can_view_attendees', 'Xem danh sách người tham gia', 'attendees'),
    ('can_manage_attendees', 'Quản lý người tham gia', 'attendees'),
    ('can_view_analytics', 'Xem báo cáo analytics', 'analytics'),
    ('can_manage_settings', 'Quản lý cài đặt', 'settings'),
    ('can_manage_integrations', 'Quản lý tích hợp', 'integrations'),
    ('can_manage_team', 'Quản lý thành viên team', 'team'),
    ('can_manage_sub_accounts', 'Quản lý sub-accounts (Super Admin)', 'admin'),
    ('can_view_all_data', 'Xem toàn bộ dữ liệu (Super Admin)', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Gắn quyền cho role super_admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- Gắn quyền cho role sub_admin (trừ quyền admin)
INSERT INTO role_permissions (role, permission_id)
SELECT 'sub_admin', id FROM permissions WHERE category != 'admin'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Tạo sản phẩm mặc định
INSERT INTO products (name, description, type, price, currency, access_model, features) VALUES
    ('Starter', 'Gói cơ bản cho người mới bắt đầu', 'free', 0, 'VND', 'free', '["3 webinars", "100 attendees/tháng", "Chat cơ bản"]'),
    ('Pro', 'Gói chuyên nghiệp cho doanh nghiệp', 'subscription', 990000, 'VND', 'subscription', '["Unlimited webinars", "10,000 attendees/tháng", "Chat + Seeding", "Analytics nâng cao", "GHL Integration"]'),
    ('Enterprise', 'Gói doanh nghiệp lớn', 'subscription', 2990000, 'VND', 'subscription', '["Everything in Pro", "Unlimited attendees", "White-label", "API access", "Priority support"]')
ON CONFLICT DO NOTHING;
