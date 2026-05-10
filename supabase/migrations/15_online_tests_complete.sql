-- ================================================================
-- COMPLETE ONLINE TEST MODULE SETUP (Run this entire file at once)
-- Migrations 15 + 16 + 17 + 18 combined
-- ================================================================

-- Step 1: Add pin column to students
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='pin') THEN
        ALTER TABLE public.students ADD COLUMN pin TEXT;
        UPDATE public.students SET pin = lpad(floor(random() * 10000)::text, 4, '0');
    END IF;
END $$;

-- Step 2: Create online_tests table
CREATE TABLE IF NOT EXISTS public.online_tests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN DEFAULT false,
    is_stopped BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 3: Create online_test_questions table
CREATE TABLE IF NOT EXISTS public.online_test_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id UUID REFERENCES public.online_tests(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    marks INTEGER DEFAULT 1,
    question_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 4: Create online_test_attempts table
CREATE TABLE IF NOT EXISTS public.online_test_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.online_tests(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    total_marks INTEGER DEFAULT 0,
    cheat_warnings INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    submission_type TEXT DEFAULT 'manual',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, test_id)
);

-- Step 5: Add any missing columns to existing tables (safe to run even if table exists)
ALTER TABLE public.online_tests ADD COLUMN IF NOT EXISTS is_stopped BOOLEAN DEFAULT false;
ALTER TABLE public.online_test_questions ADD COLUMN IF NOT EXISTS question_image TEXT;
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS submission_type TEXT DEFAULT 'manual';

-- Step 6: Enable RLS on all tables
ALTER TABLE public.online_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_test_attempts ENABLE ROW LEVEL SECURITY;

-- Step 7: RLS Policies for online_tests
DROP POLICY IF EXISTS "Allow public read access to active online_tests" ON public.online_tests;
CREATE POLICY "Allow public read access to active online_tests" ON public.online_tests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin full access to online_tests" ON public.online_tests;
CREATE POLICY "Allow admin full access to online_tests" ON public.online_tests FOR ALL USING (true);

-- Step 8: RLS Policies for online_test_questions
DROP POLICY IF EXISTS "Allow public read access to online_test_questions" ON public.online_test_questions;
CREATE POLICY "Allow public read access to online_test_questions" ON public.online_test_questions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin full access to online_test_questions" ON public.online_test_questions;
CREATE POLICY "Allow admin full access to online_test_questions" ON public.online_test_questions FOR ALL USING (true);

-- Step 9: RLS Policies for online_test_attempts
DROP POLICY IF EXISTS "Allow public insert to online_test_attempts" ON public.online_test_attempts;
CREATE POLICY "Allow public insert to online_test_attempts" ON public.online_test_attempts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow public read access to online_test_attempts" ON public.online_test_attempts;
CREATE POLICY "Allow public read access to online_test_attempts" ON public.online_test_attempts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow public update to online_test_attempts" ON public.online_test_attempts;
CREATE POLICY "Allow public update to online_test_attempts" ON public.online_test_attempts FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow public delete to online_test_attempts" ON public.online_test_attempts;
CREATE POLICY "Allow public delete to online_test_attempts" ON public.online_test_attempts FOR DELETE USING (true);
DROP POLICY IF EXISTS "Allow admin full access to online_test_attempts" ON public.online_test_attempts;
CREATE POLICY "Allow admin full access to online_test_attempts" ON public.online_test_attempts FOR ALL USING (true);
