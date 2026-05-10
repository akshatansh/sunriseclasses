-- Add tracking for the exact question the student is currently viewing
ALTER TABLE public.online_test_attempts 
ADD COLUMN IF NOT EXISTS current_question_index INTEGER DEFAULT 0;
