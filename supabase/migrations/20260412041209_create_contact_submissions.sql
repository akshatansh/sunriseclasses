/*
  # Contact Form Submissions Table

  1. New Tables
    - `contact_submissions`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `phone` (text, required)
      - `email` (text)
      - `course` (text)
      - `message` (text, required)
      - `created_at` (timestamp)
      - `status` (text, default 'new')

  2. Security
    - Enable RLS on table
    - Allow public INSERT for form submissions
    - Allow authenticated SELECT/UPDATE for admin viewing
*/

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  course text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'new'
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact form"
  ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);
