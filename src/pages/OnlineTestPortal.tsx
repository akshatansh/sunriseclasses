import React, { useState, useEffect } from 'react';
import { BookOpen, LogIn, PlayCircle, ShieldAlert, Timer, CheckCircle, Clock } from 'lucide-react';
import { loginStudentForTest, getActiveTests, getStudentAttempts, OnlineTest, StudentTestAttempt } from '../lib/onlineTests';
import LiveTestRunner from '../components/LiveTestRunner';

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
        alert("Your browser does not support full-screen mode, which is required for this test.");
        return;
      }
      
      // Show confirmation
      if (window.confirm(`Ready to start "${test.title}"?\n\nAnti-Cheat is ACTIVE:\n1. You must stay in full-screen.\n2. Do NOT change tabs or minimize.\n3. Test will auto-submit if cheating is detected.`)) {
        setActiveTest(test);
      }
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
      <LiveTestRunner 
        test={activeTest} 
        studentId={student.id} 
        onComplete={handleTestComplete} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fbff] pt-[116px] pb-12">
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
                        <p className="text-xs text-gray-500 font-semibold mb-1">YOUR SCORE</p>
                        <p className="text-2xl font-bold text-green-600">{attempt.score} <span className="text-sm text-green-400">/ {attempt.total_marks}</span></p>
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
