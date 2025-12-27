-- Add color column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS color TEXT;
