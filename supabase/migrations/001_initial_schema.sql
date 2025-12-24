-- =============================================
-- GRAFIKI SAAS - Supabase Database Schema
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- =============================================
-- ENUMS (with IF NOT EXISTS workaround)
-- =============================================

DO $$ BEGIN
  CREATE TYPE employee_role AS ENUM ('manager', 'employee');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM ('full_time', 'part_time', 'contract', 'intern');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE shift_type AS ENUM ('regular', 'overtime', 'training', 'on_call');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE absence_type AS ENUM (
    'vacation',
    'sick_leave', 
    'uz',
    'maternity',
    'paternity',
    'unpaid',
    'childcare',
    'bereavement',
    'training',
    'remote',
    'blood_donation',
    'court_summons',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE absence_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'shift_assigned',
    'shift_changed',
    'absence_request',
    'absence_approved',
    'absence_rejected',
    'schedule_published'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TEAMS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team settings JSON structure example:
-- {
--   "timezone": "Europe/Warsaw",
--   "weekStartsOn": 1,
--   "defaultShiftDuration": 480,
--   "minShiftDuration": 240,
--   "maxShiftDuration": 720,
--   "breakDuration": 30,
--   "respectPolishTradingSundays": true,
--   "autoCalculateBreaks": true,
--   "overtimeThresholdDaily": 8,
--   "overtimeThresholdWeekly": 40
-- }

-- =============================================
-- EMPLOYEES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Basic info
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  avatar_url TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  
  -- Employment details
  role employee_role NOT NULL DEFAULT 'employee',
  position VARCHAR(100),
  contract_type contract_type NOT NULL DEFAULT 'full_time',
  contract_hours INTEGER DEFAULT 160, -- Monthly hours
  hourly_rate DECIMAL(10,2),
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  preferences JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(team_id, email)
);

-- Employee preferences JSON structure:
-- {
--   "preferredShiftTypes": ["regular"],
--   "unavailableDays": [0, 6],
--   "preferredStartTime": "08:00",
--   "preferredEndTime": "16:00",
--   "maxHoursPerWeek": 40,
--   "minHoursPerWeek": 20,
--   "canWorkWeekends": true,
--   "canWorkNights": false
-- }

-- =============================================
-- SHIFT TEMPLATES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INTEGER DEFAULT 30,
  color VARCHAR(7) DEFAULT '#3b82f6',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SHIFTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  template_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
  
  -- Shift timing
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INTEGER DEFAULT 30,
  
  -- Details
  type shift_type NOT NULL DEFAULT 'regular',
  position VARCHAR(100),
  notes TEXT,
  color VARCHAR(7),
  
  -- Flags
  is_overtime BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for faster queries
CREATE INDEX idx_shifts_team_date ON shifts(team_id, date);
CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, date);

-- =============================================
-- ABSENCES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Absence details
  type absence_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Request info
  status absence_status DEFAULT 'pending',
  reason TEXT,
  document_url TEXT,
  
  -- Approval
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_absences_team_dates ON absences(team_id, start_date, end_date);
CREATE INDEX idx_absences_employee ON absences(employee_id, start_date);
CREATE INDEX idx_absences_status ON absences(status);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- =============================================
-- SCHEDULE GENERATION LOGS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS schedule_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  config JSONB NOT NULL,
  
  -- Results
  shifts_created INTEGER DEFAULT 0,
  warnings JSONB DEFAULT '[]'::jsonb,
  statistics JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_generations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - TEAMS
-- =============================================

CREATE POLICY "Users can view their own teams"
  ON teams FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own teams"
  ON teams FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own teams"
  ON teams FOR DELETE
  USING (owner_id = auth.uid());

-- =============================================
-- RLS POLICIES - EMPLOYEES
-- =============================================

-- Helper function to check team membership
CREATE OR REPLACE FUNCTION is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teams WHERE id = team_uuid AND owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM employees WHERE team_id = team_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Team members can view employees"
  ON employees FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Team owners can manage employees"
  ON employees FOR ALL
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- =============================================
-- RLS POLICIES - SHIFT TEMPLATES
-- =============================================

CREATE POLICY "Team members can view templates"
  ON shift_templates FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Team owners can manage templates"
  ON shift_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- =============================================
-- RLS POLICIES - SHIFTS
-- =============================================

CREATE POLICY "Team members can view shifts"
  ON shifts FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Team owners can manage shifts"
  ON shifts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- =============================================
-- RLS POLICIES - ABSENCES
-- =============================================

CREATE POLICY "Team members can view absences"
  ON absences FOR SELECT
  USING (is_team_member(team_id));

CREATE POLICY "Employees can create their own absences"
  ON absences FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM employees WHERE id = employee_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Team owners can manage all absences"
  ON absences FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Team owners can delete absences"
  ON absences FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- =============================================
-- RLS POLICIES - NOTIFICATIONS
-- =============================================

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================
-- RLS POLICIES - SCHEDULE GENERATIONS
-- =============================================

CREATE POLICY "Team owners can view generation logs"
  ON schedule_generations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

CREATE POLICY "Team owners can create generation logs"
  ON schedule_generations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND owner_id = auth.uid())
  );

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_absences_updated_at
  BEFORE UPDATE ON absences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for employee schedule summary
CREATE OR REPLACE VIEW employee_schedule_summary AS
SELECT 
  e.id as employee_id,
  e.team_id,
  e.first_name,
  e.last_name,
  DATE_TRUNC('week', s.date) as week_start,
  COUNT(s.id) as shift_count,
  SUM(
    EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600 - (s.break_duration / 60.0)
  ) as total_hours,
  SUM(CASE WHEN s.is_overtime THEN 1 ELSE 0 END) as overtime_shifts
FROM employees e
LEFT JOIN shifts s ON e.id = s.employee_id
GROUP BY e.id, e.team_id, e.first_name, e.last_name, DATE_TRUNC('week', s.date);

-- View for absence statistics
CREATE OR REPLACE VIEW absence_statistics AS
SELECT 
  e.id as employee_id,
  e.team_id,
  e.first_name,
  e.last_name,
  a.type,
  EXTRACT(YEAR FROM a.start_date) as year,
  COUNT(*) as absence_count,
  SUM(a.end_date - a.start_date + 1) as total_days
FROM employees e
LEFT JOIN absences a ON e.id = a.employee_id AND a.status = 'approved'
GROUP BY e.id, e.team_id, e.first_name, e.last_name, a.type, EXTRACT(YEAR FROM a.start_date);

-- =============================================
-- SAMPLE DATA (Optional - for testing)
-- =============================================

-- Uncomment below to insert sample data after running migrations

/*
-- Insert sample team (replace with actual user UUID after auth)
INSERT INTO teams (name, description, owner_id, settings)
VALUES (
  'Sklep Example',
  'Zespół sklepu detalicznego',
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user UUID
  '{
    "timezone": "Europe/Warsaw",
    "weekStartsOn": 1,
    "respectPolishTradingSundays": true,
    "autoCalculateBreaks": true
  }'::jsonb
);

-- Insert sample shift templates
INSERT INTO shift_templates (team_id, name, start_time, end_time, break_duration, color, is_default)
SELECT 
  id,
  unnest(ARRAY['Rano', 'Popołudnie', 'Cały dzień']),
  unnest(ARRAY['06:00', '14:00', '08:00']::time[]),
  unnest(ARRAY['14:00', '22:00', '16:00']::time[]),
  30,
  unnest(ARRAY['#22c55e', '#f59e0b', '#3b82f6']),
  true
FROM teams LIMIT 1;
*/
