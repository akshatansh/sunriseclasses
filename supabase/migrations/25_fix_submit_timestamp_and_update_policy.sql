-- Fix: Update submitted_at when student submits the test
-- Previously submitted_at was only set at INSERT (when test started), not on completion

-- Ensure UPDATE policy is correct (WITH CHECK as well as USING)
DROP POLICY IF EXISTS "Allow public update to online_test_attempts" ON public.online_test_attempts;
CREATE POLICY "Allow public update to online_test_attempts" 
  ON public.online_test_attempts 
  FOR UPDATE 
  USING (true) 
  WITH CHECK (true);

-- Add submitted_at auto-update trigger so it reflects actual submission time
CREATE OR REPLACE FUNCTION public.update_submitted_at_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When is_completed changes from false to true, record the actual submission time
  IF NEW.is_completed = true AND (OLD.is_completed = false OR OLD.is_completed IS NULL) THEN
    NEW.submitted_at = timezone('utc'::text, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_submitted_at ON public.online_test_attempts;
CREATE TRIGGER trigger_update_submitted_at
  BEFORE UPDATE ON public.online_test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_submitted_at_on_complete();
