import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, FileText, ZoomIn, ZoomOut, Save, Send, ArrowLeft, Clock, User, Award, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MathRenderer from './MathRenderer';

interface SubjectiveGradingPortalProps {
  onBack: () => void;
}

export const SubjectiveGradingPortal: React.FC<SubjectiveGradingPortalProps> = ({ onBack }) => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [questionNotes, setQuestionNotes] = useState<Record<string, string>>({});
  const [overallRemarks, setOverallRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSubjectiveAttempts();
  }, []);

  const fetchSubjectiveAttempts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('online_test_attempts')
        .select('*, students(name, class_name, image), online_tests(title, subject, total_marks)')
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (err) {
      console.error('Error fetching subjective attempts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAttempt = async (attempt: any) => {
    setSelectedAttempt(attempt);
    setOverallRemarks(attempt.teacher_remarks || '');
    setLoading(true);

    try {
      // Fetch questions for this test
      const { data: qData } = await supabase
        .from('online_test_questions')
        .select('*')
        .eq('test_id', attempt.test_id)
        .order('created_at', { ascending: true });

      setQuestions(qData || []);

      // Parse existing evaluations if any
      const subjAns = attempt.subjective_answers || {};
      const marksMap: Record<string, number> = {};
      const notesMap: Record<string, string> = {};

      (qData || []).forEach((q: any) => {
        if (subjAns[q.id]) {
          marksMap[q.id] = subjAns[q.id].marks_awarded ?? 0;
          notesMap[q.id] = subjAns[q.id].teacher_note || '';
        } else {
          marksMap[q.id] = 0;
          notesMap[q.id] = '';
        }
      });

      setQuestionMarks(marksMap);
      setQuestionNotes(notesMap);
    } catch (err) {
      console.error('Error loading questions for evaluation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvaluation = async () => {
    if (!selectedAttempt) return;
    setIsSaving(true);
    setMessage('');

    try {
      // Calculate total marks awarded
      let totalAwarded = 0;
      const updatedSubjAns = { ...(selectedAttempt.subjective_answers || {}) };

      questions.forEach((q) => {
        const marks = Number(questionMarks[q.id] || 0);
        totalAwarded += marks;

        updatedSubjAns[q.id] = {
          ...(updatedSubjAns[q.id] || {}),
          marks_awarded: marks,
          teacher_note: questionNotes[q.id] || '',
        };
      });

      const { error } = await supabase
        .from('online_test_attempts')
        .update({
          score: totalAwarded,
          subjective_answers: updatedSubjAns,
          teacher_remarks: overallRemarks,
          evaluation_status: 'evaluated',
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', selectedAttempt.id);

      if (error) throw error;

      setMessage('✅ Test evaluation saved & published successfully!');
      fetchSubjectiveAttempts();
      setTimeout(() => setSelectedAttempt(null), 1500);
    } catch (err: any) {
      console.error('Error saving evaluation:', err);
      setMessage(`❌ Failed to save: ${err.message || 'Error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white p-4 md:p-6">
      {/* Header Bar */}
      <div className="max-w-7xl mx-auto flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-slate-800">
        <button
          onClick={selectedAttempt ? () => setSelectedAttempt(null) : onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 hover:bg-gray-100 border border-gray-300 dark:border-slate-700 rounded-xl text-sm font-semibold transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> {selectedAttempt ? 'Back to Submissions List' : 'Back to Dashboard'}
        </button>
        <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          📝 Subjective Test Checking & Evaluation Portal
        </h1>
      </div>

      <div className="max-w-7xl mx-auto">
        {!selectedAttempt ? (
          /* List of Student Submissions */
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" /> Student Submissions List ({attempts.length})
            </h2>

            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading student answer sheets...</div>
            ) : attempts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No test submissions found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {attempts.map((att) => (
                  <div
                    key={att.id}
                    onClick={() => handleSelectAttempt(att)}
                    className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                          {att.students?.name?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{att.students?.name}</h3>
                          <span className="text-xs text-gray-500">{att.students?.class_name}</span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full ${
                        att.evaluation_status === 'evaluated'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                      }`}>
                        {att.evaluation_status === 'evaluated' ? 'Checked' : 'Needs Checking'}
                      </span>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-slate-400 space-y-1 pt-2 border-t border-gray-100 dark:border-slate-700/50">
                      <div><strong>Test:</strong> {att.online_tests?.title} ({att.online_tests?.subject})</div>
                      <div><strong>Submitted:</strong> {new Date(att.submitted_at).toLocaleDateString()} at {new Date(att.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div><strong>Score:</strong> <span className="font-bold text-blue-600">{att.score ?? 0}</span> / {att.total_marks || 100}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Detailed Evaluation & Checking Form */
          <div className="space-y-6">
            {/* Student Info Banner */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500 text-white font-bold text-lg flex items-center justify-center">
                  {selectedAttempt.students?.name?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{selectedAttempt.students?.name}</h2>
                  <p className="text-xs text-gray-500">{selectedAttempt.students?.class_name} • Test: {selectedAttempt.online_tests?.title}</p>
                </div>
              </div>

              <button
                onClick={handleSaveEvaluation}
                disabled={isSaving}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Publish Checked Evaluation'}
              </button>
            </div>

            {message && (
              <div className={`p-4 rounded-xl text-sm font-semibold ${
                message.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message}
              </div>
            )}

            {/* Per-Question Answer Sheet Checking */}
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const ansData = selectedAttempt.subjective_answers?.[q.id] || {};
                return (
                  <div key={q.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-slate-700 pb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Question {idx + 1} ({q.marks || 5} Marks)</span>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
                          <MathRenderer text={q.question_text} />
                        </h3>
                      </div>
                      
                      {/* Marks Input */}
                      <div className="flex items-center gap-2 bg-blue-50 dark:bg-slate-900 p-2 rounded-xl border border-blue-200 dark:border-slate-700">
                        <label className="text-xs font-bold text-gray-700 dark:text-slate-300">Marks Awarded:</label>
                        <input
                          type="number"
                          max={q.marks || 5}
                          min={0}
                          value={questionMarks[q.id] ?? 0}
                          onChange={(e) => setQuestionMarks({ ...questionMarks, [q.id]: Math.min(q.marks || 5, Math.max(0, Number(e.target.value))) })}
                          className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-center font-bold text-sm"
                        />
                        <span className="text-xs text-gray-500 font-bold">/ {q.marks || 5}</span>
                      </div>
                    </div>

                    {/* Student Uploaded Answer Sheet / Typed Response */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Student's Handwritten Answer Copy</h4>
                        {ansData.image_url ? (
                          <div className="relative group border border-slate-700 rounded-xl overflow-hidden bg-black max-h-96 flex items-center justify-center">
                            <img src={ansData.image_url} alt="Student Copy" className="max-h-96 object-contain" />
                            <a
                              href={ansData.image_url}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1 backdrop-blur"
                            >
                              <ZoomIn className="w-4 h-4" /> Full View
                            </a>
                          </div>
                        ) : ansData.text_answer ? (
                          <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-mono whitespace-pre-wrap">
                            <MathRenderer text={ansData.text_answer} />
                          </div>
                        ) : (
                          <div className="p-6 bg-gray-50 dark:bg-slate-900 rounded-xl text-center text-xs text-gray-400">
                            No answer uploaded for this question.
                          </div>
                        )}
                      </div>

                      {/* Teacher Specific Correction Remark Input */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> Teacher Correction Comment & Mistake Highlight
                        </h4>
                        <textarea
                          rows={4}
                          placeholder="e.g. Step 2 calculation error in formula. 1 mark deducted."
                          value={questionNotes[q.id] || ''}
                          onChange={(e) => setQuestionNotes({ ...questionNotes, [q.id]: e.target.value })}
                          className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Overall Remarks Box */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 space-y-3">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-500" /> Overall Performance Remarks for Student & Parent Report
              </h3>
              <textarea
                rows={3}
                placeholder="e.g. Good attempt! Focus on step-by-step mathematical proofs and trigonometry formulas."
                value={overallRemarks}
                onChange={(e) => setOverallRemarks(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubjectiveGradingPortal;
