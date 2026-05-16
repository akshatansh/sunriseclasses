const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const dataText = `
2 Manvi Singh Class 10 33 / 40 82.5%
`;


async function run() {
  const { data: students, error } = await supabase.from('students').select('*');
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }

  const inserts = [];
  const lines = dataText.trim().split('\n');
  
  for (const line of lines) {
    const match = line.match(/^\d+\s+(.*?)\s+Class 10\s+(\d+)\s*\/\s*40/i);
    if (match) {
      const name = match[1].trim();
      const marks = parseInt(match[2], 10);
      
      const student = students.find(s => s.name.toLowerCase() === name.toLowerCase() && String(s.class_name).includes('10'));
      if (student) {
        inserts.push({
          student_id: student.id,
          test_name: 'Cordinate Geometry (Online)',
          subject: 'MATH',
          test_date: '2026-05-10T00:00:00Z',
          marks_obtained: marks,
          total_marks: 40
        });
      } else {
        console.log('Student not found in DB:', name);
      }
    } else {
      console.log('Regex failed for:', line);
    }
  }

  console.log('Found', inserts.length, 'students to insert.');
  
  if (inserts.length > 0) {
    const { data, error: insertError } = await supabase.from('test_results').insert(inserts);
    if (insertError) {
      console.error('Insert error:', insertError);
    } else {
      console.log('Successfully inserted', inserts.length, 'records.');
    }
  }
}

run();
