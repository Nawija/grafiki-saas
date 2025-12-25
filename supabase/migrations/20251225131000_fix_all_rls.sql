-- Fix all RLS policies using helper functions

-- Drop existing problematic policies for employees
DROP POLICY IF EXISTS "Members can view employees" ON employees;
DROP POLICY IF EXISTS "Members can create employees" ON employees;
DROP POLICY IF EXISTS "Members can update employees" ON employees;
DROP POLICY IF EXISTS "Members can delete employees" ON employees;

-- Drop existing problematic policies for schedules
DROP POLICY IF EXISTS "Members can view schedules" ON schedules;
DROP POLICY IF EXISTS "Members can create schedules" ON schedules;
DROP POLICY IF EXISTS "Members can update schedules" ON schedules;

-- Drop existing problematic policies for shifts
DROP POLICY IF EXISTS "Members can view shifts" ON shifts;
DROP POLICY IF EXISTS "Members can create shifts" ON shifts;
DROP POLICY IF EXISTS "Members can update shifts" ON shifts;
DROP POLICY IF EXISTS "Members can delete shifts" ON shifts;

-- New policies for employees
CREATE POLICY "Members can view employees" ON employees
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can create employees" ON employees
  FOR INSERT WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can update employees" ON employees
  FOR UPDATE USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can delete employees" ON employees
  FOR DELETE USING (is_org_member(organization_id, auth.uid()));

-- New policies for schedules
CREATE POLICY "Members can view schedules" ON schedules
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can create schedules" ON schedules
  FOR INSERT WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can update schedules" ON schedules
  FOR UPDATE USING (is_org_member(organization_id, auth.uid()));

-- Helper function to check schedule membership
CREATE OR REPLACE FUNCTION is_schedule_member(sched_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id FROM schedules WHERE id = sched_id;
  RETURN is_org_member(org_id, uid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New policies for shifts
CREATE POLICY "Members can view shifts" ON shifts
  FOR SELECT USING (is_schedule_member(schedule_id, auth.uid()));

CREATE POLICY "Members can create shifts" ON shifts
  FOR INSERT WITH CHECK (is_schedule_member(schedule_id, auth.uid()));

CREATE POLICY "Members can update shifts" ON shifts
  FOR UPDATE USING (is_schedule_member(schedule_id, auth.uid()));

CREATE POLICY "Members can delete shifts" ON shifts
  FOR DELETE USING (is_schedule_member(schedule_id, auth.uid()));
