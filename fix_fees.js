import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  const { data: payments } = await supabase.from('fee_payments').select('id, total_fee, student_id');
  const { data: students } = await supabase.from('students').select('id, class_name');
  
  if (!payments || !students) return console.log('no data');

  for (const p of payments) {
    const student = students.find(s => s.id === p.student_id);
    if (!student) continue;
    const isClass10 = student.class_name.toLowerCase().includes('10');
    const correctBaseFee = isClass10 ? 1000 : 500;
    
    if (Number(p.total_fee) !== correctBaseFee) {
      console.log(`Fixing payment ${p.id} from ${p.total_fee} to ${correctBaseFee}`);
      await supabase.from('fee_payments').update({ total_fee: correctBaseFee }).eq('id', p.id);
    }
  }
  console.log('Done fixing');
}
fix();
