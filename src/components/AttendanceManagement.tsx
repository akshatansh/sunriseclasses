import { useEffect, useState } from 'react';
import { Calendar, Save, CheckCircle, XCircle } from 'lucide-react';
import { getAttendanceByDate, upsertAttendanceRecords, type AttendanceRecord } from '../lib/attendancePortal';

interface AttendanceManagementProps {
  students: any[];
}

function normalizeClass(className?: string | null): '9th' | '10th' | 'other' {
  if (!className) return 'other';
  const c = String(className).toLowerCase().replace(/\s+/g, '');
  if (c.includes('9')) return '9th';
  if (c.includes('10')) return '10th';
  return 'other';
}

export default function AttendanceManagement({ students }: AttendanceManagementProps) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState<'9th' | '10th'>('10th');
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch attendance for the selected date
  useEffect(() => {
    const fetchAttendance = async () => {
      const records = await getAttendanceByDate(selectedDate);
      const newState: Record<string, 'present' | 'absent'> = {};
      
      // Default all to present, then override with existing records if any
      students.forEach(s => {
        if (normalizeClass(s.className) === selectedClass) {
          newState[s.id] = records[s.id] ? records[s.id].status : 'present';
        }
      });
      setAttendanceState(newState);
    };
    
    fetchAttendance();
  }, [selectedDate, selectedClass, students]);

  const filteredStudents = students.filter(s => normalizeClass(s.className) === selectedClass)
                                   .sort((a, b) => a.name.localeCompare(b.name));

  const toggleStatus = (studentId: string) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const markAll = (status: 'present' | 'absent') => {
    const newState = { ...attendanceState };
    filteredStudents.forEach(s => {
      newState[s.id] = status;
    });
    setAttendanceState(newState);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const recordsToSave = filteredStudents.map(s => ({
      studentId: s.id,
      date: selectedDate,
      status: attendanceState[s.id] || 'present'
    }));

    const success = await upsertAttendanceRecords(recordsToSave);
    setIsSaving(false);

    if (success) {
      setMessage(`Attendance saved for ${selectedDate}`);
      setTimeout(() => setMessage(''), 3000);
    } else {
      alert('Failed to save attendance. Please try again.');
    }
  };

  return (
    <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#0f2a5c] flex items-center gap-2">
            <Calendar className="text-[#f5a623]" size={24} />
            Daily Attendance
          </h2>
          <p className="text-sm text-slate-500 mt-1">Mark student attendance for the selected date</p>
        </div>
        
        <div className="flex gap-3">
          <input 
            type="date" 
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-[#0f2a5c] font-semibold outline-none focus:border-[#0f2a5c]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <button
          onClick={() => setSelectedClass('9th')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
            selectedClass === '9th' ? 'bg-[#0f2a5c] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Class 9
        </button>
        <button
          onClick={() => setSelectedClass('10th')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
            selectedClass === '10th' ? 'bg-[#0f2a5c] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Class 10
        </button>
      </div>

      {message && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 text-green-700 text-sm font-semibold flex items-center justify-between">
          <span>✅ {message}</span>
        </div>
      )}

      {filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          No students found for this class. Add students first.
        </div>
      ) : (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <button 
              onClick={() => markAll('present')}
              className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              Mark All Present
            </button>
            <button 
              onClick={() => markAll('absent')}
              className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              Mark All Absent
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => {
              const isPresent = attendanceState[student.id] !== 'absent';
              return (
                <div 
                  key={student.id}
                  onClick={() => toggleStatus(student.id)}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center justify-between transition-all ${
                    isPresent 
                      ? 'border-green-200 bg-green-50/50 hover:bg-green-50' 
                      : 'border-red-200 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={student.image || '/sunrise-logo.png'} 
                      alt={student.name}
                      className="w-10 h-10 rounded-full object-cover border border-white shadow-sm"
                      onError={e => (e.currentTarget.src = '/sunrise-logo.png')}
                    />
                    <div>
                      <p className={`font-bold text-sm ${isPresent ? 'text-slate-800' : 'text-slate-500'}`}>
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">{student.className}</p>
                    </div>
                  </div>
                  
                  <div>
                    {isPresent ? (
                      <CheckCircle className="text-green-500" size={24} />
                    ) : (
                      <XCircle className="text-red-500" size={24} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-[#f5a623] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#f5a623]/30 transition-all hover:-translate-y-0.5 hover:bg-[#e09010] disabled:opacity-70 disabled:hover:translate-y-0"
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
