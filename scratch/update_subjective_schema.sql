-- 1. Subjective & Math Questions Support
ALTER TABLE public.online_test_questions ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'mcq';
ALTER TABLE public.online_test_questions ADD COLUMN IF NOT EXISTS math_latex TEXT;

-- 2. Subjective Test Attempts & Evaluation Support
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS subjective_answers JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS evaluation_status TEXT DEFAULT 'auto_graded';
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS teacher_remarks TEXT;
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS evaluated_by TEXT;
ALTER TABLE public.online_test_attempts ADD COLUMN IF NOT EXISTS room_scan_urls JSONB DEFAULT '[]'::jsonb;

-- 3. Live 360 Scan Requests Table for Admin On-Demand Triggers
CREATE TABLE IF NOT EXISTS public.room_scan_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    test_id UUID REFERENCES public.online_tests(id) ON DELETE CASCADE,
    requested_by TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.room_scan_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read room_scan_requests" ON public.room_scan_requests;
DROP POLICY IF EXISTS "Public Write room_scan_requests" ON public.room_scan_requests;
CREATE POLICY "Public Read room_scan_requests" ON public.room_scan_requests FOR SELECT USING (true);
CREATE POLICY "Public Write room_scan_requests" ON public.room_scan_requests FOR ALL USING (true);
