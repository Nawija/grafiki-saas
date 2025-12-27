-- Migration: Add store hours and staffing settings
-- Adds opening/closing hours and minimum staff per shift

-- Add new columns to organization_settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS store_open_time TIME DEFAULT '06:00',
ADD COLUMN IF NOT EXISTS store_close_time TIME DEFAULT '22:00',
ADD COLUMN IF NOT EXISTS min_employees_per_shift INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS enable_trading_sundays BOOLEAN DEFAULT true;

-- Add comments
COMMENT ON COLUMN organization_settings.store_open_time IS 'Store/salon opening time';
COMMENT ON COLUMN organization_settings.store_close_time IS 'Store/salon closing time';
COMMENT ON COLUMN organization_settings.min_employees_per_shift IS 'Minimum number of employees per shift';
COMMENT ON COLUMN organization_settings.enable_trading_sundays IS 'Whether to enable trading Sundays feature';
