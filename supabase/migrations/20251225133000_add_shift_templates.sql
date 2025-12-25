-- Shift Templates table
CREATE TABLE IF NOT EXISTS shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_shift_templates_org_id ON shift_templates(organization_id);

-- RLS
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

-- Policies using existing helper function
CREATE POLICY "Members can view shift templates" ON shift_templates
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can create shift templates" ON shift_templates
  FOR INSERT WITH CHECK (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can update shift templates" ON shift_templates
  FOR UPDATE USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Members can delete shift templates" ON shift_templates
  FOR DELETE USING (is_org_member(organization_id, auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_shift_templates_updated_at
  BEFORE UPDATE ON shift_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
