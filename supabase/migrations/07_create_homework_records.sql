-- Create homework_records table
CREATE TABLE IF NOT EXISTS homework_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- e.g., 'May 2026'
  target_pages INTEGER NOT NULL,
  completed_pages INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure a student can only have one homework record per month
ALTER TABLE homework_records ADD CONSTRAINT unique_student_homework_month UNIQUE (student_id, month);

-- Enable RLS
ALTER TABLE homework_records ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for admin portal logic which uses anon key currently)
CREATE POLICY "Allow public read access to homework_records" ON homework_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert to homework_records" ON homework_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to homework_records" ON homework_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to homework_records" ON homework_records FOR DELETE USING (true);
