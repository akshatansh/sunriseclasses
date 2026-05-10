-- Add submission_type column to track how test was submitted
-- 'manual'   = student clicked "Submit" button themselves
-- 'auto_time' = timer ran out (time limit reached)
-- 'auto_cheat' = auto-submitted due to too many cheat/AI warnings
ALTER TABLE public.online_test_attempts 
ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'manual';
