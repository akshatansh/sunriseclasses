import { supabase } from './supabase';
import { type StudentRecord } from './resultsPortal';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  createdAt: string;
}

export interface StudentWithAttendance extends StudentRecord {
  attendanceStatus?: 'present' | 'absent';
  attendanceRecordId?: string;
}

export const getAttendanceByDate = async (date: string): Promise<Record<string, AttendanceRecord>> => {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('date', date);

    if (error) throw error;

    const recordMap: Record<string, AttendanceRecord> = {};
    (data || []).forEach(row => {
      recordMap[row.student_id] = {
        id: row.id,
        studentId: row.student_id,
        date: row.date,
        status: row.status,
        createdAt: row.created_at
      };
    });
    
    return recordMap;
  } catch (error) {
    console.error('Error fetching attendance by date:', error);
    return {};
  }
};

export const upsertAttendanceRecords = async (records: Omit<AttendanceRecord, 'id' | 'createdAt'>[]): Promise<boolean> => {
  if (records.length === 0) return true;
  try {
    const insertData = records.map(r => ({
      student_id: r.studentId,
      date: r.date,
      status: r.status
    }));

    const { error } = await supabase.from('attendance_records').upsert(insertData, {
      onConflict: 'student_id, date'
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving attendance records:', error);
    return false;
  }
};

export const getMonthlyAttendanceStats = async (month: string, year: number): Promise<Record<string, { percentage: number, history: {date: string, status: string}[] }>> => {
  try {
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    // Last day of the month
    const endDate = new Date(year, parseInt(month), 0).toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;

    const stats: Record<string, { total: number, present: number, history: {date: string, status: string}[] }> = {};
    
    (data || []).forEach(row => {
      if (!stats[row.student_id]) {
        stats[row.student_id] = { total: 0, present: 0, history: [] };
      }
      stats[row.student_id].total += 1;
      if (row.status === 'present') {
        stats[row.student_id].present += 1;
      }
      stats[row.student_id].history.push({ date: row.date, status: row.status });
    });

    const result: Record<string, { percentage: number, history: {date: string, status: string}[] }> = {};
    for (const [studentId, stat] of Object.entries(stats)) {
      result[studentId] = {
        percentage: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0,
        history: stat.history
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error calculating monthly attendance stats:', error);
    return {};
  }
};
