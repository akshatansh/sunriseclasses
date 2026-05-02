-- Add opening_balance column to students table
-- This stores any pre-existing dues from before the system started

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;
