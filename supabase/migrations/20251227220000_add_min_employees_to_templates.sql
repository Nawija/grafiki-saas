-- Migration: Add min_employees to shift_templates
-- Each shift template can specify how many employees are needed for that shift

ALTER TABLE shift_templates 
ADD COLUMN IF NOT EXISTS min_employees INTEGER DEFAULT 1 NOT NULL;

-- Add comment
COMMENT ON COLUMN shift_templates.min_employees IS 'Minimum number of employees required for this shift';
