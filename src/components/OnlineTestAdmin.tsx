import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Edit, Save, X, Settings, List, PlayCircle, StopCircle, Users, Download, Camera, AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { 
  getAllTestsAdmin, createTestAdmin, updateTestAdmin, deleteTestAdmin,
  getQuestionsAdmin, createQuestionAdmin, deleteQuestionAdmin, getTestAttemptsAdmin, getProctoringLogsAdmin,
  resetStudentAttempt,
  OnlineTest, OnlineTestQuestion
} from '../lib/onlineTests';

export default function OnlineTestAdmin() {
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Views: 'list', 'edit-test', 'manage-questions', 'view-attempts', 'view-proctoring'
  const [view, setView] = useState<'list' | 'edit-test' | 'manage-questions' | 'view-attempts' | 'view-proctoring'>('list');
  const [currentTest, setCurrentTest] = useState<Partial<OnlineTest>>({});
  
  const [questions, setQuestions] = useState<OnlineTestQuestion[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [proctoringLogs, setProctoringLogs] = useState<any[]>([]);

  const classes = ['Class 8', 'Class 9', 'Class 10'];

  useEffect(() => {
    fetchTests();
  }, []);

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
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1
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
      setNewQuestion({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1 });
      const data = await getQuestionsAdmin(currentTest.id);
      setQuestions(data);
    } catch (err) {
      console.error(err);
      alert('Failed to add question');
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
          <button
            onClick={() => {
              setCurrentTest({ title: '', class_name: 'Class 10', subject: '', duration_minutes: 30, is_active: false });
              setView('edit-test');
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <PlusCircle className="h-4 w-4" /> Create Test
          </button>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class & Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map(test => (
                  <tr key={test.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{test.title}</div>
                      <div className="text-xs text-gray-500">{test.duration_minutes} mins</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-1">
                        {test.class_name}
                      </span>
                      <div className="text-xs">{test.subject}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => handleToggleActive(test)}
                        className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border ${
                          test.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {test.is_active ? <PlayCircle className="h-3 w-3" /> : <StopCircle className="h-3 w-3" />}
                        {test.is_active ? 'Active (Live)' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => handleViewProctoringLogs(test)} className="text-orange-600 hover:text-orange-900" title="View Proctoring Logs">
                          <Camera className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleViewAttempts(test)} className="text-green-600 hover:text-green-900" title="View Results">
                          <Users className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleManageQuestions(test)} className="text-purple-600 hover:text-purple-900" title="Manage Questions">
                          <List className="h-5 w-5" />
                        </button>
                        <button onClick={() => { setCurrentTest(test); setView('edit-test'); }} className="text-blue-600 hover:text-blue-900" title="Edit Settings">
                          <Edit className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDeleteTest(test.id)} className="text-red-600 hover:text-red-900" title="Delete Test">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {tests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      No online tests found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-blue-600" /> Add New Question
              </h3>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                    <select value={newQuestion.correct_option || 'A'} onChange={e => setNewQuestion({...newQuestion, correct_option: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                      <option value="A">Option A</option>
                      <option value="B">Option B</option>
                      <option value="C">Option C</option>
                      <option value="D">Option D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                    <input type="number" min="1" required value={newQuestion.marks || 1} onChange={e => setNewQuestion({...newQuestion, marks: parseInt(e.target.value)})} className="w-full px-3 py-2 border rounded-md" />
                  </div>
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
              <button 
                onClick={handleDownloadRankCard}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" /> Download Rank Card
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cheat Warnings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted At</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attempts.map(att => (
                    <tr key={att.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{att.students?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{att.students?.class_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-blue-600">{att.score}</span> <span className="text-xs text-gray-500">/ {att.total_marks}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {att.cheat_warnings > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            {att.cheat_warnings} Warnings
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Clean</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(att.submitted_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleResetAttempt(att.student_id, att.students?.name || 'Unknown')}
                          title="Reset attempt — student can retake"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 hover:border-orange-400 transition-all"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Reset
                        </button>
                      </td>
                    </tr>
                  ))}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No students have attempted this test yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                      <div className="relative aspect-video bg-gray-900 group">
                        <img 
                          src={log.proof_image_url} 
                          alt="Proctoring Proof" 
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10"></div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                        <Camera className="h-8 w-8 opacity-20" />
                        <span className="ml-2 text-sm font-medium">No Image Uploaded</span>
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
