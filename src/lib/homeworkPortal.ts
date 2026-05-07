import { supabase } from './supabase';
import { type StudentRecord } from './resultsPortal';

const ENABLE_DUMMY_DATA = true; // Set this to false to instantly remove dummy homework

export interface HomeworkRecord {
  id: string;
  studentId: string;
  month: string;
  targetPages: number;
  completedPages: number;
  createdAt: string;
}

export interface StudentWithHomework extends StudentRecord {
  homework: HomeworkRecord | null;
}

const MONTHS_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthLabelToSortKey(label: string): number {
  const parts = (label || '').trim().split(' ');
  const mIdx = MONTHS_ORDER.findIndex(m => m.toLowerCase() === (parts[0] || '').toLowerCase());
  const yr = parseInt(parts[1] || '0', 10);
  return isNaN(yr) || mIdx === -1 ? 0 : yr * 12 + mIdx;
}

export const getAvailableHomeworkMonths = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase.from('homework_records').select('month');
    if (error) throw error;
    const months = new Set(data.map(r => r.month));
    if (ENABLE_DUMMY_DATA) {
      months.add('May 2026');
    }
    return Array.from(months).sort((a, b) => monthLabelToSortKey(a) - monthLabelToSortKey(b));
  } catch (error) {
    console.error('Error fetching available homework months:', error);
    return [];
  }
};


export const getStudentsWithHomework = async (month: string): Promise<StudentWithHomework[]> => {
  try {
    const [studentsResponse, homeworkResponse] = await Promise.all([
      supabase.from('students').select('*').order('name'),
      supabase.from('homework_records').select('*').eq('month', month)
    ]);

    if (studentsResponse.error) throw studentsResponse.error;
    if (homeworkResponse.error) throw homeworkResponse.error;

    const students = studentsResponse.data || [];
    const homeworkRecords = homeworkResponse.data || [];

    if (ENABLE_DUMMY_DATA && month === 'May 2026') {
      students.forEach((s, idx) => {
        if (!homeworkRecords.find(h => h.student_id === s.id)) {
          homeworkRecords.push({
            id: `dummy-hw-${s.id}`,
            student_id: s.id,
            month: 'May 2026',
            target_pages: 100,
            completed_pages: Math.max(0, 95 - (idx * 5)), 
            created_at: new Date().toISOString()
          });
        }
      });
    }

    return students.map(student => {
      const hw = homeworkRecords.find(h => h.student_id === student.id);
      return {
        id: student.id,
        name: student.name,
        className: student.class_name,
        image: student.image,
        fatherName: student.father_name,
        parentPhone: student.parent_phone,
        createdAt: student.created_at,
        homework: hw ? {
          id: hw.id,
          studentId: hw.student_id,
          month: hw.month,
          targetPages: hw.target_pages,
          completedPages: hw.completed_pages,
          createdAt: hw.created_at
        } : null
      };
    });
  } catch (error) {
    console.error('Error fetching homework status:', error);
    return [];
  }
};

export const upsertHomeworkRecords = async (records: Omit<HomeworkRecord, 'id' | 'createdAt'>[]): Promise<boolean> => {
  if (records.length === 0) return true;
  try {
    const insertData = records.map(r => ({
      student_id: r.studentId,
      month: r.month,
      target_pages: r.targetPages,
      completed_pages: r.completedPages
    }));

    // Upsert relies on the unique constraint (student_id, month)
    const { error } = await supabase.from('homework_records').upsert(insertData, {
      onConflict: 'student_id, month'
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error upserting homework records:', error);
    return false;
  }
};

export const deleteHomeworkRecord = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from('homework_records').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting homework record:', error);
    return false;
  }
};
