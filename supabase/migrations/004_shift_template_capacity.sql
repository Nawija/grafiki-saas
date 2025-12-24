-- Migration: Add capacity field to shift_templates
-- Description: Allows multiple employees per shift slot (e.g., 2-3 people per shift)

ALTER TABLE shift_templates 
ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 1;

-- Add check constraint to ensure capacity is at least 1
ALTER TABLE shift_templates 
ADD CONSTRAINT shift_templates_capacity_check CHECK (capacity >= 1);

-- Comment for documentation
COMMENT ON COLUMN shift_templates.capacity IS 'Liczba osób mogących pracować na tej zmianie (domyślnie 1)';
