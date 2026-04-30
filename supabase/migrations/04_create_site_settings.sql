-- Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to settings
CREATE POLICY "Allow public read access to site_settings" ON site_settings FOR SELECT USING (true);

-- Allow public update to settings (we will restrict this via UI role checks, similar to other tables)
CREATE POLICY "Allow public update to site_settings" ON site_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert to site_settings" ON site_settings FOR INSERT WITH CHECK (true);

-- Insert default notification text
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('notification_text', '⭐ 10th Batch is starting on 3 May 2026. Book Your Seat Now!')
ON CONFLICT (setting_key) DO NOTHING;
