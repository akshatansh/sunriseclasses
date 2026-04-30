-- Add parent_phone to students table if it doesn't exist
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_phone TEXT;

-- Create fee_payments table
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- e.g., 'May 2026'
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure a student can only have one fee payment record per month
ALTER TABLE fee_payments ADD CONSTRAINT unique_student_month UNIQUE (student_id, month);

-- Enable RLS
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for admin portal logic which uses anon key currently)
CREATE POLICY "Allow public read access to fee_payments" ON fee_payments FOR SELECT USING (true);
CREATE POLICY "Allow public insert to fee_payments" ON fee_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to fee_payments" ON fee_payments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to fee_payments" ON fee_payments FOR DELETE USING (true);
