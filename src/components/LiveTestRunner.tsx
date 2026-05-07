import React, { useState, useEffect, useCallback } from 'react';
import { OnlineTest, OnlineTestQuestion, getTestQuestions, submitTest } from '../lib/onlineTests';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert } from 'lucide-react';

interface Props {
  test: OnlineTest;
  studentId: string;
  onComplete: () => void;
}

export default function LiveTestRunner({ test, studentId, onComplete }: Props) {
  const [questions, setQuestions] = useState<OnlineTestQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(test.duration_minutes * 60);
  
  // Anti-Cheat State
  const [cheatWarnings, setCheatWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  
  // Results State
  const [result, setResult] = useState<{ score: number, total: number } | null>(null);

  const finishTest = useCallback(async (forced: boolean = false) => {
    if (submitting || result) return;
    setSubmitting(true);
    
    try {
      const finalResult = await submitTest(
        { 
          student_id: studentId, 
          test_id: test.id, 
          cheat_warnings: cheatWarnings 
        }, 
        answers
      );
      
      setResult({
        score: finalResult.score,
        total: finalResult.total_marks
      });
      
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error(err));
      }
    } catch (err) {
      console.error('Error submitting test:', err);
      alert('Failed to submit test properly. Please contact Admin.');
    } finally {
      setSubmitting(false);
    }
  }, [answers, cheatWarnings, result, studentId, submitting, test.id]);

  // Load Questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const data = await getTestQuestions(test.id);
        // Shuffle questions
        const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
        setQuestions(shuffled as OnlineTestQuestion[]);
      } catch (err) {
        console.error('Failed to load questions', err);
        alert('Could not load test questions.');
        onComplete();
      } finally {
        setLoading(false);
      }
    };
    loadQuestions();
  }, [test.id, onComplete]);

  // Timer
  useEffect(() => {
    if (loading || result) return;
    
    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          finishTest(true); // auto submit
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timerId);
  }, [loading, result, finishTest]);

  // Anti-Cheat: Visibility Change (Tab Switch)
  useEffect(() => {
    if (loading || result) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setCheatWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            alert('Multiple cheating attempts detected. Test is being auto-submitted.');
            finishTest(true);
          } else {
            setShowWarning(true);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loading, result, finishTest]);

  // Anti-Cheat: Prevent Copy/Paste/Right-Click
  useEffect(() => {
    if (result) return;
    const preventAction = (e: Event) => e.preventDefault();
    
    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('copy', preventAction);
    
    // Request full screen on mount if possible
    const elem = document.documentElement;
    if (elem.requestFullscreen && !document.fullscreenElement) {
      elem.requestFullscreen().catch(() => {
        console.warn('Fullscreen request denied');
      });
    }

    return () => {
      document.removeEventListener('contextmenu', preventAction);
      document.removeEventListener('copy', preventAction);
    };
  }, [result]);

  const handleOptionSelect = (qId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center border-t-4 border-green-500">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Test Submitted!</h2>
          <p className="text-gray-600 mb-6">Your answers have been saved successfully.</p>
          
          <div className="bg-green-50 rounded-lg p-6 mb-8 inline-block">
            <p className="text-sm text-green-800 font-semibold mb-1">YOUR SCORE</p>
            <p className="text-5xl font-bold text-green-600">
              {result.score} <span className="text-2xl text-green-400">/ {result.total}</span>
            </p>
          </div>
          
          <button
            onClick={onComplete}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-bold hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Preparing your test securely...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 select-none">
      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-center shadow-2xl">
            <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Warning!</h3>
            <p className="text-gray-600 mb-6">
              You switched tabs or minimized the window. This is considered cheating. 
              If you do this {3 - cheatWarnings} more time(s), your test will be auto-submitted.
            </p>
            <button 
              onClick={() => setShowWarning(false)}
              className="bg-red-600 text-white py-2 px-6 rounded-md font-bold hover:bg-red-700"
            >
              I Understand, Return to Test
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{test.title}</h1>
            <p className="text-sm text-gray-500">{test.subject} • Anti-Cheat Active</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
            <Clock className="h-5 w-5" />
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                {idx + 1}
              </div>
              <div className="flex-grow">
                <p className="text-lg font-medium text-gray-900 mb-4 whitespace-pre-wrap">{q.question_text}</p>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {['A', 'B', 'C', 'D'].map((opt) => {
                    const optionText = q[`option_${opt.toLowerCase()}` as keyof OnlineTestQuestion];
                    const isSelected = answers[q.id] === opt;
                    
                    return (
                      <button
                        key={opt}
                        onClick={() => handleOptionSelect(q.id, opt)}
                        className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-50 text-blue-900' 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-bold mr-2 text-gray-500">{opt}.</span>
                        {optionText as string}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="pt-8 pb-4 text-center">
          <button
            onClick={() => {
              if (Object.keys(answers).length < questions.length) {
                if (!window.confirm("You have not answered all questions. Are you sure you want to submit?")) {
                  return;
                }
              }
              finishTest(false);
            }}
            disabled={submitting}
            className="bg-green-600 text-white py-3 px-12 rounded-full font-bold text-lg hover:bg-green-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>
    </div>
  );
}
