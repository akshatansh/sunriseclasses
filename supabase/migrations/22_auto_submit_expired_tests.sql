-- Step 1: Add started_at column to track when test actually began
ALTER TABLE public.online_test_attempts 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing incomplete attempts to have a started_at 
-- (they are already created so started_at = created_at as approximation)
UPDATE public.online_test_attempts 
SET started_at = created_at 
WHERE started_at IS NULL;

-- Step 2: Create a function to auto-submit expired test attempts
-- This function finds all incomplete attempts where time has expired
-- and submits them with whatever answers were saved (score = 0 since answers not stored server-side)
-- The score will be 0 for abandoned tests - fair, since student left
CREATE OR REPLACE FUNCTION public.auto_submit_expired_tests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_attempt RECORD;
BEGIN
  FOR expired_attempt IN
    SELECT 
      a.id,
      a.student_id,
      a.test_id,
      t.duration_minutes,
      a.started_at,
      a.total_marks
    FROM public.online_test_attempts a
    JOIN public.online_tests t ON t.id = a.test_id
    WHERE 
      a.is_completed = false
      AND a.started_at IS NOT NULL
      AND (a.started_at + (t.duration_minutes * INTERVAL '1 minute')) < NOW()
  LOOP
    -- Calculate total marks for this test
    UPDATE public.online_test_attempts
    SET 
      is_completed = true,
      submission_type = 'auto_time',
      score = 0, -- 0 because we don't store per-answer on server (client-side grading)
      total_marks = (
        SELECT COALESCE(SUM(marks), 0) 
        FROM public.online_test_questions 
        WHERE test_id = expired_attempt.test_id
      ),
      submitted_at = NOW()
    WHERE id = expired_attempt.id;
    
    RAISE NOTICE 'Auto-submitted expired attempt: %', expired_attempt.id;
  END LOOP;
END;
$$;

-- Step 3: Enable pg_cron extension (if not already enabled)
-- Run this separately in Supabase SQL editor if needed:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Step 4: Schedule the function to run every minute
-- Run this in Supabase SQL editor (requires pg_cron extension):
-- SELECT cron.schedule('auto-submit-expired-tests', '* * * * *', 'SELECT public.auto_submit_expired_tests()');

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.auto_submit_expired_tests() TO service_role;
