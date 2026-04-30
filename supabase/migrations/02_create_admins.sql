CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the default super admin
INSERT INTO admins (username, password, role) VALUES ('superadmin', 'sunrise@super', 'superadmin') ON CONFLICT (username) DO NOTHING;

-- Enable RLS and public read/write for simple login
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to admins" ON admins FOR SELECT USING (true);
CREATE POLICY "Allow public insert to admins" ON admins FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete to admins" ON admins FOR DELETE USING (true);
