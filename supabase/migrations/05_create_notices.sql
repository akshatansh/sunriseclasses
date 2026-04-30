-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- 'exam', 'holiday', 'general'
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Allow public read access to notices
CREATE POLICY "Allow public read access to notices" ON notices FOR SELECT USING (true);

-- Allow public update to notices (restricted via UI role checks)
CREATE POLICY "Allow public update to notices" ON notices FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to notices" ON notices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete to notices" ON notices FOR DELETE USING (true);

-- Insert a welcome notice
INSERT INTO notices (title, content, type, date) 
VALUES ('Welcome to Sunrise Classes', 'Admissions for Class 9 and 10 are now open. Enroll today to secure your future!', 'general', CURRENT_DATE);
