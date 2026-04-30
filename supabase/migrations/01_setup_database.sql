-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_results table
CREATE TABLE IF NOT EXISTS test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  test_date DATE NOT NULL,
  marks_obtained NUMERIC NOT NULL,
  total_marks NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security) and create open policies for demonstration
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public insert to students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to students" ON students FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to students" ON students FOR DELETE USING (true);

CREATE POLICY "Allow public read access to test_results" ON test_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert to test_results" ON test_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to test_results" ON test_results FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to test_results" ON test_results FOR DELETE USING (true);

-- Create storage bucket for student photos
INSERT INTO storage.buckets (id, name, public) VALUES ('student-photos', 'student-photos', true) ON CONFLICT DO NOTHING;

-- Allow public access to the bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'student-photos');
CREATE POLICY "Public Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'student-photos');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'student-photos');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'student-photos');
