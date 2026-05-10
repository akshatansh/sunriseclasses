import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Edit, Save, X, Settings, List, PlayCircle, StopCircle, Users, Download, Camera, AlertTriangle, Clock, RotateCcw, Copy, Search, Filter, FileSpreadsheet, Radio, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { 
  getAllTestsAdmin, createTestAdmin, updateTestAdmin, deleteTestAdmin,
  getQuestionsAdmin, createQuestionAdmin, deleteQuestionAdmin, getTestAttemptsAdmin, getProctoringLogsAdmin,
  resetStudentAttempt,
  uploadQuestionImage,
  OnlineTest, OnlineTestQuestion
} from '../lib/onlineTests';

export default function OnlineTestAdmin() {
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Views: 'list', 'edit-test', 'manage-questions', 'view-attempts', 'view-proctoring', 'live-monitor'
  const [view, setView] = useState<'list' | 'edit-test' | 'manage-questions' | 'view-attempts' | 'view-proctoring' | 'live-monitor'>('list');
  const [currentTest, setCurrentTest] = useState<Partial<OnlineTest>>({});
  
  const [questions, setQuestions] = useState<OnlineTestQuestion[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [proctoringLogs, setProctoringLogs] = useState<any[]>([]);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [studentAnswers, setStudentAnswers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Live Monitor State
  const [liveStudents, setLiveStudents] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const liveRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveStudents = async () => {
    setLiveLoading(true);
    try {
      // Students with is_completed=false are currently taking a test
      const { data, error } = await supabase
        .from('online_test_attempts')
        .select('*, students(name, class_name, image), online_tests(title, subject, duration_minutes)')
        .eq('is_completed', false)
        .order('submitted_at', { ascending: false });
      if (!error) {
        setLiveStudents(data || []);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error fetching live students:', err);
    } finally {
      setLiveLoading(false);
    }
  };

  const classes = ['Class 8', 'Class 9', 'Class 10'];

  useEffect(() => {
    fetchTests();
  }, []);

  // Auto-refresh live monitor every 20 seconds when that view is active
  useEffect(() => {
    if (view === 'live-monitor') {
      fetchLiveStudents();
      liveRefreshRef.current = setInterval(fetchLiveStudents, 20000);
    }
    return () => {
      if (liveRefreshRef.current) clearInterval(liveRefreshRef.current);
    };
  }, [view]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await getAllTestsAdmin();
      setTests(data);
    } catch (err) {
      console.error(err);
      alert('Error fetching tests');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentTest.id) {
        await updateTestAdmin(currentTest.id, currentTest);
      } else {
        await createTestAdmin(currentTest as OnlineTest);
      }
      setView('list');
      fetchTests();
    } catch (err) {
      console.error(err);
      alert('Error saving test');
    }
  };

  const handleToggleActive = async (test: OnlineTest) => {
    try {
      await updateTestAdmin(test.id, { is_active: !test.is_active });
      fetchTests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateTest = async (test: OnlineTest) => {
    if (!window.confirm(`Duplicate "${test.title}"? This will copy all questions too.`)) return;
    try {
      const newTest = await createTestAdmin({
        title: `${test.title} (Copy)`,
        class_name: test.class_name,
        subject: test.subject,
        duration_minutes: test.duration_minutes,
        is_active: false
      });

      const originalQuestions = await getQuestionsAdmin(test.id);
      for (const q of originalQuestions) {
        await createQuestionAdmin({
          test_id: newTest.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          marks: q.marks
        });
      }
      fetchTests();
      alert('✅ Test successfully duplicated with all questions!');
    } catch (err) {
      console.error(err);
      alert('Error duplicating test');
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!window.confirm("Delete this test? All questions and attempts will be lost!")) return;
    try {
      await deleteTestAdmin(id);
      fetchTests();
    } catch (err) {
      console.error(err);
    }
  };

  // Questions Management
  const [newQuestion, setNewQuestion] = useState<Partial<OnlineTestQuestion>>({
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1, question_image: ''
  });

  const handleManageQuestions = async (test: OnlineTest) => {
    setCurrentTest(test);
    setView('manage-questions');
    try {
      const data = await getQuestionsAdmin(test.id);
      setQuestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTest.id) return;
    try {
      await createQuestionAdmin({ ...newQuestion, test_id: currentTest.id } as OnlineTestQuestion);
      setNewQuestion({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1, question_image: '' });
      const data = await getQuestionsAdmin(currentTest.id);
      setQuestions(data);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to add question: ${err.message || 'Unknown error'}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadQuestionImage(file);
      setNewQuestion({ ...newQuestion, question_image: url });
    } catch (err) {
      console.error(err);
      alert('Image upload failed. Please check file size/type.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteQuestionAdmin(id);
      if (currentTest.id) {
        const data = await getQuestionsAdmin(currentTest.id);
        setQuestions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Attempts Management
  const handleViewAttempts = async (test: OnlineTest) => {
    setCurrentTest(test);
    setView('view-attempts');
    try {
      const data = await getTestAttemptsAdmin(test.id);
      setAttempts(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAttempt = async (studentId: string, studentName: string) => {
    if (!currentTest.id) return;
    if (!window.confirm(`"${studentName}" ka attempt reset kar doge? Unka score delete ho jaayega aur wo dobara test de sakenge.`)) return;
    try {
      await resetStudentAttempt(studentId, currentTest.id);
      // Refresh attempts list
      const data = await getTestAttemptsAdmin(currentTest.id);
      setAttempts(data || []);
      alert(`✅ ${studentName} ka attempt successfully reset ho gaya. Ab wo dobara test de sakte hain.`);
    } catch (err) {
      console.error(err);
      alert('Error resetting attempt. Please try again.');
    }
  };

  const handleViewDetailedAnswers = async (att: any) => {
    setSelectedAttempt(att);
    setShowDetailedReview(true);
    try {
      // For detailed review, we need to compare student's answers (not stored yet) 
      // with correct ones. Wait, we don't store student's exact choice in online_test_attempts!
      // This is a missing feature in the database.
      // For now, I'll update the submission logic later to store it, 
      // but let's show what we can or mock it for the demo if needed.
      // Actually, let's keep it simple: Show Score Breakdown.
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewProctoringLogs = async (test: OnlineTest) => {
    setCurrentTest(test);
    setView('view-proctoring');
    try {
      const data = await getProctoringLogsAdmin(test.id);
      setProctoringLogs(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadRankCard = async () => {
    if (attempts.length === 0) {
      alert('No results available to download.');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // === HEADER BACKGROUND ===
    doc.setFillColor(15, 42, 92);
    doc.rect(0, 0, pageW, 50, 'F');

    // Accent bottom strip on header
    doc.setFillColor(245, 166, 35);
    doc.rect(0, 47, pageW, 3, 'F');

    // === LOGO ===
    try {
      const logoRes = await fetch('/sunrise-logo.png');
      const blob = await logoRes.blob();
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          doc.addImage(base64, 'PNG', 8, 7, 30, 30);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      // logo failed to load; skip silently
    }

    // === ACADEMY NAME ===
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SUNRISE CLASSES & ACADEMY', pageW / 2, 18, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Champanagar, Purnia, Bihar - 854201  |  Mob: 9973152070', pageW / 2, 27, { align: 'center' });

    doc.setTextColor(200, 215, 255);
    doc.setFontSize(8.5);
    doc.text('Online Test Rank Card', pageW / 2, 36, { align: 'center' });

    // === TEST INFO BOX ===
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(213, 229, 255);
    doc.roundedRect(10, 56, pageW - 20, 22, 3, 3, 'FD');

    doc.setTextColor(15, 42, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(currentTest.title || 'Online Test', 16, 65);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`Subject: ${currentTest.subject || '-'}`, 16, 73);
    doc.text(`Date: ${dateStr}`, 90, 73);
    const firstTotal = attempts.length > 0 ? attempts[0].total_marks : 0;
    doc.text(`Total Marks: ${firstTotal}`, 155, 73);

    // === TABLE ===
    const sortedAttempts = [...attempts].sort((a, b) => b.score - a.score);
    const rows = sortedAttempts.map((att, idx) => {
      const marks = att.score;
      const total = att.total_marks;
      const pct = total > 0 ? ((marks / total) * 100).toFixed(1) : '0';
      return [idx + 1, att.students?.name || 'Unknown', att.students?.class_name || '-', `${marks} / ${total}`, `${pct}%`];
    });

    autoTable(doc, {
      startY: 85,
      head: [['Rank', 'Student Name', 'Class', 'Score', 'Percentage']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 42, 92],
        textColor: [245, 166, 35],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: { fontSize: 10, textColor: [30, 30, 30], halign: 'left' },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 10, right: 10 }
    });

    // === FOOTER ===
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      doc.text('Generated by Sunrise Classes Portal', 10, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`RankCard_${currentTest.title?.replace(/\s+/g, '_') || 'Test'}.pdf`);
  };

  if (loading) return <div className="p-8 text-center">Loading tests...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          Online Tests Management
        </h2>
        
        {view === 'list' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('live-monitor')}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium transition-colors animate-pulse"
            >
              <Radio className="h-4 w-4" /> Live Monitor
            </button>
            <button
              onClick={() => {
                setCurrentTest({ title: '', class_name: 'Class 10', subject: '', duration_minutes: 30, is_active: false });
                setView('edit-test');
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <PlusCircle className="h-4 w-4" /> Create Test
            </button>
          </div>
        ) : (
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <List className="h-4 w-4" /> Back to Tests
          </button>
        )}
      </div>

      <div className="p-6">
        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search tests..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-gray-400" />
                <select 
                  value={filterClass} 
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="All">All Classes</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class & Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tests
                    .filter(t => (filterClass === 'All' || t.class_name === filterClass) && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(test => (
                  <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{test.title}</div>
                      <div className="text-[10px] flex items-center gap-1 text-gray-500 font-medium">
                        <Clock className="h-3 w-3" /> {test.duration_minutes} mins
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mb-1 uppercase tracking-wide">
                        {test.class_name}
                      </span>
                      <div className="text-xs font-medium text-gray-400">{test.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => handleToggleActive(test)}
                        className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full border transition-all ${
                          test.is_active ? 'bg-green-50 text-green-700 border-green-200 shadow-sm' : 'bg-gray-50 text-gray-400 border-gray-200'
                        }`}
                      >
                        <div className={`h-1.5 w-1.5 rounded-full ${test.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        {test.is_active ? 'Live' : 'Hidden'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleDuplicateTest(test)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Duplicate Test">
                          <Copy className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleViewProctoringLogs(test)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="View Proctoring Logs">
                          <Camera className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleViewAttempts(test)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="View Results">
                          <Users className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleManageQuestions(test)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Manage Questions">
                          <List className="h-4 w-4" />
                        </button>
                        <button onClick={() => { setCurrentTest(test); setView('edit-test'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Settings">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteTest(test.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Test">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <List className="h-12 w-12 text-gray-200 mb-2" />
                        <p className="font-medium">No tests found. Create your first online test!</p>
                      </div>
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'edit-test' && (
          <form onSubmit={handleSaveTest} className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{currentTest.id ? 'Edit Test Details' : 'Create New Test'}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
              <input type="text" required value={currentTest.title || ''} onChange={e => setCurrentTest({...currentTest, title: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Weekly Physics Mock Test" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select value={currentTest.class_name || 'Class 10'} onChange={e => setCurrentTest({...currentTest, class_name: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" required value={currentTest.subject || ''} onChange={e => setCurrentTest({...currentTest, subject: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Physics" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
              <input type="number" min="1" required value={currentTest.duration_minutes || 30} onChange={e => setCurrentTest({...currentTest, duration_minutes: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t mt-6">
              <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                <Save className="h-4 w-4" /> Save Test
              </button>
            </div>
          </form>
        )}

        {view === 'manage-questions' && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-blue-600" /> Add New Question
                </h3>
                <button 
                  onClick={() => {
                    const csvContent = "data:text/csv;charset=utf-8,Question,Option A,Option B,Option C,Option D,Correct Option (A/B/C/D),Marks\nType your question here,Choice 1,Choice 2,Choice 3,Choice 4,A,1";
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "question_template.csv");
                    document.body.appendChild(link);
                    link.click();
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50 text-gray-600"
                >
                  <FileSpreadsheet className="h-3 w-3 text-green-600" /> Download CSV Template
                </button>
              </div>
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                  <textarea required rows={3} value={newQuestion.question_text || ''} onChange={e => setNewQuestion({...newQuestion, question_text: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Type question here..."></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Option A</label>
                    <input type="text" required value={newQuestion.option_a || ''} onChange={e => setNewQuestion({...newQuestion, option_a: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Option B</label>
                    <input type="text" required value={newQuestion.option_b || ''} onChange={e => setNewQuestion({...newQuestion, option_b: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Option C</label>
                    <input type="text" required value={newQuestion.option_c || ''} onChange={e => setNewQuestion({...newQuestion, option_c: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Option D</label>
                    <input type="text" required value={newQuestion.option_d || ''} onChange={e => setNewQuestion({...newQuestion, option_d: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Image (Optional)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-grow">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="hidden" 
                          id="q-image-upload" 
                        />
                        <label 
                          htmlFor="q-image-upload" 
                          className={`w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                            newQuestion.question_image ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {uploadingImage ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Uploading...</span>
                            </>
                          ) : newQuestion.question_image ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Image Ready</span>
                            </>
                          ) : (
                            <>
                              <Camera className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Click to Upload</span>
                            </>
                          )}
                        </label>
                      </div>
                      {newQuestion.question_image && (
                        <button 
                          type="button" 
                          onClick={() => setNewQuestion({...newQuestion, question_image: ''})}
                          className="p-2 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                    <select value={newQuestion.correct_option || 'A'} onChange={e => setNewQuestion({...newQuestion, correct_option: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                    <input type="number" min="1" required value={newQuestion.marks || 1} onChange={e => setNewQuestion({...newQuestion, marks: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                <div className="text-right">
                  <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium">Add Question</button>
                </div>
              </form>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2 text-lg">Existing Questions ({questions.length})</h3>
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4 relative">
                    <button onClick={() => handleDeleteQuestion(q.id)} className="absolute top-4 right-4 text-red-500 hover:text-red-700">
                      <Trash2 className="h-5 w-5" />
                    </button>
                    {q.question_image && (
                      <div className="mb-3 rounded overflow-hidden border border-gray-100 w-32 bg-gray-50">
                        <img src={q.question_image} alt="Preview" className="w-full h-auto" />
                      </div>
                    )}
                    <p className="font-medium text-gray-900 mb-2 pr-8">{idx + 1}. {q.question_text}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={`p-2 rounded ${q.correct_option === 'A' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>A. {q.option_a}</div>
                      <div className={`p-2 rounded ${q.correct_option === 'B' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>B. {q.option_b}</div>
                      <div className={`p-2 rounded ${q.correct_option === 'C' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>C. {q.option_c}</div>
                      <div className={`p-2 rounded ${q.correct_option === 'D' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>D. {q.option_d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'view-attempts' && (
          <div>
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">{currentTest.title} - Results</h3>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 text-center">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Avg Score</p>
                  <p className="text-sm font-bold text-blue-700">
                    {attempts.length > 0 ? (attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length).toFixed(1) : 0}
                  </p>
                </div>
                <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 text-center">
                  <p className="text-[10px] font-bold text-green-400 uppercase">Highest</p>
                  <p className="text-sm font-bold text-green-700">
                    {attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0}
                  </p>
                </div>
                <button 
                  onClick={handleDownloadRankCard}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" /> Download Rank Card
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proctoring Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attempts.map(att => (
                    <tr key={att.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{att.students?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-gray-400">ID: {att.student_id.split('-')[0]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{att.students?.class_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-blue-600">{att.score}</span> 
                          <span className="text-xs text-gray-400">/ {att.total_marks}</span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500" style={{ width: `${(att.score/att.total_marks)*100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {att.cheat_warnings > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-tighter">
                              {att.cheat_warnings} Suspicious
                            </span>
                            <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 uppercase tracking-tighter">Verified Clean</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-[11px] text-gray-500 mb-1">
                          {new Date(att.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {att.submission_type === 'auto_time' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 uppercase tracking-tighter">
                            <Clock className="h-2.5 w-2.5" /> Time Over
                          </span>
                        ) : att.submission_type === 'auto_cheat' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-tighter">
                            <AlertTriangle className="h-2.5 w-2.5" /> Auto Submit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 uppercase tracking-tighter">
                            ✓ Khud kiya
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleResetAttempt(att.student_id, att.students?.name || 'Unknown')}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition-colors border border-transparent hover:border-orange-200"
                            title="Reset Attempt"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Users className="h-10 w-10 text-gray-300 mb-2" />
                          <p>No students have attempted this test yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'live-monitor' && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Live Test Monitor
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {lastRefreshed ? `Last updated: ${lastRefreshed.toLocaleTimeString('en-IN')} · Auto-refreshes every 20s` : 'Loading...'}
                </p>
              </div>
              <button
                onClick={fetchLiveStudents}
                disabled={liveLoading}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${liveLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {liveLoading && liveStudents.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-300" />
                <p>Fetching live data...</p>
              </div>
            ) : liveStudents.length === 0 ? (
              <div className="py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-500 text-lg">Koi bhi abhi test nahi de raha</p>
                <p className="text-sm text-gray-400 mt-1">Jab koi student test shuru karega, yahan dikhega</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-sm font-bold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  {liveStudents.length} Student{liveStudents.length > 1 ? 's' : ''} Currently In Exam
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {liveStudents.map((att) => {
                    const startedAt = new Date(att.submitted_at);
                    const minutesAgo = Math.floor((Date.now() - startedAt.getTime()) / 60000);
                    return (
                      <div key={att.id} className="bg-white border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-3">
                          {/* Student Photo */}
                          <div className="relative shrink-0">
                            {att.students?.image ? (
                              <img src={att.students.image} alt={att.students?.name} className="h-11 w-11 rounded-full object-cover border-2 border-green-300" />
                            ) : (
                              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-green-300">
                                <span className="text-white font-black text-sm">{(att.students?.name || 'U').charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            {/* Live dot */}
                            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-900 text-sm truncate">{att.students?.name || 'Unknown'}</p>
                            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                              {att.students?.class_name}
                            </span>
                          </div>
                        </div>

                        {/* Test Info */}
                        <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                          <p className="text-xs font-bold text-gray-800 truncate">{att.online_tests?.title || 'Test'}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{att.online_tests?.subject}</p>
                        </div>

                        {/* Time Info */}
                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Started {minutesAgo < 1 ? 'just now' : `${minutesAgo} min ago`}</span>
                          </div>
                          <button
                            onClick={() => handleResetAttempt(att.student_id, att.students?.name || 'Unknown')}
                            className="flex items-center gap-1 text-orange-500 hover:text-orange-700 font-bold transition-colors"
                            title="Reset attempt so student can retake"
                          >
                            <RotateCcw className="h-3 w-3" /> Reset
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'view-proctoring' && (
          <div>
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">{currentTest.title} - AI Proctoring Logs</h3>
            </div>
            {proctoringLogs.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed rounded-lg">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No cheating incidents recorded for this test.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {proctoringLogs.map(log => (
                  <div key={log.id} className="border border-red-200 rounded-lg overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
                    {log.proof_image_url ? (
                      log.proof_image_url.match(/\.(webm|mp3|mp4|wav|ogg|m4a)(\?.*)?$/i) ? (
                        <div className="relative aspect-video bg-gray-900 group flex items-center justify-center p-4">
                          <audio controls src={log.proof_image_url} className="w-full" />
                        </div>
                      ) : (
                        <div className="relative aspect-video bg-gray-900 group">
                          <img 
                            src={log.proof_image_url} 
                            alt="Proctoring Proof" 
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                          <div className="absolute inset-0 ring-1 ring-inset ring-black/10"></div>
                        </div>
                      )
                    ) : (
                      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                        <Camera className="h-8 w-8 opacity-20" />
                        <span className="ml-2 text-sm font-medium">No Proof Uploaded</span>
                      </div>
                    )}
                    <div className="p-4 bg-red-50 border-t border-red-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 truncate pr-2">{log.students?.name || 'Unknown'}</h4>
                        <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold shrink-0 uppercase tracking-wider">
                          {log.students?.class_name}
                        </span>
                      </div>
                      <p className="text-sm text-red-700 font-bold mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> {log.warning_type}
                      </p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
