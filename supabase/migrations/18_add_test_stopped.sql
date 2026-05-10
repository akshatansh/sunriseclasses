-- Add is_stopped column to online_tests
-- is_active=true  → Live (students can take)
-- is_active=false, is_stopped=false → Hidden (not visible)
-- is_active=false, is_stopped=true  → Stopped (visible but can't start; shows Completed/Pending)
ALTER TABLE public.online_tests
ADD COLUMN IF NOT EXISTS is_stopped BOOLEAN DEFAULT false;
