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

async function runTest() {
  console.log("Running DB Insertion Test...");

  // Insert a test student
  const { data: student, error: studentError } = await supabase.from('students').insert({
    name: 'Test Student',
    class_name: 'Class 10',
    father_name: 'Test Father',
    parent_phone: '1234567890'
  }).select().single();

  if (studentError) {
    console.error("❌ Failed to insert student:", studentError);
    return;
  }
  console.log("✅ Student inserted successfully:", student.id);

  // Insert test attendance
  const { error: attError } = await supabase.from('attendance_records').insert({
    student_id: student.id,
    date: new Date().toISOString().split('T')[0],
    status: 'present'
  });

  if (attError) {
    console.error("❌ Failed to insert attendance:", attError);
    return;
  }
  console.log("✅ Attendance inserted successfully");

  console.log("\nAll tests passed! Cleaning up test data...");

  // Wipe test data
  await supabase.from('attendance_records').delete().eq('student_id', student.id);
  await supabase.from('students').delete().eq('id', student.id);
  
  console.log("✅ Test data cleaned up successfully. Ready for real usage.");
}

runTest().catch(console.error);
