-- Migration: Add employee_preferences table
-- Stores employee work preferences (preferred days, hours, unavailability)

-- Create employee_preferences table
CREATE TABLE IF NOT EXISTS employee_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Preferowane dni tygodnia (0=niedziela, 1=poniedziałek, ..., 6=sobota)
    preferred_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    
    -- Dni, w które pracownik NIE może pracować
    unavailable_days INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    
    -- Preferowane godziny pracy
    preferred_start_time TIME DEFAULT NULL,
    preferred_end_time TIME DEFAULT NULL,
    
    -- Maksymalna liczba godzin dziennie
    max_hours_per_day INTEGER DEFAULT NULL,
    
    -- Maksymalna liczba godzin tygodniowo
    max_hours_per_week INTEGER DEFAULT NULL,
    
    -- Czy może pracować w weekendy
    can_work_weekends BOOLEAN DEFAULT true,
    
    -- Czy może pracować w święta
    can_work_holidays BOOLEAN DEFAULT true,
    
    -- Dodatkowe notatki
    notes TEXT DEFAULT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(employee_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_employee_preferences_employee_id ON employee_preferences(employee_id);

-- Enable RLS
ALTER TABLE employee_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies - use employee's organization membership check
CREATE POLICY "employee_preferences_select_policy" ON employee_preferences
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = employee_preferences.employee_id
            AND is_org_member(e.organization_id, auth.uid())
        )
    );

CREATE POLICY "employee_preferences_insert_policy" ON employee_preferences
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = employee_preferences.employee_id
            AND is_org_member(e.organization_id, auth.uid())
        )
    );

CREATE POLICY "employee_preferences_update_policy" ON employee_preferences
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = employee_preferences.employee_id
            AND is_org_member(e.organization_id, auth.uid())
        )
    );

CREATE POLICY "employee_preferences_delete_policy" ON employee_preferences
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM employees e
            WHERE e.id = employee_preferences.employee_id
            AND is_org_member(e.organization_id, auth.uid())
        )
    );

-- Add comment
COMMENT ON TABLE employee_preferences IS 'Stores employee work preferences like preferred days, hours, and availability';
