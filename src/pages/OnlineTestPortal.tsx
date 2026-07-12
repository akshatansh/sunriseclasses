import React, { useState, useEffect } from 'react';
import { BookOpen, LogIn, PlayCircle, ShieldAlert, Timer, CheckCircle, Clock, Camera, Users, Globe, Mic, Eye, Lock, Unlock, FileText, AlertTriangle } from 'lucide-react';
import { loginStudentForTest, getActiveTests, getStudentAttempts, startTestAttempt, reportTestIssue, OnlineTest, StudentTestAttempt, verifyStudentPin, getTestQuestionsWithAnswers, OnlineTestQuestion } from '../lib/onlineTests';
import jsPDF from 'jspdf';

// Lazy load the runner to prevent heavy TFJS imports from crashing the main bundle
const LiveTestRunner = React.lazy(() => 
  import('../components/LiveTestRunner').catch(err => {
    // If the chunk fails to load (e.g. after a new deploy), reload the page to get the new version
    if (typeof window !== 'undefined' && (err.name === 'ChunkLoadError' || err.message.includes('Failed to fetch dynamically imported module'))) {
      window.location.reload();
    }
    throw err;
  })
);

export default function OnlineTestPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [student, setStudent] = useState<{ id: string; name: string; class_name: string; image?: string } | null>(null);
  
  // Login Form State
  const [name, setName] = useState('');
  const [className, setClassName] = useState('Class 10');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [cameraCheckLoading, setCameraCheckLoading] = useState(false);
  const [cameraCheckError, setCameraCheckError] = useState('');

  // Tests State
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  
  // Active Test State
  const [activeTest, setActiveTest] = useState<OnlineTest | null>(null);
  const [testToStart, setTestToStart] = useState<OnlineTest | null>(null);
  const [attempts, setAttempts] = useState<StudentTestAttempt[]>([]);
  const [attemptedError, setAttemptedError] = useState('');

  // Review State
  const [reviewTest, setReviewTest] = useState<{ test: OnlineTest; attempt: StudentTestAttempt } | null>(null);
  const [reviewPin, setReviewPin] = useState('');
  const [reviewPinError, setReviewPinError] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState<OnlineTestQuestion[]>([]);
  const [loadingReview, setLoadingReview] = useState(false);


  const classes = ['Class 8', 'Class 9', 'Class 10'];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const studentData = await loginStudentForTest(name.trim(), className, pin);
      setStudent(studentData);
      setLoginSuccess(true);
      
      // Artificial delay for the "Wow" effect with student photo
      setTimeout(() => {
        setIsLoggedIn(true);
        fetchTests(studentData.class_name, studentData.id);
        setLoginSuccess(false);
      }, 2000);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchTests = async (cls: string, studentId: string) => {
    setLoadingTests(true);
    try {
      const [testsData, attemptsData] = await Promise.all([
        getActiveTests(cls),
        getStudentAttempts(studentId)
      ]);
      setTests(testsData);
      setAttempts(attemptsData);
    } catch (err) {
      console.error('Error fetching tests:', err);
    } finally {
      setLoadingTests(false);
    }
  };

  const handleStartTest = async (test: OnlineTest) => {
    setAttemptedError('');
    if (!student) return;
    
    try {
      // Block starting a stopped test
      if (test.is_stopped && !test.is_active) {
        setAttemptedError('Yeh test band kar diya gaya hai. Dobara attempt nahi kar sakte.');
        setAttemptedError('Yeh test band kar diya gaya hai. Dobara attempt nahi kar sakte.');
        return;
      }

      // Check if already COMPLETED (from local state first)
      const attempt = attempts.find(a => a.test_id === test.id && a.is_completed === true);
      if (attempt) {
        setAttemptedError(`You have already completed the test "${test.title}". You scored ${attempt.score}/${attempt.total_marks}.`);
        return;
      }
      
      // Check full screen support
      if (!document.fullscreenEnabled) {
        // Just a warning, not blocking, because some mobile browsers report false here.
        console.warn("Browser may not support full-screen mode properly.");
      }
      
      // Show Custom Warning Modal instead of window.confirm
      setTestToStart(test);
    } catch (err: any) {
      console.error(err);
      setAttemptedError('Failed to verify test status. Try again later.');
    }
  };

  const handleTestComplete = () => {
    setActiveTest(null);
    if (student) fetchTests(student.class_name, student.id); // Refresh list
  };

  // Report Form State — MUST be declared before any early returns (React Rules of Hooks)
  const [showReportForm, setShowReportForm] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('Automatic Submission');
  const [reportDesc, setReportDesc] = useState('');

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setIsReporting(true);
    try {
      await reportTestIssue(student.id, reportIssueType, reportDesc);
      setReportSuccess(true);
      setReportDesc('');
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportForm(false);
      }, 3000);
    } catch (err) {
      alert("Failed to send report. Please check connection.");
    } finally {
      setIsReporting(false);
    }
  };

  const handleOpenReview = (test: OnlineTest, attempt: StudentTestAttempt) => {
    setReviewTest({ test, attempt });
    setReviewPin('');
    setReviewPinError('');
    setIsPinVerified(false);
    setReviewQuestions([]);
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTest || !student) return;
    
    setReviewPinError('');
    const isValid = await verifyStudentPin(student.id, reviewPin);
    if (isValid) {
      setIsPinVerified(true);
      fetchReviewQuestions(reviewTest.test.id);
    } else {
      setReviewPinError('Incorrect PIN. Please try again.');
    }
  };

  const fetchReviewQuestions = async (testId: string) => {
    setLoadingReview(true);
    try {
      const data = await getTestQuestionsWithAnswers(testId);
      setReviewQuestions(data);
    } catch (err) {
      console.error('Error fetching review questions:', err);
    } finally {
      setLoadingReview(false);
    }
  };




  // If a test is active, show the runner — early return AFTER all hooks
  if (activeTest && student) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white font-medium">Initializing Secure Environment...</p>
          </div>
        </div>
      }>
        <LiveTestRunner 
          test={activeTest} 
          studentId={student.id} 
          onComplete={handleTestComplete} 
        />
      </React.Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] pt-[116px] pb-12">
      {/* Answer Review Modal */}
      {reviewTest && (
        <div id="review-modal" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col print:max-h-none print:shadow-none print:rounded-none">
            <div className="bg-[#0f2a5c] p-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold">{reviewTest.test.title} - Answer Review</h3>
                <p className="text-blue-200 text-sm">Subject: {reviewTest.test.subject} | Score: {reviewTest.attempt.score}/{reviewTest.attempt.total_marks}</p>
              </div>
              <button 
                onClick={() => setReviewTest(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                ×
              </button>
            </div>

            {!isPinVerified ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="h-20 w-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Lock className="h-10 w-10 text-blue-600" />
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-2">Secure Answer Review</h4>
                <p className="text-gray-600 mb-8 max-w-sm">Please enter your secret PIN to unlock the detailed answer key and explanations.</p>
                
                <form onSubmit={handleVerifyPin} className="w-full max-w-xs space-y-4">
                  <input 
                    type="password"
                    required
                    value={reviewPin}
                    onChange={(e) => setReviewPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-black border-2 border-gray-100 rounded-2xl focus:border-blue-500 outline-none transition-all"
                    maxLength={4}
                    autoFocus
                  />
                  {reviewPinError && <p className="text-red-500 text-sm font-bold">{reviewPinError}</p>}
                  <button 
                    type="submit"
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <Unlock size={20} />
                    Unlock Review
                  </button>
                </form>
                <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest">Only you can see your answers</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50">
                {loadingReview ? (
                  <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium">Loading answers securely...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                       <h4 className="text-lg font-bold text-gray-800">Performance Summary</h4>
                       <button 
                         onClick={() => window.print()}
                         className="flex items-center gap-2 bg-[#0f2a5c] text-[#f5a623] px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#1a3a7a] transition-all no-print"
                       >
                         <FileText size={16} />
                         Print / Save PDF
                       </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Score</p>
                          <p className="text-2xl font-black text-blue-600">{reviewTest.attempt.score} / {reviewTest.attempt.total_marks}</p>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Percentage</p>
                          <p className="text-2xl font-black text-orange-500">{reviewTest.attempt.total_marks > 0 ? Math.round((reviewTest.attempt.score / reviewTest.attempt.total_marks) * 100) : 0}%</p>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Time Taken</p>
                          <p className="text-2xl font-black text-green-600">
                            {reviewTest.attempt.time_taken_seconds 
                              ? `${Math.floor(reviewTest.attempt.time_taken_seconds / 60)}m ${reviewTest.attempt.time_taken_seconds % 60}s`
                              : 'N/A'}
                          </p>
                       </div>
                    </div>

                    {/* Show notice if answers data is missing (test taken before migration) */}
                    {(!reviewTest.attempt.answers || Object.keys(reviewTest.attempt.answers).length === 0) && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                        <AlertTriangle size={20} className="text-yellow-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-yellow-800">Aapke answers ka data available nahi hai</p>
                          <p className="text-xs text-yellow-700 mt-1">Yeh test purane version mein diya gaya tha jab answers save nahi hote the. Sirf sahi jawab (Sahi Jawab) dikhaye jayenge. Naye tests mein aapka chuna hua option bhi dikhega.</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      {reviewQuestions.map((q, idx) => {
                        const studentAns = reviewTest.attempt.answers?.[q.id];
                        const isCorrect = studentAns === q.correct_option;
                        const hasAnswerData = !!reviewTest.attempt.answers && Object.keys(reviewTest.attempt.answers).length > 0;
                        
                        return (
                          <div key={q.id} className={`question-card bg-white rounded-2xl border-2 overflow-hidden ${isCorrect ? 'border-green-200' : studentAns ? 'border-red-200' : 'border-gray-100'}`}>
                            <div className="p-5">
                              <div className="flex justify-between items-start mb-4">
                                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-black">Q{idx + 1}</span>
                                {hasAnswerData ? (
                                  studentAns ? (
                                    isCorrect ? (
                                      <span className="text-green-600 font-bold text-xs flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                        <CheckCircle size={14} /> Correct (+{q.marks})
                                      </span>
                                    ) : (
                                      <span className="text-red-600 font-bold text-xs flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                        <ShieldAlert size={14} /> Incorrect (0/{q.marks})
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-gray-500 font-bold text-xs flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                      <Timer size={14} /> Not Attempted
                                    </span>
                                  )
                                ) : (
                                  <span className="text-gray-400 font-bold text-xs flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                    Answer Key
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-gray-900 font-bold text-lg mb-4">{q.question_text}</p>
                              
                              {q.question_image && (
                                <img src={q.question_image} className="max-h-64 rounded-xl mb-4 border border-gray-100" alt="Question" />
                              )}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[
                                  { key: 'A', text: q.option_a },
                                  { key: 'B', text: q.option_b },
                                  { key: 'C', text: q.option_c },
                                  { key: 'D', text: q.option_d }
                                ].map((opt) => {
                                  const isSelected = studentAns === opt.key;
                                  const isCorrectOpt = q.correct_option === opt.key;
                                  
                                  // Determine background styling
                                  let bgClass = 'bg-gray-50 border-gray-100 text-gray-700';
                                  if (isSelected && isCorrectOpt) bgClass = 'bg-green-100 border-green-500 text-green-900 font-bold ring-2 ring-green-300';
                                  else if (isCorrectOpt) bgClass = 'bg-green-50 border-green-400 text-green-900 font-bold';
                                  else if (isSelected && !isCorrectOpt) bgClass = 'bg-red-100 border-red-500 text-red-900 font-bold ring-2 ring-red-300';

                                  return (
                                    <div key={opt.key} className={`p-4 rounded-xl border-2 flex items-center gap-3 ${bgClass}`}>
                                      <span className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold ${isCorrectOpt ? 'bg-green-600 text-white' : isSelected ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                        {opt.key}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm">{opt.text}</span>
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                          {isSelected && (
                                            <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black ${isCorrectOpt ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                              ← Aapka Jawab
                                            </span>
                                          )}
                                          {isCorrectOpt && (
                                            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black bg-green-600 text-white">
                                              Sahi Jawab
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {isCorrectOpt && <CheckCircle size={18} className="ml-auto text-green-600 shrink-0" />}
                                      {isSelected && !isCorrectOpt && <ShieldAlert size={18} className="ml-auto text-red-600 shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {hasAnswerData && !isCorrect && studentAns && (
                              <div className="bg-orange-50 p-4 border-t border-orange-100 flex items-start gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600"><AlertTriangle size={18} /></div>
                                <div>
                                  <p className="text-sm font-bold text-orange-900">Galat Jawab!</p>
                                  <p className="text-xs text-orange-800 mt-1">Aapne <span className="font-bold">Option {studentAns}</span> chuna tha, jabki sahi jawab <span className="font-bold">Option {q.correct_option}</span> hai.</p>
                                </div>
                              </div>
                            )}

                            {q.explanation && (
                              <div className="bg-blue-50/80 px-4 py-3 sm:px-5 sm:py-4 border-t border-blue-100">
                                <div className="flex items-start gap-2">
                                  <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2v1"/><path d="M12 7v1"/><path d="M12 12v1"/><path d="m19.07 4.93-.71.71"/><path d="m16.95 7.05-.71.71"/><path d="m14.83 9.17-.71.71"/><path d="m4.93 4.93.71.71"/><path d="m7.05 7.05.71.71"/><path d="m9.17 9.17.71.71"/><path d="M2 12h1"/><path d="M7 12h1"/><path d="M21 12h1"/><path d="M16 12h1"/></svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-blue-900 mb-1">Detailed Solution</p>
                                    <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">{q.explanation}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="p-4 bg-white border-t flex justify-center shrink-0 no-print">
               <button 
                 onClick={() => setReviewTest(null)}
                 className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
               >
                 Close Review
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showReportForm && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-blue-600 p-6 text-white text-center">
              <h3 className="text-xl font-bold">Report an Issue</h3>
              <p className="text-blue-100 text-sm">Facing trouble with your test?</p>
            </div>
            
            <form onSubmit={handleReportSubmit} className="p-6 space-y-4">
              {reportSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-bold text-gray-900">Report Sent!</p>
                  <p className="text-sm text-gray-600">S.P Sir will check this soon.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
                    <select 
                      value={reportIssueType}
                      onChange={(e) => setReportIssueType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Automatic Submission</option>
                      <option>Camera Not Opening</option>
                      <option>Question Not Loading</option>
                      <option>Login Issue</option>
                      <option>Other Problem</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea 
                      required
                      value={reportDesc}
                      onChange={(e) => setReportDesc(e.target.value)}
                      placeholder="Explain what happened..."
                      className="w-full px-3 py-2 border rounded-xl h-32 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowReportForm(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold">Cancel</button>
                    <button type="submit" disabled={isReporting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-50">
                      {isReporting ? 'Sending...' : 'Send Report'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Pre-Test Anti-Cheat Warning Modal */}
      {testToStart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="relative bg-[#0f172a] p-8 text-center border-b border-white/10 overflow-hidden">
              <div className="absolute inset-0 bg-red-600/10 animate-pulse"></div>
              <ShieldAlert className="relative h-14 w-14 text-red-500 mx-auto mb-3 animate-bounce-subtle" />
              <h3 className="relative text-2xl font-black text-white uppercase tracking-wider">Strict Anti-Cheat</h3>
              <p className="relative text-sm text-red-400 font-bold mt-1 tracking-widest uppercase">Monitoring Active</p>
            </div>
            
            <div className="p-6 bg-white">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6 text-center">
                <p className="text-blue-900 font-bold text-sm uppercase tracking-wider">You are about to start</p>
                <p className="text-blue-700 font-black text-lg mt-1">{testToStart.title}</p>
              </div>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-4 text-sm text-gray-700">
                  <div className="mt-0.5 bg-red-100 text-red-600 p-2 rounded-xl shrink-0 shadow-sm"><Camera className="h-5 w-5" /></div>
                  <p className="leading-snug"><strong>Camera & Audio:</strong> S.P Sir will continuously monitor your live camera feed and listen to your audio.</p>
                </li>
                <li className="flex items-start gap-4 text-sm text-gray-700">
                  <div className="mt-0.5 bg-yellow-100 text-yellow-600 p-2 rounded-xl shrink-0 shadow-sm"><Mic className="h-5 w-5" /></div>
                  <p className="leading-snug"><strong>Live Audio Monitoring:</strong> S.P Sir is listening! Kamre mein bilkul shanti honi chahiye. Aapki ek-ek aawaz aur shor seedha S.P Sir sun rahe hain.</p>
                </li>
                <li className="flex items-start gap-4 text-sm text-gray-700">
                  <div className="mt-0.5 bg-blue-100 text-blue-600 p-2 rounded-xl shrink-0 shadow-sm"><Globe className="h-5 w-5" /></div>
                  <p className="leading-snug"><strong>Tab Switch Lock:</strong> Exiting fullscreen or switching tabs will immediately AUTO-SUBMIT your test.</p>
                </li>
              </ul>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setTestToStart(null)}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-500 rounded-2xl font-bold hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!student || !testToStart) return;
                    setCameraCheckError('');
                    setCameraCheckLoading(true);
                    
                    // ✅ Camera check BEFORE starting test
                    try {
                      const testStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                      // Camera works! Stop the test stream immediately (LiveTestRunner will re-request)
                      testStream.getTracks().forEach(t => t.stop());
                    } catch (err: any) {
                      setCameraCheckLoading(false);
                      const isPermission = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';
                      setCameraCheckError(
                        isPermission
                          ? 'Camera permission deny hai! Browser settings mein camera allow karo, phir dobara try karo.'
                          : 'Camera detect nahi hua! Device mein camera connected hai? Phir dobara try karo.'
                      );
                      return;
                    }
                    
                    // Camera OK — start test
                    try {
                      await startTestAttempt(student.id, testToStart.id);
                      setActiveTest(testToStart);
                      setTestToStart(null);
                      setCameraCheckError('');
                    } catch (err) {
                      alert("Failed to securely start test. Please check internet connection.");
                    } finally {
                      setCameraCheckLoading(false);
                    }
                  }}
                  disabled={cameraCheckLoading}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 disabled:opacity-60"
                >
                  {cameraCheckLoading ? 'Camera Check...' : 'I Agree, Start'}
                </button>
              </div>
              {cameraCheckError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium text-center">
                  {cameraCheckError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Success Overlay */}
      {loginSuccess && student && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#0f172a]/95 backdrop-blur-xl">
           <div className="text-center text-white animate-in zoom-in fade-in duration-500">
             <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-2xl animate-pulse"></div>
                {student.image ? (
                  <img src={student.image} className="h-32 w-32 rounded-full mx-auto border-4 border-white shadow-2xl relative z-10" />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-white/10 mx-auto flex items-center justify-center relative z-10 border-4 border-white/20">
                    <Users className="h-16 w-16 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg border-2 border-white z-20">
                  <CheckCircle className="h-5 w-5" />
                </div>
             </div>
             <h2 className="text-4xl font-black tracking-tight">Welcome, {student.name.split(' ')[0]}!</h2>
             <p className="text-blue-300 font-bold mt-2 tracking-widest uppercase text-xs">Accessing your Secure Dashboard</p>
             <div className="mt-8 flex justify-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
             </div>
           </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
          <BookOpen className="h-8 w-8 text-blue-600" />
          Online Objective Test Portal
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Exclusive portal for Sunrise Classes students. Take your objective tests from home and get instant results.
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <LogIn className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Student Login</h2>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your registered name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {classes.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secret PIN / Roll No.</label>
              <input
                type="password"
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ask Admin if you don't know"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                <p>{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoggingIn ? 'Verifying...' : 'Login to Portal'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 mb-6">
            <div className="flex items-center gap-4">
              {student?.image ? (
                <img src={student.image} alt={student.name} className="h-16 w-16 rounded-full object-cover border-2 border-blue-100" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-50">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Welcome, {student?.name}</h2>
                <p className="text-gray-600">Class: {student?.class_name}</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setIsLoggedIn(false);
                setStudent(null);
                setTests([]);
              }}
              className="mt-4 sm:mt-0 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Logout
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Timer className="h-5 w-5 text-green-600" /> 
              Available Tests
            </h3>
            <button 
              onClick={() => setShowReportForm(true)}
              className="px-4 py-1.5 bg-red-50 text-red-600 rounded-full text-xs font-black border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-2"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              REPORT TECHNICAL ISSUE
            </button>
          </div>
          
          {attemptedError && (
            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200">
              {attemptedError}
            </div>
          )}

          {loadingTests ? (
            <p className="text-center py-8 text-gray-500">Loading tests...</p>
          ) : tests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">No active tests available for your class right now.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(tests || []).map(test => {
                const attempt = (attempts || []).find(a => a && a.test_id === test.id && a.is_completed === true);
                const isCompleted = !!attempt;
                const isStopped = test.is_stopped && !test.is_active;

                return (
                  <div key={test.id} className={`border rounded-lg p-5 transition-shadow ${
                    isCompleted ? 'bg-green-50/50 border-green-200' 
                    : isStopped ? 'bg-red-50/30 border-red-200'
                    : 'bg-blue-50/30 border-gray-200 hover:shadow-md'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-gray-900">{test.title}</h4>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          <CheckCircle className="h-3.5 w-3.5" /> Completed
                        </span>
                      ) : isStopped ? (
                        <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          <Timer className="h-3.5 w-3.5" /> Pending
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">Subject: {test.subject} • Time: {test.duration_minutes} mins</p>
                    
                    {isCompleted ? (
                      <div className="space-y-3">
                        <div className="bg-white rounded-md border border-green-100 p-3 text-center">
                          <p className="text-xs text-gray-500 font-semibold mb-1">YOUR SCORE</p>
                          <p className="text-2xl font-bold text-green-600">{attempt.score} <span className="text-sm text-green-400">/ {attempt.total_marks}</span></p>
                        </div>
                        
                           <button 
                             onClick={() => handleOpenReview(test, attempt)}
                             disabled={!test.allow_review}
                             className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all w-full ${
                               test.allow_review 
                                 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700' 
                                 : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                             }`}
                             title={test.allow_review ? 'Detailed Answer Review' : 'Review is disabled by Admin'}
                           >
                             <Eye size={14} />
                             {test.allow_review ? 'Review Answers' : 'Review Locked'}
                           </button>
                        
                        {!test.allow_review && (
                          <p className="text-[10px] text-gray-400 text-center italic">Review will be enabled after results are verified.</p>
                        )}
                      </div>
                    ) : isStopped ? (
                      <div className="bg-red-50 rounded-md border border-red-100 p-3 text-center">
                        <p className="text-xs text-red-500 font-bold mb-1">TEST STOPPED</p>
                        <p className="text-sm text-gray-600">Yeh test band kar diya gaya hai. Apne teacher se mile.</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartTest(test)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-bold"
                      >
                        <PlayCircle className="h-5 w-5" />
                        Start Test Now
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
