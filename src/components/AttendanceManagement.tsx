import { useEffect, useState } from 'react';
import { Calendar, Save, CheckCircle, XCircle, Download, Coffee, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAttendanceByDate, upsertAttendanceRecords, getMonthlyAttendanceStats } from '../lib/attendancePortal';
import { generateMonthlyClassReportPDF } from '../lib/pdfUtils';
import { loadResultsPortalData } from '../lib/resultsPortal';
import { getStudentsWithHomework } from '../lib/homeworkPortal';

interface AttendanceManagementProps {
  students: any[];
}

function normalizeClass(className?: string | null): '8th' | '9th' | '10th' | 'other' {
  if (!className) return 'other';
  const c = String(className).toLowerCase().replace(/\s+/g, '');
  if (c.includes('8')) return '8th';
  if (c.includes('9')) return '9th';
  if (c.includes('10')) return '10th';
  return 'other';
}

export default function AttendanceManagement({ students }: AttendanceManagementProps) {
  // Get today's date in local timezone
  const getLocalISODate = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalISODate());
  const [selectedClass, setSelectedClass] = useState<'8th' | '9th' | '10th'>('10th');
  const [attendanceState, setAttendanceState] = useState<Record<string, 'present' | 'absent' | 'holiday'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Fetch attendance for the selected date
  // IMPORTANT: We use a stable studentIds string as dependency (not the students array object)
  // to prevent attendance state from resetting on every parent re-render
  const studentIds = students.map(s => s.id).join(',');

  useEffect(() => {
    const fetchAttendance = async () => {
      const records = await getAttendanceByDate(selectedDate);
      const newState: Record<string, 'present' | 'absent' | 'holiday'> = {};

      // Timezone-safe Sunday detection: parse date string directly (YYYY-MM-DD)
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dayOfWeek = new Date(year, month - 1, day).getDay(); // local time, no timezone shift
      const isSunday = dayOfWeek === 0;

      students.forEach(s => {
        if (normalizeClass(s.className) === selectedClass) {
          if (records[s.id]) {
            newState[s.id] = records[s.id].status as any;
          } else {
            // Sunday → auto holiday, else → present
            newState[s.id] = isSunday ? 'holiday' : 'present';
          }
        }
      });
      setAttendanceState(newState);
    };
    
    fetchAttendance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedClass, studentIds]);


  const filteredStudents = students.filter(s => normalizeClass(s.className) === selectedClass)
                                   .sort((a, b) => a.name.localeCompare(b.name));

  const toggleStatus = (studentId: string) => {
    setAttendanceState(prev => {
      const current = prev[studentId];
      let next: 'present' | 'absent' | 'holiday' = 'present';
      if (current === 'present') next = 'absent';
      else if (current === 'absent') next = 'holiday';
      else next = 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const markAll = (status: 'present' | 'absent' | 'holiday') => {
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

    // Count what we're saving
    const presentCount = recordsToSave.filter(r => r.status === 'present').length;
    const absentCount = recordsToSave.filter(r => r.status === 'absent').length;
    const holidayCount = recordsToSave.filter(r => r.status === 'holiday').length;

    console.log('[Attendance Save] Sending records:', JSON.stringify(recordsToSave, null, 2));

    const result = await upsertAttendanceRecords(recordsToSave);
    setIsSaving(false);

    if (result.success) {
      setMessageType('success');
      setMessage(
        `✅ Saved for ${selectedDate} — ` +
        `Present: ${presentCount} | Absent: ${absentCount}` +
        (holidayCount > 0 ? ` | Holiday: ${holidayCount}` : '') +
        ` (Total: ${recordsToSave.length} students)`
      );
      setTimeout(() => setMessage(''), 6000);
    } else {
      setMessageType('error');
      setMessage(`❌ Save FAILED! Error: ${result.error || 'Unknown error'}. Please retry.`);
    }
  };

  const handleDownloadOfflineRecord = async () => {
    setIsDownloading(true);
    try {
      // Parse selectedDate string directly to avoid timezone issues (YYYY-MM-DD)
      const [year, month] = selectedDate.split('-').map(Number);
      const monthStr = month.toString();
      const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' });
      const yearStr = year.toString();
      const daysInMonth = new Date(year, month, 0).getDate();
      const stats = await getMonthlyAttendanceStats(monthStr, year);
      
      const holidayDays = new Set<number>();
      Object.values(stats).forEach(s => {
        s.history.forEach(h => {
          if (h.status === 'holiday') {
            const dateNum = parseInt(h.date.split('-')[2], 10);
            holidayDays.add(dateNum);
          }
        });
      });

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      
      const { drawPDFHeader, drawPDFFooter } = await import('../lib/pdfUtils');
      const startY = await drawPDFHeader(
        doc,
        `Monthly Attendance Sheet - ${selectedClass}`,
        `Month: ${monthName} ${yearStr}`
      );
      
      const headRow = ['Name', ...Array.from({ length: daysInMonth }, (_, i) => String(i + 1)), 'Total', '%'];
      
      const tableData = filteredStudents.map((s) => {
        const studentStat = stats[s.id] || { present: 0, total: 0, percentage: 0, history: [] };
        
        const dayStatusMap: Record<number, string> = {};
        studentStat.history.forEach(h => {
           const dayNum = parseInt(h.date.split('-')[2], 10);
           dayStatusMap[dayNum] = h.status;
        });

        const rowData: string[] = [s.name];
        
        for (let i = 1; i <= daysInMonth; i++) {
           const st = dayStatusMap[i];
           if (holidayDays.has(i)) {
             rowData.push('H');
           } else if (st === 'present') {
             rowData.push('P');
           } else if (st === 'absent') {
             rowData.push('A');
           } else {
             rowData.push('');
           }
        }
        
        rowData.push(`${studentStat.present}/${studentStat.total}`);
        rowData.push(`${studentStat.percentage}%`);
        return rowData;
      });

      autoTable(doc, {
        startY: startY + 5,
        theme: 'grid',
        head: [headRow],
        body: tableData,
        headStyles: { fillColor: [15, 42, 92], textColor: 255, fontSize: 8, halign: 'center', lineWidth: 0.2, lineColor: [200, 200, 200] },
        styles: { fontSize: 8, cellPadding: 1.5, halign: 'center', lineWidth: 0.2, lineColor: [200, 200, 200] },
        columnStyles: { 0: { halign: 'left', cellWidth: 35 } },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const colIndex = data.column.index;
            if (colIndex > 0 && colIndex <= daysInMonth) {
               if (holidayDays.has(colIndex)) {
                 data.cell.styles.fillColor = [255, 235, 150]; // Yellow for holiday
                 data.cell.styles.textColor = [160, 120, 0];
                 data.cell.styles.fontStyle = 'bold';
               } else if (data.cell.raw === 'P') {
                 data.cell.styles.textColor = [21, 128, 61]; // Green
               } else if (data.cell.raw === 'A') {
                 data.cell.styles.textColor = [220, 38, 38]; // Red
                 data.cell.styles.fontStyle = 'bold';
               }
            } else if (colIndex > daysInMonth) {
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      drawPDFFooter(doc);

      doc.save(`Attendance_Grid_${selectedClass}_${monthName}_${yearStr}.pdf`);
      setMessage(`Downloaded Grid PDF for ${monthName} ${yearStr}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      alert('Error downloading report');
    }
    setIsDownloading(false);
  };

  // ── Monthly Class Report (WhatsApp PDF) ──────────────────────────────────
  const handleMonthlyClassReport = async () => {
    setIsReporting(true);
    try {
      // Parse selectedDate directly to avoid timezone shift (YYYY-MM-DD)
      const [year, month] = selectedDate.split('-').map(Number);
      const monthStr = month.toString();
      const yearStr = year.toString();
      const monthLabel = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }) + ' ' + yearStr;

      // 1. Attendance stats for all students this month
      const attStats = await getMonthlyAttendanceStats(monthStr, year);

      // 2. Test results for marks calculation
      const portalData = await loadResultsPortalData();

      // 3. Homework data for this month
      const hwList = await getStudentsWithHomework(monthLabel);

      // Build per-student data
      const classStudents = students.filter(s => normalizeClass(s.className) === selectedClass);

      const reportStudents = classStudents.map(s => {
        // Attendance
        const att = attStats[s.id];
        const presentDays = att ? att.history.filter(h => h.status === 'present').length : 0;
        const totalDays = att ? att.history.filter(h => h.status !== 'holiday').length : 0;

        // Marks — filter to this month
        const studentResults = portalData.results.filter(r => {
          if (r.studentId !== s.id) return false;
          const dateStr = r.testDate;
          if (!dateStr) return false;

          let y: number;
          let m: number;
          if (dateStr.includes('T') || dateStr.includes(' ')) {
            const d = new Date(dateStr);
            y = d.getFullYear();
            m = d.getMonth() + 1;
          } else {
            const parts = dateStr.split('-');
            y = parseInt(parts[0], 10);
            m = parseInt(parts[1], 10);
          }
          if (isNaN(y) || isNaN(m)) return false;
          const rLabel = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long' }) + ' ' + y;
          return rLabel === monthLabel;
        });
        const avgMarks = studentResults.length > 0
          ? studentResults.reduce((sum, r) => sum + ((r.marksObtained ?? r.obtainedMarks ?? 0) / r.totalMarks) * 100, 0) / studentResults.length
          : null;

        // Homework
        const hw = hwList.find(h => h.id === s.id);

        return {
          id: s.id,
          name: s.name,
          attendance: att ? { percentage: att.percentage, presentDays, totalDays } : null,
          avgMarks,
          testCount: studentResults.length,
          homework: hw?.homework ? { completedPages: hw.homework.completedPages, targetPages: hw.homework.targetPages } : null,
        };
      });

      await generateMonthlyClassReportPDF(monthLabel, selectedClass, reportStudents);
      setMessage(`Monthly Report downloaded for ${monthLabel} — Class ${selectedClass}`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Error generating report. Please try again.');
    }
    setIsReporting(false);
  };

  return (
    <div className="rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#0f2a5c] flex items-center gap-2">
            <Calendar className="text-[#f5a623]" size={24} />
            Daily Attendance
          </h2>
          <p className="text-sm text-slate-500 mt-1">Mark student attendance or holiday for the selected date</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <input 
            type="date" 
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={getLocalISODate()}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-[#0f2a5c] font-semibold outline-none focus:border-[#0f2a5c]"
          />
          <button
            onClick={handleDownloadOfflineRecord}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-all disabled:opacity-50"
            title="Download Monthly Attendance Grid for Offline Record"
          >
            <Download size={16} />
            {isDownloading ? '...' : 'Attendance Sheet'}
          </button>
          <button
            onClick={handleMonthlyClassReport}
            disabled={isReporting}
            className="inline-flex items-center gap-2 rounded-xl bg-green-50 border border-green-300 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition-all disabled:opacity-50"
            title="Download Monthly Class Report (All Students) for WhatsApp sharing"
          >
            <FileText size={16} />
            {isReporting ? 'Generating...' : '📋 Monthly Report'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <button
          onClick={() => setSelectedClass('8th')}
          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
            selectedClass === '8th' ? 'bg-[#0f2a5c] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Class 8
        </button>
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

      {/* Sunday Holiday Banner */}
      {(() => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        const isSunday = new Date(y, m - 1, d).getDay() === 0;
        return isSunday ? (
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-300 p-4 flex items-center gap-3">
            <Coffee className="text-amber-500 shrink-0" size={22} />
            <div>
              <p className="font-bold text-amber-700 text-sm">🌞 Sunday — Auto Holiday</p>
              <p className="text-xs text-amber-600 mt-0.5">Sab students automatically Holiday mark ho gaye hain. Save karo ya manually change karo.</p>
            </div>
          </div>
        ) : null;
      })()}

      {message && (
        <div className={`mb-6 rounded-xl border p-4 text-sm font-semibold flex items-center justify-between ${
          messageType === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="ml-4 text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {filteredStudents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          No students found for this class. Add students first.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <button 
              onClick={() => markAll('present')}
              className="text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
            >
              All Present
            </button>
            <button 
              onClick={() => markAll('absent')}
              className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
            >
              All Absent
            </button>
            <button 
              onClick={() => markAll('holiday')}
              className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1"
            >
              <Coffee size={14} /> Holiday
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map(student => {
              const status = attendanceState[student.id] || 'present';
              return (
                <div 
                  key={student.id}
                  onClick={() => toggleStatus(student.id)}
                  className={`cursor-pointer rounded-xl border p-4 flex items-center justify-between transition-all ${
                    status === 'present' 
                      ? 'border-green-200 bg-green-50/50 hover:bg-green-50' 
                      : status === 'absent' 
                        ? 'border-red-200 bg-red-50 hover:bg-red-100'
                        : 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={student.image || '/sunrise-logo.png'} 
                      alt={student.name}
                      className="w-10 h-10 rounded-full object-cover object-top border border-white shadow-sm"
                      onError={e => (e.currentTarget.src = '/sunrise-logo.png')}
                    />
                    <div>
                      <p className={`font-bold text-sm ${status === 'present' ? 'text-slate-800' : 'text-slate-500'}`}>
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">{student.className}</p>
                    </div>
                  </div>
                  
                  <div>
                    {status === 'present' ? (
                      <CheckCircle className="text-green-500" size={24} />
                    ) : status === 'absent' ? (
                      <XCircle className="text-red-500" size={24} />
                    ) : (
                      <Coffee className="text-amber-500" size={24} />
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
