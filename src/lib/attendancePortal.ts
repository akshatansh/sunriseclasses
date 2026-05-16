import { supabase } from './supabase';
import { type StudentRecord } from './resultsPortal';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'holiday';
  createdAt: string;
}

export interface StudentWithAttendance extends StudentRecord {
  attendanceStatus?: 'present' | 'absent' | 'holiday';
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

export const upsertAttendanceRecords = async (records: Omit<AttendanceRecord, 'id' | 'createdAt'>[]): Promise<{ success: boolean, error?: string }> => {
  if (records.length === 0) return { success: true };
  try {
    const date = records[0].date;
    const studentIds = records.map(r => r.studentId);

    console.log('[upsertAttendanceRecords] Deleting old records for date:', date, 'studentIds count:', studentIds.length);

    // Step 1: Delete existing records for these students on this date
    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('date', date)
      .in('student_id', studentIds);

    if (deleteError) {
      console.error('[upsertAttendanceRecords] DELETE error:', deleteError);
      throw deleteError;
    }

    // Step 2: Insert fresh records
    const insertData = records.map(r => ({
      student_id: r.studentId,
      date: r.date,
      status: r.status
    }));

    console.log('[upsertAttendanceRecords] Inserting', insertData.length, 'records:', insertData);

    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert(insertData);

    if (insertError) {
      console.error('[upsertAttendanceRecords] INSERT error:', insertError);
      throw insertError;
    }

    console.log('[upsertAttendanceRecords] Success!');
    return { success: true };
  } catch (error: any) {
    console.error('Error saving attendance records:', error);
    return { success: false, error: error?.message || JSON.stringify(error) };
  }
};

export const getMonthlyAttendanceStats = async (month: string, year: number | string): Promise<Record<string, { percentage: number, history: {date: string, status: string}[] }>> => {
  try {
    const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;
    const startDate = `${yearNum}-${month.padStart(2, '0')}-01`;
    // Last day of the month without timezone shift
    const daysInMonth = new Date(yearNum, parseInt(month), 0).getDate();
    const endDate = `${yearNum}-${month.padStart(2, '0')}-${daysInMonth.toString().padStart(2, '0')}`;
    
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
      
      // Do not count holidays in total attendance calculation
      if (row.status !== 'holiday') {
        stats[row.student_id].total += 1;
        if (row.status === 'present') {
          stats[row.student_id].present += 1;
        }
      }
      stats[row.student_id].history.push({ date: row.date, status: row.status });
    });

    const result: Record<string, { percentage: number, present: number, total: number, history: {date: string, status: string}[] }> = {};
    for (const [studentId, stat] of Object.entries(stats)) {
      result[studentId] = {
        percentage: stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0,
        present: stat.present,
        total: stat.total,
        history: stat.history
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error calculating monthly attendance stats:', error);
    return {};
  }
};
