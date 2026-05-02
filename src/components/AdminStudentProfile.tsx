import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, User, Phone, MapPin, Calendar, BookOpen, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMonthlyAttendanceStats } from '../lib/attendancePortal';
import { getStudentsWithHomework } from '../lib/homeworkPortal';
import { generateStudentRankCardPDF } from '../lib/pdfUtils';
import type { StudentRecord, TestResultRecord } from '../lib/resultsPortal';

interface AdminStudentProfileProps {
  student: StudentRecord;
  allResults: TestResultRecord[];
  onClose: () => void;
}

export default function AdminStudentProfile({ student, allResults, onClose }: AdminStudentProfileProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  
  const [attendanceData, setAttendanceData] = useState<{ percentage: number, history: {date: string, status: string}[] } | null>(null);
  const [homeworkData, setHomeworkData] = useState<{ completedPages: number, targetPages: number } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract available months from test results
  useEffect(() => {
    const monthsSet = new Set<string>();
    allResults.forEach(r => {
      const d = new Date(r.testDate);
      monthsSet.add(d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear());
    });
    
    // Add current month if not present
    const now = new Date();
    const currentMonth = now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear();
    monthsSet.add(currentMonth);

    const sorted = Array.from(monthsSet).sort((a, b) => new Date("1 " + a).getTime() - new Date("1 " + b).getTime());
    setAvailableMonths(sorted);
    setSelectedMonth(sorted[sorted.length - 1]);
  }, [allResults]);

  // Fetch month specific data
  useEffect(() => {
    if (!selectedMonth) return;

    // Fetch Attendance
    const d = new Date("1 " + selectedMonth);
    getMonthlyAttendanceStats((d.getMonth() + 1).toString(), d.getFullYear())
      .then(stats => {
        if (stats[student.id]) {
          setAttendanceData(stats[student.id]);
        } else {
          setAttendanceData(null);
        }
      })
      .catch(console.error);

    // Fetch Homework
    getStudentsWithHomework(selectedMonth).then(hwList => {
      const hw = hwList.find(s => s.id === student.id);
      if (hw && hw.homework) {
        setHomeworkData({ completedPages: hw.homework.completedPages, targetPages: hw.homework.targetPages });
      } else {
        setHomeworkData(null);
      }
    }).catch(console.error);
    
  }, [selectedMonth, student.id]);

  const monthResults = useMemo(() => {
    if (!selectedMonth) return [];
    return allResults.filter(r => {
      const d = new Date(r.testDate);
      return (d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear()) === selectedMonth;
    });
  }, [selectedMonth, allResults]);

  const handleDownloadPDF = async () => {
    if (!selectedMonth) return;
    setIsGenerating(true);
    try {
      await generateStudentRankCardPDF(
        student.name,
        student.className || 'Unknown',
        selectedMonth,
        monthResults,
        attendanceData,
        homeworkData
      );
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('PDF download failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#0f2a5c] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="text-[#f5a623]" /> Student Profile
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {/* Top Section: Photo & Basic Details */}
          <div className="flex flex-col md:flex-row gap-6 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="shrink-0 flex flex-col items-center">
              <div className="h-32 w-32 md:h-40 md:w-40 rounded-full overflow-hidden border-4 border-[#f5a623] shadow-md bg-slate-100">
                <img 
                  src={student.image || '/sunrise-logo.png'} 
                  alt={student.name} 
                  className="h-full w-full object-cover object-top"
                  onError={(e) => { e.currentTarget.src = '/sunrise-logo.png'; }}
                />
              </div>
              <span className="mt-3 bg-[#e6f0ff] text-[#0f2a5c] px-4 py-1 rounded-full text-sm font-bold border border-[#b3d4ff]">
                {student.className}
              </span>
            </div>

            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800">{student.name}</h1>
                <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                  ID: <span className="text-slate-700 font-mono text-sm">{student.id.split('-')[0].toUpperCase()}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Father's Name</p>
                    <p className="font-semibold text-slate-700">{student.fatherName || 'Not Provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Parent's Phone</p>
                    <p className="font-semibold text-slate-700">{student.parentPhone || 'Not Provided'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Month Selector & Download */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <Calendar className="text-slate-400" size={18} />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-[#0f2a5c] outline-none min-w-[150px] cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isGenerating || !selectedMonth}
              className="flex items-center gap-2 bg-[#f5a623] hover:bg-[#e0961a] text-white px-6 py-3 rounded-xl font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={20} />
              )}
              {isGenerating ? 'Generating...' : 'Download Report Card'}
            </button>
          </div>

          {/* Monthly Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            
            {/* Attendance Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Attendance</h3>
                  <p className="text-xs text-slate-500 font-medium">For {selectedMonth}</p>
                </div>
              </div>

              {attendanceData ? (
                <div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-teal-600">{attendanceData.percentage}%</span>
                    <span className="text-sm text-slate-500 font-medium mb-1">Present</span>
                  </div>
                  {/* Miniature dots representation */}
                  <div className="flex flex-wrap gap-1 mt-4">
                    {attendanceData.history.map((record, i) => (
                      <div 
                        key={i}
                        title={`${new Date(record.date).getDate()}: ${record.status}`}
                        className={`h-4 w-4 rounded-sm ${
                          record.status === 'present' ? 'bg-teal-500' :
                          record.status === 'absent' ? 'bg-red-500' : 'bg-yellow-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-medium">No attendance recorded for this month.</div>
              )}
            </div>

            {/* Homework Card */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Homework</h3>
                  <p className="text-xs text-slate-500 font-medium">For {selectedMonth}</p>
                </div>
              </div>

              {homeworkData ? (
                <div>
                  <div className="flex items-end gap-2 mb-3">
                    <span className="text-4xl font-black text-purple-600">
                      {homeworkData.targetPages > 0 ? Math.round((homeworkData.completedPages / homeworkData.targetPages) * 100) : 0}%
                    </span>
                    <span className="text-sm text-slate-500 font-medium mb-1">Completed</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden">
                    <div 
                      className="bg-purple-500 h-full rounded-full" 
                      style={{ width: `${homeworkData.targetPages > 0 ? (homeworkData.completedPages / homeworkData.targetPages) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-bold text-right">
                    {homeworkData.completedPages} / {homeworkData.targetPages} Pages
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-medium">No homework assigned this month.</div>
              )}
            </div>
          </div>

          {/* Test Results Table */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <Trophy size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Test Performance</h3>
                <p className="text-xs text-slate-500 font-medium">For {selectedMonth}</p>
              </div>
            </div>

            {monthResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-3 font-bold rounded-tl-xl">Date</th>
                      <th className="p-3 font-bold">Subject</th>
                      <th className="p-3 font-bold">Marks</th>
                      <th className="p-3 font-bold">Percentage</th>
                      <th className="p-3 font-bold rounded-tr-xl">Rank</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {monthResults.map((r, i) => {
                      const pct = Math.round((r.obtainedMarks / r.totalMarks) * 100);
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-medium text-slate-700">
                            {new Date(r.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </td>
                          <td className="p-3 font-bold text-[#0f2a5c]">{r.subject}</td>
                          <td className="p-3 font-bold text-slate-700">{r.obtainedMarks} <span className="text-slate-400 text-xs font-normal">/ {r.totalMarks}</span></td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                              pct >= 80 ? 'bg-green-100 text-green-700' :
                              pct >= 50 ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {pct}%
                            </span>
                          </td>
                          <td className="p-3">
                            {r.rank > 0 ? (
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-[#f5a623]/20 text-[#d48b15] font-black text-xs">
                                #{r.rank}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 font-medium">No tests taken in this month.</div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
