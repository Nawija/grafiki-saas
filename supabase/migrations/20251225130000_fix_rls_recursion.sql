-- Fix infinite recursion in RLS policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view organization members" ON organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON organization_members;

-- Create helper function to check membership (avoids recursion)
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = org_id AND user_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to check ownership
CREATE OR REPLACE FUNCTION is_org_owner(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = org_id AND owner_id = uid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- New policies for organization_members using helper functions
CREATE POLICY "Members can view organization members" ON organization_members
  FOR SELECT USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Owners can add members" ON organization_members
  FOR INSERT WITH CHECK (is_org_owner(organization_id, auth.uid()));

CREATE POLICY "Owners can remove members" ON organization_members
  FOR DELETE USING (is_org_owner(organization_id, auth.uid()));

-- Also fix organizations policies that might cause issues
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;

CREATE POLICY "Members can view their organizations" ON organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR is_org_member(id, auth.uid())
  );
