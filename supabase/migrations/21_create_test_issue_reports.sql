CREATE TABLE IF NOT EXISTS public.test_issue_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    issue_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.test_issue_reports ENABLE ROW LEVEL SECURITY;

-- Policies

-- Allow students (public) to insert their own reports
CREATE POLICY "Enable insert for public"
ON public.test_issue_reports
FOR INSERT
TO public
WITH CHECK (true);

-- Allow admins (authenticated) to view all reports
CREATE POLICY "Enable read access for authenticated users"
ON public.test_issue_reports
FOR SELECT
TO authenticated
USING (true);

-- Allow admins (authenticated) to delete reports
CREATE POLICY "Enable delete access for authenticated users"
ON public.test_issue_reports
FOR DELETE
TO authenticated
USING (true);
