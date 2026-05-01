import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeDatabase() {
  console.log("Wiping temporary data...");

  // Delete child tables first
  console.log("Deleting test_results...");
  await supabase.from('test_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Deleting fee_records...");
  await supabase.from('fee_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Deleting homework_records...");
  await supabase.from('homework_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Deleting attendance_records...");
  await supabase.from('attendance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Deleting students...");
  await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("Deleting notices...");
  await supabase.from('notices').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log("All temporary data wiped successfully!");
}

wipeDatabase().catch(console.error);
