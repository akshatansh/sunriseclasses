-- Add allow_review column to online_tests
ALTER TABLE public.online_tests ADD COLUMN IF NOT EXISTS allow_review BOOLEAN DEFAULT false;

-- Add answers column to online_test_attempts to store student responses
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.online_tests.allow_review IS 'True if students are allowed to review their answers after test completion';
COMMENT ON COLUMN public.online_test_attempts.answers IS 'JSON object storing question IDs and chosen options';
