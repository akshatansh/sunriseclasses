import { useEffect, useMemo, useState, useRef } from 'react';
import { Medal, Search, Sparkles, Trophy, BookOpen, TrendingUp, Download } from 'lucide-react';
import Seo from '../components/Seo';
import StudentProgressChart from '../components/StudentProgressChart';
import { generateStudentRankCardPDF } from '../lib/pdfUtils';
import {
  getAllStudentResults,
  getCurrentMonthLabel,
  getMonthlyStudentSummaries,
  loadResultsPortalData,
  type ResultsPortalData,
} from '../lib/resultsPortal';
import { getAvailableHomeworkMonths, getStudentsWithHomework, type StudentWithHomework } from '../lib/homeworkPortal';
import { getMonthlyAttendanceStats } from '../lib/attendancePortal';

/** Normalize className string to '8th' | '9th' | '10th' | 'other' */
function normalizeClass(className?: string | null): '8th' | '9th' | '10th' | 'other' {
  if (!className) return 'other';
  const c = String(className).toLowerCase().replace(/\s+/g, '');
  if (c.includes('8')) return '8th';
  if (c.includes('9')) return '9th';
  if (c.includes('10')) return '10th';
  return 'other';
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultsPortalData>({ students: [], results: [] });
  const [query, setQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<'8th' | '9th' | '10th'>('10th');
  const [selectedStudentForChart, setSelectedStudentForChart] = useState<{name: string, data: any[]} | null>(null);
  const [homeworkData, setHomeworkData] = useState<StudentWithHomework[]>([]);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [attendanceViewMode, setAttendanceViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceStats, setAttendanceStats] = useState<Record<string, { percentage: number, history: {date: string, status: string}[] }>>({});
  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      loadResultsPortalData(),
      getAvailableHomeworkMonths()
    ]).then(([portalData, hwMonths]) => {
      setData(portalData);
      
      const monthsSet = new Set(hwMonths);
      portalData.results.forEach(r => {
        const d = new Date(r.testDate);
        monthsSet.add(d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear());
      });
      
      const combinedMonths = Array.from(monthsSet).sort((a, b) => new Date("1 " + a).getTime() - new Date("1 " + b).getTime());
      setAvailableMonths(combinedMonths);
      
      if (combinedMonths.length > 0) {
        setSelectedMonth(combinedMonths[combinedMonths.length - 1]);
      } else {
        const now = new Date();
        setSelectedMonth(now.toLocaleString('default', { month: 'long' }) + ' ' + now.getFullYear());
      }
    }).catch(console.error);
  }, []);

  // Fetch attendance stats for selected month
  useEffect(() => {
    if (!selectedMonth) return;
    const d = new Date("1 " + selectedMonth);
    getMonthlyAttendanceStats((d.getMonth() + 1).toString(), d.getFullYear())
      .then(setAttendanceStats)
      .catch(console.error);
  }, [selectedMonth]);

  // Auto-scroll to the far right when the tests change or load
  useEffect(() => {
    if (tableContainerRef.current) {
      // Small timeout ensures the DOM has updated before calculating scrollWidth
      setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
        }
      }, 50);
    }
  }, [data, selectedClass]);

  // Fetch homework data whenever class or month changes
  useEffect(() => {
    if (!selectedMonth) return;
    getStudentsWithHomework(selectedMonth).then(all => {
      // Filter by selected class
      const filtered = all.filter(s => normalizeClass(s.className) === selectedClass);
      setHomeworkData(filtered);
    }).catch(console.error);
  }, [selectedClass, selectedMonth]);

  // Filter students and results to only the selected class
  const classFilteredData = useMemo(() => {
    return {
      students: data.students.filter(s => normalizeClass(s.className) === selectedClass),
      results: data.results.filter(r => {
        const student = data.students.find(s => s.id === r.studentId);
        return student ? normalizeClass(student.className) === selectedClass : false;
      }),
    };
  }, [data, selectedClass]);

  // Top performers section: previous month ke results dikhane hain
  // (May chal raha hai → April ka performance show ho)
  const prevMonthDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 15); // previous month ki mid-date
  }, []);

  const referenceDate = useMemo(() => {
    if (classFilteredData.results.length === 0) return prevMonthDate;
    // Check karo ki previous month mein koi test tha?
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth();
    const prevMonthTests = classFilteredData.results.filter(r => {
      const d = new Date(r.testDate);
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
    });
    // Agar previous month mein tests hain to use karo, warna latest test ki date
    if (prevMonthTests.length > 0) return prevMonthDate;
    const latestTest = classFilteredData.results.reduce((latest, current) =>
      new Date(current.testDate) > new Date(latest.testDate) ? current : latest
    );
    return new Date(latestTest.testDate);
  }, [classFilteredData.results, prevMonthDate]);

  const monthLabel = getCurrentMonthLabel(referenceDate);
  const monthlySummaries = useMemo(() => getMonthlyStudentSummaries(classFilteredData, referenceDate), [classFilteredData, referenceDate]);
  const allStudentResults = useMemo(() => getAllStudentResults(classFilteredData), [classFilteredData]);
  // Group tied students into combined rank groups (max 3 rank slots)
  const topThreeGroups = useMemo(() => {
    const groups: { rank: number; summaries: typeof monthlySummaries }[] = [];
    let rankCounter = 1;
    let i = 0;
    while (i < monthlySummaries.length && groups.length < 3) {
      const currentPct = monthlySummaries[i].percentage;
      // Collect all students with same percentage
      const tied = [];
      while (i < monthlySummaries.length && monthlySummaries[i].percentage === currentPct) {
        tied.push(monthlySummaries[i]);
        i++;
      }
      groups.push({ rank: rankCounter, summaries: tied });
      rankCounter += tied.length;
    }
    return groups;
  }, [monthlySummaries]);


  const filteredStudents = allStudentResults.filter(({ student }) => {
    const search = query.trim().toLowerCase();
    if (!search) return true;
    return `${student.name} ${student.className}`.toLowerCase().includes(search);
  });

  const uniqueTests = useMemo(() => {
    const testsMap = new Map<string, { testName: string; testDate: string; subject: string; totalMarks: number }>();
    classFilteredData.results.forEach((r) => {
      // Normalize name by trimming for grouping - ignore date for grouping as per user request
      const normalizedName = r.testName.trim();
      const key = normalizedName;
      
      if (!testsMap.has(key)) {
        testsMap.set(key, {
          testName: normalizedName,
          testDate: r.testDate, // Keep original for display (of the first instance)
          subject: r.subject,
          totalMarks: r.totalMarks,
        });
      }
    });
    return Array.from(testsMap.values()).sort(
      (a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
    );
  }, [classFilteredData.results]);

  return (
    <div className="pt-[116px]">
      <Seo
        title="Daily Test Results & Monthly Toppers - Sunrise Classes Champanagar Purnia"
        description="Check daily test results, student rankings, monthly toppers, and performance charts at Sunrise Classes & Academy, Champanagar Purnia Bihar. Parents can track attendance, homework, and marks online."
        keywords="daily test results Champanagar Purnia, Sunrise Classes marks, monthly toppers Sunrise Classes, student test marks Purnia, coaching test results Bihar, student attendance report Purnia, homework progress tracking Champanagar"
        url="/results"
      />

      <section className="pt-4 pb-16 sm:pb-20 bg-[radial-gradient(circle_at_top,_rgba(245,166,35,0.16),_transparent_24%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_48%,_#fffaf0_100%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 sm:p-8 shadow-[0_24px_80px_rgba(15,42,92,0.08)] backdrop-blur">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#f5a623]/20 bg-[#fff6df] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#0f2a5c]">
                  <Sparkles size={14} className="text-[#f5a623]" />
                  Daily Test Dashboard
                </div>
                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0f2a5c]">
                  Monthly Toppers and Test-wise Student Marks
                </h1>
                <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-slate-600">
                  Yahan aap current month ke top students, har student ke test marks, aur performance summary
                  direct dekh sakte hain. Student login ki zarurat nahi hai.
                </p>
              </div>

              <div className="flex flex-col items-center gap-4">
                {/* Class Toggle */}
                <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1">
                  <button
                    id="class-8-toggle"
                    onClick={() => { setSelectedClass('8th'); setQuery(''); }}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                      selectedClass === '8th'
                        ? 'bg-[#0f2a5c] text-white shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Class 8
                  </button>
                  <button
                    id="class-9-toggle"
                    onClick={() => { setSelectedClass('9th'); setQuery(''); }}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                      selectedClass === '9th'
                        ? 'bg-[#0f2a5c] text-white shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Class 9
                  </button>
                  <button
                    id="class-10-toggle"
                    onClick={() => { setSelectedClass('10th'); setQuery(''); }}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                      selectedClass === '10th'
                        ? 'bg-[#0f2a5c] text-white shadow'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Class 10
                  </button>
                </div>

                {/* Session card */}
                <div className="rounded-[1.75rem] border border-[#d9e5ff] bg-[#f8fbff] px-6 py-5 text-center w-full lg:min-w-[260px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Current Session</p>
                  <p className="mt-2 text-2xl font-black text-[#0f2a5c]">{monthLabel}</p>
                  <p className="mt-2 text-sm text-slate-500">{monthlySummaries.length} students ranked this month</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <div className="mb-6 flex items-center gap-3">
              <Trophy className="text-[#f5a623]" size={24} />
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0f2a5c]">TOP Performers of {monthLabel} — Class {selectedClass}</h2>
            </div>

            {topThreeGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {topThreeGroups.map((group) => {
                  const isFirst = group.rank === 1;
                  const isTied = group.summaries.length > 1;
                  const rankLabel = isFirst ? 'TOP PERFORMER' : `Rank #${group.rank}`;
                  const pct = group.summaries[0].percentage;

                  return (
                    <div
                      key={group.rank}
                      className={`rounded-[2rem] border p-6 shadow-sm ${
                        isFirst
                          ? 'border-[#f5a623]/40 bg-[linear-gradient(180deg,_#fff8e8,_#ffffff)]'
                          : 'border-slate-200 bg-white/90'
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-2 rounded-full bg-[#0f2a5c] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                            <Medal size={14} className="text-[#f5a623]" />
                            {rankLabel}
                          </div>
                          {isTied && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                              🤝 Joint
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-[#9a5b00]">{pct}%</span>
                      </div>

                      {/* Student(s) */}
                      {isTied ? (
                        // Combined card: side by side photos
                        <div className="mt-5">
                          <div className="flex items-center justify-center gap-2">
                            {group.summaries.map((s, si) => (
                              <>
                                <div key={s.student.id} className="flex flex-col items-center gap-2 flex-1">
                                  <img
                                    src={s.student.image || '/sunrise-logo.png'}
                                    alt={s.student.name}
                                    className="h-16 w-16 rounded-2xl object-cover object-top border-2 border-[#f5a623]/40 bg-slate-50"
                                    onError={(e) => { e.currentTarget.src = '/sunrise-logo.png'; }}
                                  />
                                  <div className="text-center">
                                    <p className="text-sm font-bold text-[#0f2a5c] leading-tight">{s.student.name}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{s.student.className}</p>
                                    <p className="text-xs text-slate-600 mt-1">{s.totalMarksObtained}/{s.totalMarksPossible}</p>
                                  </div>
                                </div>
                                {si < group.summaries.length - 1 && (
                                  <div className="flex flex-col items-center justify-center shrink-0 text-2xl select-none">🤝</div>
                                )}
                              </>
                            ))}
                          </div>
                          {/* Shared stats */}
                          <div className="mt-4 rounded-2xl bg-[#fff7e6] p-3 text-center">
                            <p className="text-xs uppercase tracking-[0.2em] text-[#9a5b00]">Joint Average</p>
                            <p className="mt-1 text-xl font-black text-[#9a5b00]">{pct}%</p>
                          </div>
                        </div>
                      ) : (
                        // Single student card
                        <div>
                          <div className="mt-5 flex items-center gap-4">
                            <img
                              src={group.summaries[0].student.image || '/sunrise-logo.png'}
                              alt={group.summaries[0].student.name}
                              className="h-20 w-20 rounded-2xl object-cover object-top border border-slate-200 bg-slate-50"
                              onError={(e) => { e.currentTarget.src = '/sunrise-logo.png'; }}
                            />
                            <div>
                              <h3 className="text-xl font-bold text-[#0f2a5c]">{group.summaries[0].student.name}</h3>
                              <p className="text-sm text-slate-500">{group.summaries[0].student.className}</p>
                              <p className="mt-2 text-sm text-slate-600">
                                {group.summaries[0].totalMarksObtained}/{group.summaries[0].totalMarksPossible} marks
                              </p>
                            </div>
                          </div>
                          <div className="mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-[#f8fbff] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Tests</p>
                              <p className="mt-1 text-xl font-black text-[#0f2a5c]">{group.summaries[0].testCount}</p>
                            </div>
                            <div className="rounded-2xl bg-[#fff7e6] p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-[#9a5b00]">Average</p>
                              <p className="mt-1 text-xl font-black text-[#9a5b00]">{pct}%</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-slate-500">
                Abhi is month ke Class {selectedClass} test marks upload nahi hue hain. Admin panel se marks add hote hi top 3 yahan dikh jayenge.
              </div>
            )}
          </div>

          <div className="mt-14 rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0f2a5c]">All Students Test Marks</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Sabhi students ke marks table view mein dekhiye. Aage scroll karke pichle tests bhi dekh sakte hain.
                </p>
              </div>

              <label className="relative block w-full max-w-md">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by student name or class"
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none focus:border-[#f5a623] focus:ring-2 focus:ring-[#f5a623]/20"
                />
              </label>
            </div>

            {data.students.length === 0 ? (
              <div className="mt-8 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <BookOpen className="mx-auto text-[#f5a623]" size={28} />
                <h3 className="mt-3 text-lg font-bold text-[#0f2a5c]">No student data yet</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Admin panel se students add kijiye aur daily test marks upload kijiye. Public results yahin automatically update honge.
                </p>
              </div>
            ) : filteredStudents.length === 0 ? (
               <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
                  Koi matching student nahi mila.
               </div>
            ) : (
              <div ref={tableContainerRef} className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm relative scroll-smooth">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[#f8fbff] text-[#0f2a5c]">
                    <tr>
                      <th className="sticky left-0 z-20 bg-[#f8fbff] px-3 py-3 sm:px-6 sm:py-4 font-bold border-b border-slate-200 w-[140px] min-w-[140px] max-w-[140px] sm:w-[250px] sm:min-w-[250px] sm:max-w-[250px]">
                        Student Details
                      </th>
                      <th className="sticky left-[140px] sm:left-[250px] z-20 px-2 py-3 sm:px-6 sm:py-4 font-bold border-b border-r border-slate-200 bg-[#f8fbff] text-center w-[70px] min-w-[70px] max-w-[70px] sm:w-[100px] sm:min-w-[100px] sm:max-w-[100px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs sm:text-sm">
                        Total %
                      </th>
                      {uniqueTests.map((test, i) => (
                        <th key={i} className="px-3 py-3 sm:px-6 sm:py-4 font-semibold border-b border-slate-200 bg-[#f8fbff] w-[120px] min-w-[120px] max-w-[120px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px]">
                          <div className="flex flex-col items-center">
                            <span className="text-[#0f2a5c] font-bold text-xs sm:text-sm truncate w-full text-center">{test.testName}</span>
                            <span className="text-[10px] sm:text-xs text-slate-500">{new Date(test.testDate).toLocaleDateString('en-IN')}</span>
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-[#9a5b00] mt-1 truncate w-full text-center">{test.subject}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStudents.map((summary) => (
                      <tr key={summary.student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 border-slate-200 w-[140px] min-w-[140px] max-w-[140px] sm:w-[250px] sm:min-w-[250px] sm:max-w-[250px]">
                          <div className="flex items-center gap-2 sm:gap-3 truncate">
                            <img
                              src={summary.student.image || '/sunrise-logo.png'}
                              alt={summary.student.name}
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover object-top border border-slate-200 bg-slate-50 shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = '/sunrise-logo.png';
                              }}
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-[#0f2a5c] truncate text-xs sm:text-sm">{summary.student.name}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-500">{summary.student.className}</p>
                                  <button
                                    onClick={() => {
                                      const chartData = summary.allTests
                                        .sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime())
                                        .map((t, idx) => ({
                                          testNumber: idx + 1,
                                          date: new Date(t.testDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                                          percentage: Math.round((t.marksObtained / t.totalMarks) * 100)
                                        }));
                                      setSelectedStudentForChart({ name: summary.student.name, data: chartData });
                                    }}
                                    className="text-[#f5a623] hover:text-[#e09010] bg-[#fff8e8] hover:bg-[#ffe2ae] p-1 rounded transition-colors"
                                    title="View Progress Chart"
                                  >
                                    <TrendingUp size={12} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const hwRecord = homeworkData.find(h => h.id === summary.student.id)?.homework;
                                      const attStat = attendanceStats[summary.student.id];
                                      
                                      const currentMonth = selectedMonth || monthLabel;
                                      
                                      const pdfTestResults = summary.allTests
                                        .filter(t => {
                                          const d = new Date(t.testDate);
                                          const rMonth = d.toLocaleString('default', { month: 'long' }) + ' ' + d.getFullYear();
                                          return rMonth === currentMonth;
                                        })
                                        .map(t => ({
                                          testDate: t.testDate,
                                          subject: t.testName,
                                          totalMarks: t.totalMarks,
                                          obtainedMarks: t.marksObtained,
                                          rank: summary.rank // Global rank for month
                                        }));
                                      
                                      await generateStudentRankCardPDF(
                                        summary.student.name,
                                        summary.student.className,
                                        currentMonth,
                                        pdfTestResults,
                                        attStat || null,
                                        hwRecord ? { completedPages: hwRecord.completedPages, targetPages: hwRecord.targetPages } : null
                                      );
                                    }}
                                    className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-1 rounded transition-colors ml-1"
                                    title={`Download ${selectedMonth || monthLabel} Rank Card`}
                                  >
                                    <Download size={12} />
                                  </button>
                                {attendanceStats[summary.student.id] && attendanceStats[summary.student.id].history.length > 0 && (
                                  <div className="flex gap-[2px] ml-1" title={`Monthly Attendance: ${attendanceStats[summary.student.id].percentage}%`}>
                                    {attendanceStats[summary.student.id].history.slice(-7).map((record, i) => (
                                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${record.status === 'present' ? 'bg-green-500' : record.status === 'holiday' ? 'bg-yellow-400' : 'bg-red-500'}`} title={`${record.date}: ${record.status}`} />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="sticky left-[140px] sm:left-[250px] z-10 bg-white group-hover:bg-slate-50 px-2 py-3 sm:px-6 sm:py-4 text-center font-bold text-[#9a5b00] border-r border-slate-200 w-[70px] min-w-[70px] max-w-[70px] sm:w-[100px] sm:min-w-[100px] sm:max-w-[100px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs sm:text-sm">
                          {summary.percentage}%
                        </td>
                        {uniqueTests.map((test, i) => {
                          const result = summary.allTests.find((r) => {
                            return r.testName.trim() === test.testName.trim();
                          });
                          return (
                            <td key={i} className="px-3 py-3 sm:px-6 sm:py-4 text-center w-[120px] min-w-[120px] max-w-[120px] sm:w-[200px] sm:min-w-[200px] sm:max-w-[200px]">
                              {result ? (
                                <div>
                                  <span className="font-semibold text-slate-800 text-base">{result.marksObtained}</span>
                                  <span className="text-slate-400 text-xs">/{result.totalMarks}</span>
                                </div>
                              ) : (
                                <span className="inline-block rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-500 tracking-wide">
                                  Absent
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── ATTENDANCE & HOMEWORK PROGRESS SECTION ── */}
          {(homeworkData.some(s => s.homework) || availableMonths.length > 0 || Object.keys(attendanceStats).length > 0) && (() => {
            const firstHw = homeworkData.find(s => s.homework)?.homework;
            const target = firstHw?.targetPages ?? 0;
            const month = selectedMonth;
            
            return (
              <div className="mt-14 rounded-[2rem] border border-[#d9e5ff] bg-white/90 p-5 sm:p-7 shadow-sm">
                {/* Month Tabs */}
                {availableMonths.length > 0 && (
                  <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                    {availableMonths.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMonth(m);
                          setAttendanceViewMode('monthly');
                        }}
                        className={`rounded-full px-5 py-2 text-sm font-bold transition-all ${
                          selectedMonth === m
                            ? 'bg-[#0f2a5c] text-white shadow-md transform scale-105'
                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 hover:text-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Homework Section */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f2a5c]/10 shrink-0">
                          <BookOpen size={20} className="text-[#0f2a5c]" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#0f2a5c]">Homework Progress</h2>
                          <p className="text-xs text-slate-500">{month}</p>
                        </div>
                      </div>
                      {target > 0 && (
                        <div className="rounded-xl border border-dashed border-[#f5a623]/30 bg-[#fff8e8] px-4 py-2">
                          <p className="text-xs font-semibold text-[#9a5b00]">Monthly Target</p>
                          <p className="text-sm font-bold text-[#f5a623]">{target} Pages</p>
                        </div>
                      )}
                    </div>
                    
                    {homeworkData.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Is mahine ka koi homework record nahi hai.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {homeworkData.map(s => {
                          if (!s.homework) return null;
                          const hw = s.homework;
                          const isComplete = hw.completedPages >= hw.targetPages && hw.targetPages > 0;
                          const progress = hw.targetPages > 0 ? Math.min(100, Math.round((hw.completedPages / hw.targetPages) * 100)) : 0;
                          return (
                            <div key={s.id} className="group relative flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-[#f5a623]/30 hover:shadow-md">
                              <img src={s.image || '/sunrise-logo.png'} alt={s.name} className="h-10 w-10 shrink-0 rounded-full object-cover object-top border border-slate-200" onError={e => e.currentTarget.src = '/sunrise-logo.png'} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-slate-800">{s.name}</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <div className="h-1.5 w-full max-w-[120px] rounded-full bg-slate-100 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-[#f5a623]'}`} style={{ width: `${progress}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500">{hw.completedPages}/{hw.targetPages}</span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                {isComplete ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold text-green-600 border border-green-200">
                                    <Sparkles size={10} /> Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500 border border-slate-200">
                                    Pending
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Attendance Section */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f2a5c]/10 shrink-0">
                          <span className="text-xl">📅</span>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#0f2a5c]">Attendance Report</h2>
                          <p className="text-xs text-slate-500">{month}</p>
                        </div>
                      </div>
                      
                      {Object.keys(attendanceStats).length > 0 && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setAttendanceViewMode('monthly')}
                            className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-full transition-all ${attendanceViewMode === 'monthly' ? 'bg-[#0f2a5c] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            Monthly
                          </button>
                          <input 
                            type="date" 
                            value={selectedAttendanceDate}
                            onChange={(e) => {
                              setSelectedAttendanceDate(e.target.value);
                              setAttendanceViewMode('daily');
                            }}
                            max={new Date().toISOString().split('T')[0]}
                            className={`px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full border outline-none transition-all ${attendanceViewMode === 'daily' ? 'bg-[#0f2a5c] text-white border-[#0f2a5c] shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                          />
                        </div>
                      )}
                    </div>
                    
                    {Object.keys(attendanceStats).length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                        Is mahine ki koi attendance record nahi hai.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {classFilteredData.students.map(s => {
                          const stat = attendanceStats[s.id];
                          if (!stat || stat.history.length === 0) return null;
                          const isGood = stat.percentage >= 75;
                          return (
                            <div key={s.id} className="group relative flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-[#f5a623]/30 hover:shadow-md">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <img src={s.image || '/sunrise-logo.png'} alt={s.name} className="h-10 w-10 shrink-0 rounded-full object-cover object-top border border-slate-200" onError={e => e.currentTarget.src = '/sunrise-logo.png'} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-bold text-slate-800">{s.name}</p>
                                  {attendanceViewMode === 'monthly' ? (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                      {stat.history.map((record, i) => {
                                        const day = new Date(record.date).getDate();
                                        return (
                                          <div key={i} className={`flex flex-col items-center justify-center w-[22px] h-[24px] rounded shrink-0 transition-all ${
                                            record.status === 'present' ? 'bg-green-50 border border-green-100 hover:bg-green-100' 
                                            : record.status === 'holiday' ? 'bg-yellow-50 border border-yellow-200 hover:bg-yellow-100'
                                            : 'bg-red-50 border border-red-100 hover:bg-red-100'
                                          }`} title={`${record.date}: ${record.status}`}>
                                            <span className={`text-[8px] font-bold ${
                                              record.status === 'present' ? 'text-green-600' 
                                              : record.status === 'holiday' ? 'text-yellow-600'
                                              : 'text-red-600'
                                            }`}>{day}</span>
                                            <span className={`h-1 w-1 mt-[1px] rounded-full ${
                                              record.status === 'present' ? 'bg-green-500' 
                                              : record.status === 'holiday' ? 'bg-yellow-400'
                                              : 'bg-red-500'
                                            }`} />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (() => {
                                    const dailyRecord = stat.history.find(r => r.date === selectedAttendanceDate);
                                    const status = dailyRecord ? dailyRecord.status : null;
                                    return (
                                      <div className="mt-2">
                                        {status === 'present' ? (
                                          <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-600 border border-green-200"><span className="h-1.5 w-1.5 rounded-full bg-green-500"/> Present</span>
                                        ) : status === 'absent' ? (
                                          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600 border border-red-200"><span className="h-1.5 w-1.5 rounded-full bg-red-500"/> Absent</span>
                                        ) : status === 'holiday' ? (
                                          <span className="inline-flex items-center gap-1 rounded bg-yellow-50 px-2 py-0.5 text-[10px] font-bold text-yellow-600 border border-yellow-200"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400"/> Holiday</span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500 border border-slate-200">No Record</span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              <div className="shrink-0 text-right ml-2">
                                <div className={`text-lg font-black ${isGood ? 'text-green-600' : 'text-[#f5a623]'}`}>
                                  {stat.percentage}%
                                </div>
                                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Attendance</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {selectedStudentForChart && (
        <StudentProgressChart
          studentName={selectedStudentForChart.name}
          data={selectedStudentForChart.data}
          onClose={() => setSelectedStudentForChart(null)}
        />
      )}
    </div>
  );
}
