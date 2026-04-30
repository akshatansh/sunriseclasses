-- Add class_access column to admins table
-- Allowed values: 'all' (default), '9th', '10th'
ALTER TABLE admins ADD COLUMN IF NOT EXISTS class_access TEXT NOT NULL DEFAULT 'all' CHECK (class_access IN ('all', '9th', '10th'));

-- Ensure the superadmin always has all-class access
UPDATE admins SET class_access = 'all' WHERE username = 'superadmin';
