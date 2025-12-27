-- Add color column to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';
