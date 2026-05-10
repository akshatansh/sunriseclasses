-- Fix DELETE policy for online_test_attempts
DROP POLICY IF EXISTS "Allow public delete to online_test_attempts" ON public.online_test_attempts;
CREATE POLICY "Allow public delete to online_test_attempts" ON public.online_test_attempts FOR DELETE USING (true);

-- Fix DELETE policy for proctoring_logs (if it exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'proctoring_logs') THEN 
        -- Ensure proctoring logs can be deleted by public admin requests
        EXECUTE 'DROP POLICY IF EXISTS "Allow public delete to proctoring_logs" ON public.proctoring_logs';
        EXECUTE 'CREATE POLICY "Allow public delete to proctoring_logs" ON public.proctoring_logs FOR DELETE USING (true)';
    END IF; 
END $$;
