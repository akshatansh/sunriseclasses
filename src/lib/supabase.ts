import { createClient } from '@supabase/supabase-js';

const NEW_SUPABASE_URL = 'https://ncjwrnibnueeeontayrt.supabase.co';
const NEW_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jandybmlibnVlZWVvbnRheXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQxODkzODksImV4cCI6MjEwOTc2NTM4OX0.y6qCfMD0nmF4uhvUA69Npbh0VM2kurjuCWyAjIOcvUY';
const OLD_BLOCKED_REF = 'cmvtmdtlcjxhiqiquzqr';

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env is missing or still pointing to the old blocked Supabase instance, use new active instance
if (!supabaseUrl || supabaseUrl.includes(OLD_BLOCKED_REF) || !supabaseAnonKey || supabaseAnonKey.includes(OLD_BLOCKED_REF)) {
  supabaseUrl = NEW_SUPABASE_URL;
  supabaseAnonKey = NEW_SUPABASE_ANON_KEY;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

