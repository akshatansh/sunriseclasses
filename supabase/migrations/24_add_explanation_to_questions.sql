-- Add explanation column to online_test_questions
ALTER TABLE public.online_test_questions 
ADD COLUMN IF NOT EXISTS explanation TEXT;
