-- Create attendance_records table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure a student has only one attendance record per day
    UNIQUE(student_id, date)
);

-- Enable RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users on attendance_records"
    ON public.attendance_records FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for all users on attendance_records"
    ON public.attendance_records FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Enable update for all users on attendance_records"
    ON public.attendance_records FOR UPDATE
    USING (true);

CREATE POLICY "Enable delete for all users on attendance_records"
    ON public.attendance_records FOR DELETE
    USING (true);
