-- ===========================================
-- MIGRATION: Organizations & Multi-tenant
-- ===========================================

-- Organization subscription tiers
DO $$ BEGIN
    CREATE TYPE organization_tier AS ENUM ('free', 'pro', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Organization member roles
DO $$ BEGIN
    CREATE TYPE organization_role AS ENUM ('owner', 'admin', 'manager', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===========================================
-- ORGANIZATIONS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{
        "timezone": "Europe/Warsaw",
        "default_currency": "PLN",
        "week_start": "monday",
        "language": "pl"
    }'::jsonb,
    subscription_tier organization_tier DEFAULT 'free',
    -- Free tier limits
    max_teams INTEGER DEFAULT 1,
    max_employees_per_team INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = true;

-- ===========================================
-- ORGANIZATION MEMBERS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role organization_role DEFAULT 'viewer',
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_org ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);

-- ===========================================
-- ORGANIZATION INVITES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS organization_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role organization_role DEFAULT 'viewer',
    token VARCHAR(64) UNIQUE NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);

-- ===========================================
-- UPDATE TEAMS TABLE
-- ===========================================

ALTER TABLE teams ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);

-- ===========================================
-- UPDATE EMPLOYEES TABLE
-- ===========================================

-- Make email optional (if it exists and is NOT NULL)
DO $$ 
BEGIN
    ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Add hours_per_week column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS hours_per_week INTEGER DEFAULT 40;

-- Add notification preferences
ALTER TABLE employees ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "receive_email": false,
    "schedule_published": true,
    "shift_changes": true,
    "reminders": false
}'::jsonb;

-- ===========================================
-- PUBLISHED SCHEDULES TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS published_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ DEFAULT NOW(),
    notification_sent BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_published_schedules_team ON published_schedules(team_id);
CREATE INDEX IF NOT EXISTS idx_published_schedules_dates ON published_schedules(start_date, end_date);

-- ===========================================
-- UPDATE SHIFTS TABLE
-- ===========================================

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ===========================================
-- RLS POLICIES
-- ===========================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE published_schedules ENABLE ROW LEVEL SECURITY;

-- Helper: check organization membership
CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper: check organization admin
CREATE OR REPLACE FUNCTION is_organization_admin(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Organizations
CREATE POLICY "org_select" ON organizations FOR SELECT USING (is_organization_member(id));
CREATE POLICY "org_update" ON organizations FOR UPDATE USING (is_organization_admin(id));
CREATE POLICY "org_insert" ON organizations FOR INSERT WITH CHECK (true);

-- Policy: Organization members
CREATE POLICY "org_members_select" ON organization_members FOR SELECT USING (is_organization_member(organization_id));
CREATE POLICY "org_members_all" ON organization_members FOR ALL USING (is_organization_admin(organization_id));
CREATE POLICY "org_members_insert_self" ON organization_members FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policy: Organization invites
CREATE POLICY "org_invites_all" ON organization_invites FOR ALL USING (is_organization_admin(organization_id));

-- Policy: Published schedules
CREATE POLICY "published_schedules_select" ON published_schedules FOR SELECT USING (is_team_member(team_id));
CREATE POLICY "published_schedules_all" ON published_schedules FOR ALL USING (is_team_member(team_id));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
