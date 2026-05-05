-- Create Study Materials Table
CREATE TABLE IF NOT EXISTS public.sz_study_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    class_name TEXT,
    youtube_link TEXT,
    drive_link TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Doubts Table
CREATE TABLE IF NOT EXISTS public.sz_doubts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    student_email TEXT,
    class_name TEXT,
    subject TEXT,
    doubt_text TEXT NOT NULL,
    video_link TEXT,
    status TEXT DEFAULT 'pending' NOT NULL, -- pending, answered
    answer_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add student_email column if it was missing from an older creation
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sz_doubts' AND column_name='student_email') THEN 
        ALTER TABLE public.sz_doubts ADD COLUMN student_email TEXT; 
    END IF; 
END $$;

-- Create Topic Requests Table
CREATE TABLE IF NOT EXISTS public.sz_topic_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_name TEXT NOT NULL,
    subject TEXT,
    topic_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- pending, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up RLS (Row Level Security)

-- Study Materials
ALTER TABLE public.sz_study_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access to study_materials" ON public.sz_study_materials;
CREATE POLICY "Allow public read access to study_materials" ON public.sz_study_materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin full access to study_materials" ON public.sz_study_materials;
CREATE POLICY "Allow admin full access to study_materials" ON public.sz_study_materials FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

-- Doubts
ALTER TABLE public.sz_doubts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to doubts" ON public.sz_doubts;
CREATE POLICY "Allow public insert to doubts" ON public.sz_doubts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to doubts" ON public.sz_doubts;
CREATE POLICY "Allow public read access to doubts" ON public.sz_doubts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin full access to doubts" ON public.sz_doubts;
CREATE POLICY "Allow admin full access to doubts" ON public.sz_doubts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);

-- Topic Requests
ALTER TABLE public.sz_topic_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to topic_requests" ON public.sz_topic_requests;
CREATE POLICY "Allow public insert to topic_requests" ON public.sz_topic_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read access to topic_requests" ON public.sz_topic_requests;
CREATE POLICY "Allow public read access to topic_requests" ON public.sz_topic_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin full access to topic_requests" ON public.sz_topic_requests;
CREATE POLICY "Allow admin full access to topic_requests" ON public.sz_topic_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
);
