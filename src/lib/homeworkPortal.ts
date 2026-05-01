import { supabase } from './supabase';
import { type StudentRecord } from './resultsPortal';

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

export const getAvailableHomeworkMonths = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase.from('homework_records').select('month');
    if (error) throw error;
    
    // Extract unique months
    const months = new Set(data.map(r => r.month));
    // Sort months chronologically (oldest first: April, May, etc.)
    return Array.from(months).sort((a, b) => {
      return new Date("1 " + a).getTime() - new Date("1 " + b).getTime();
    });
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
