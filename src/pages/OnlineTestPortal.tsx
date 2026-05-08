import React, { useState, useEffect } from 'react';
import { BookOpen, LogIn, PlayCircle, ShieldAlert, Timer, CheckCircle, Clock, Camera, Users, Globe } from 'lucide-react';
import { loginStudentForTest, getActiveTests, getStudentAttempts, startTestAttempt, OnlineTest, StudentTestAttempt } from '../lib/onlineTests';

// Lazy load the runner to prevent heavy TFJS imports from crashing the main bundle
const LiveTestRunner = React.lazy(() => import('../components/LiveTestRunner'));

export default function OnlineTestPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [student, setStudent] = useState<{ id: string; name: string; class_name: string } | null>(null);
  
  // Login Form State
  const [name, setName] = useState('');
  const [className, setClassName] = useState('Class 10');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Tests State
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  
  // Active Test State
  const [activeTest, setActiveTest] = useState<OnlineTest | null>(null);
  const [testToStart, setTestToStart] = useState<OnlineTest | null>(null);
  const [attempts, setAttempts] = useState<StudentTestAttempt[]>([]);
  const [attemptedError, setAttemptedError] = useState('');

  const classes = ['Class 8', 'Class 9', 'Class 10'];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const studentData = await loginStudentForTest(name.trim(), className, pin);
      setStudent(studentData);
      setIsLoggedIn(true);
      fetchTests(studentData.class_name, studentData.id);
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
      // Check if already attempted (from local state first)
      const attempt = attempts.find(a => a.test_id === test.id);
      if (attempt) {
        setAttemptedError(`You have already attempted the test "${test.title}". You scored ${attempt.score}/${attempt.total_marks}.`);
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

  // If a test is active, show the runner
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
      {/* Pre-Test Anti-Cheat Warning Modal */}
      {testToStart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-red-50 p-6 text-center border-b border-red-100">
              <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-gray-900">Strict Anti-Cheat Active</h3>
              <p className="text-sm text-red-600 font-medium mt-1">Please read carefully before starting</p>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 font-medium mb-4">You are about to start: <strong className="text-gray-900">{testToStart.title}</strong></p>
              
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 bg-red-100 text-red-600 p-1.5 rounded-full shrink-0"><Camera className="h-4 w-4" /></div>
                  <p><strong>Camera Monitoring:</strong> Your camera will be active. AI will monitor your face continuously.</p>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 bg-red-100 text-red-600 p-1.5 rounded-full shrink-0"><ShieldAlert className="h-4 w-4" /></div>
                  <p><strong>Fullscreen Lock:</strong> Test will run in FULLSCREEN. Header, Footer, and Navigation will be hidden. Do not try to exit fullscreen.</p>
                </li>
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <div className="mt-0.5 bg-red-100 text-red-600 p-1.5 rounded-full shrink-0"><Globe className="h-4 w-4" /></div>
                  <p><strong>Anti-Cheat:</strong> Tab switching, Screenshots, and Right-click are BLOCKED. Doing so will auto-submit your test.</p>
                </li>
              </ul>
              
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button 
                  onClick={() => setTestToStart(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!student || !testToStart) return;
                    try {
                      await startTestAttempt(student.id, testToStart.id);
                      setActiveTest(testToStart);
                      setTestToStart(null);
                    } catch (err) {
                      alert("Failed to securely start test. Please check internet connection.");
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
                >
                  I Agree, Start
                </button>
              </div>
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
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome, {student?.name}</h2>
              <p className="text-gray-600">Class: {student?.class_name}</p>
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

          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Timer className="h-5 w-5 text-green-600" /> 
            Available Tests
          </h3>
          
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
              {tests.map(test => {
                const attempt = attempts.find(a => a.test_id === test.id);
                const isCompleted = !!attempt;

                return (
                  <div key={test.id} className={`border rounded-lg p-5 transition-shadow ${isCompleted ? 'bg-green-50/50 border-green-200' : 'bg-blue-50/30 border-gray-200 hover:shadow-md'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-gray-900">{test.title}</h4>
                      {isCompleted ? (
                        <span className="flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          <CheckCircle className="h-3.5 w-3.5" /> Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 bg-yellow-100 text-yellow-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">Subject: {test.subject} • Time: {test.duration_minutes} mins</p>
                    
                    {isCompleted ? (
                      <div className="bg-white rounded-md border border-green-100 p-3 text-center">
                        {attempt.is_completed ? (
                          <>
                            <p className="text-xs text-gray-500 font-semibold mb-1">YOUR SCORE</p>
                            <p className="text-2xl font-bold text-green-600">{attempt.score} <span className="text-sm text-green-400">/ {attempt.total_marks}</span></p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-red-500 font-bold mb-1">TEST ABANDONED</p>
                            <p className="text-sm text-gray-600">You left this test midway.</p>
                          </>
                        )}
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
