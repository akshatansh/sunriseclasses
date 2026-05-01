-- Add father_name to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name TEXT;
