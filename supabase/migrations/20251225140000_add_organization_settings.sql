-- Migration: Add organization_settings table
-- Run this in Supabase SQL Editor

-- Create organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
    trading_sundays_mode TEXT NOT NULL DEFAULT 'none' CHECK (trading_sundays_mode IN ('all', 'none', 'custom')),
    custom_trading_sundays TEXT[] DEFAULT NULL,
    default_shift_duration INTEGER NOT NULL DEFAULT 8,
    default_break_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies using existing helper functions
CREATE POLICY "organization_settings_select_policy" ON organization_settings
    FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "organization_settings_insert_policy" ON organization_settings
    FOR INSERT WITH CHECK (is_org_owner(organization_id, auth.uid()));

CREATE POLICY "organization_settings_update_policy" ON organization_settings
    FOR UPDATE USING (is_org_owner(organization_id, auth.uid()));

CREATE POLICY "organization_settings_delete_policy" ON organization_settings
    FOR DELETE USING (is_org_owner(organization_id, auth.uid()));

-- Add comment
COMMENT ON TABLE organization_settings IS 'Stores organization-specific settings like trading Sundays, default shift duration, etc.';
