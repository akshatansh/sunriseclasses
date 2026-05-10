-- Add tracking columns for test progress and time taken
ALTER TABLE public.online_test_attempts 
ADD COLUMN IF NOT EXISTS time_taken_seconds INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_question_seen INTEGER DEFAULT NULL;
