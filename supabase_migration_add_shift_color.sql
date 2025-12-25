-- Add color column to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT NULL;

-- Optional: Add comment
COMMENT ON COLUMN shifts.color IS 'Hex color code for the shift (e.g., #3b82f6)';
