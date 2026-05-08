import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OnlineTest, OnlineTestQuestion, getTestQuestions, submitTest, logProctoringEvent } from '../lib/onlineTests';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Camera, CameraOff, RefreshCw, Share2, Award, Download, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as tf from '@tensorflow/tfjs';
import * as blazefaceModel from '@tensorflow-models/blazeface';

// Ensure blazeface is accessible in different bundler environments
const blazeface: any = (blazefaceModel as any).default || blazefaceModel;

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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [showPalette, setShowPalette] = useState(false);
  const [showSubmitSummary, setShowSubmitSummary] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [language, setLanguage] = useState<'EN' | 'HI'>('EN');
  const [showShareModal, setShowShareModal] = useState(false);
  const [studentName, setStudentName] = useState(''); // To display on result card
  const [studentPhoto, setStudentPhoto] = useState(''); // To display on header
  const [isWarningFlash, setIsWarningFlash] = useState(false); // For red flash effect
  
  // Anti-Cheat State
  const [cheatWarnings, setCheatWarnings] = useState(0);
  
  // Results State
  const [result, setResult] = useState<{ score: number, total: number } | null>(null);

  // AI Proctoring State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>('Initializing AI...');
  const [faceWarnings, setFaceWarnings] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCameraGuide, setShowCameraGuide] = useState(false);
  const [cameraRetrying, setCameraRetrying] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const cameraStartRef = useRef<(() => void) | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const showSubtleMessage = useCallback((msg: string) => {
    setActiveMessage(msg);
    if (msg.toLowerCase().includes('warning') || msg.toLowerCase().includes('detected')) {
      setIsWarningFlash(true);
      setTimeout(() => setIsWarningFlash(false), 500);
    }
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    messageTimeoutRef.current = setTimeout(() => {
      setActiveMessage(null);
    }, 5000);
  }, []);

  // Sync state to LocalStorage
  useEffect(() => {
    if (!isTestStarted || result) return;
    const storageKey = `test_progress_${test.id}_${studentId}`;
    localStorage.setItem(storageKey, JSON.stringify({
      answers,
      markedForReview,
      timeLeft,
      questions // Persist shuffled order
    }));
  }, [answers, markedForReview, timeLeft, isTestStarted, result, test.id, studentId, questions]);

  // Handle Online/Offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      showSubtleMessage("Back Online! Your progress is safe.");
    };
    const handleOffline = () => {
      setIsOffline(true);
      showSubtleMessage("⚠️ You are OFFLINE! Please check your internet connection.");
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showSubtleMessage]);

  // Battery Monitoring
  useEffect(() => {
    if (typeof (navigator as any).getBattery === 'function') {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const level = Math.round(battery.level * 100);
          setBatteryLevel(level);
          if (level < 20 && !battery.charging) {
            showSubtleMessage(`⚠️ Low Battery (${level}%). Please plug in your charger!`);
          }
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      });
    }
  }, [showSubtleMessage]);

  const captureScreenshot = useCallback(async (): Promise<Blob | undefined> => {
    if (!videoRef.current) return undefined;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.6);
        }) || undefined;
      }
    } catch (e) {
      console.error("Screenshot failed", e);
    }
    return undefined;
  }, []);

  const finishTest = useCallback(async (forced: boolean = false) => {
    if (submitting || result) return;
    setSubmitting(true);
    
    try {
      const finalResult = await submitTest(
        { 
          student_id: studentId, 
          test_id: test.id, 
          cheat_warnings: cheatWarnings + faceWarnings 
        }, 
        answers
      );
      
      localStorage.removeItem(`test_progress_${test.id}_${studentId}`);
      setResult({ score: finalResult.score, total: finalResult.total_marks });
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setShowSubmitSummary(false);
    } catch (err) {
      console.error('Error submitting test:', err);
      showSubtleMessage("❌ Network Error! Retrying submission...");
      // Wait 3 seconds and retry once automatically
      setTimeout(() => {
        if (!result) finishTest(forced);
      }, 3000);
    } finally {
      setSubmitting(false);
    }
  }, [answers, cheatWarnings, faceWarnings, result, studentId, submitting, test.id]);

  // Load Questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const storageKey = `test_progress_${test.id}_${studentId}`;
        const savedProgress = localStorage.getItem(storageKey);
        
        if (savedProgress) {
          const parsed = JSON.parse(savedProgress);
          if (parsed.questions && Array.isArray(parsed.questions)) {
            setQuestions(parsed.questions);
            setAnswers(parsed.answers || {});
            setMarkedForReview(parsed.markedForReview || {});
            if (parsed.timeLeft < timeLeft) setTimeLeft(parsed.timeLeft);
            setLoading(false);
            return;
          }
        }

        const data = await getTestQuestions(test.id);
        const shuffled = [...(data || [])].sort(() => Math.random() - 0.5);
        setQuestions(shuffled as OnlineTestQuestion[]);

        // Also fetch student name and photo for the certificate/header
        const { data: sData } = await supabase.from('students').select('name, image').eq('id', studentId).single();
        if (sData) {
          setStudentName(sData.name);
          setStudentPhoto(sData.image || '');
        }
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

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const blob = await captureScreenshot();
        logProctoringEvent(test.id, studentId, 'Switched Tab / Minimized Browser', blob);
        
        setCheatWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            showSubtleMessage('Multiple cheating attempts detected. Submitting test...');
            finishTest(true);
          } else {
            showSubtleMessage(`Warning: Tab switch detected! (${newCount}/3)`);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    const handleBlur = () => {
      if (!result && isTestStarted) {
        document.body.classList.add('test-blurred');
        showSubtleMessage("Test content hidden for security.");
      }
    };
    const handleFocus = () => {
      document.body.classList.remove('test-blurred');
    };
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.body.classList.remove('test-blurred');
    };
  }, [loading, result, finishTest, captureScreenshot, studentId, test.id, showSubtleMessage, isTestStarted]);

  // Stable Back Button Prevention (Silent)
  useEffect(() => {
    if (loading || result || !isTestStarted) return;

    const handlePopState = (e: PopStateEvent) => {
      // Stay on page silently
      window.history.pushState(null, '', window.location.pathname + '#active');
    };

    window.history.pushState(null, '', window.location.pathname + '#active');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isTestStarted, loading, result]);

  // Anti-Cheat: Prevent Copy/Paste/Right-Click
  useEffect(() => {
    if (result) return;
    const preventAction = (e: Event) => e.preventDefault();
    
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        showSubtleMessage("Printing/Screenshots are not allowed!");
        return false;
      }
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        showSubtleMessage("Screenshots are not allowed!");
        return false;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        showSubtleMessage("Escaping Fullscreen is not allowed!");
        return false;
      }
    };

    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('copy', preventAction);
    document.addEventListener('keydown', handleKeydown);
    
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !result && isTestStarted) {
        setCheatWarnings(prev => prev + 1);
        showSubtleMessage("⚠️ Fullscreen exited! Please stay in fullscreen mode.");
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('contextmenu', preventAction);
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [result, isTestStarted, showSubtleMessage]);

  // Anti-Cheat: AI Camera Proctoring
  useEffect(() => {
    if (result || loading) return;

    let stream: MediaStream | null = null;
    let detectionInterval: NodeJS.Timeout;

    const handleWarning = async (msg: string) => {
      const blob = await captureScreenshot();
      logProctoringEvent(test.id, studentId, msg, blob);
      setFaceWarnings(prev => {
        const newCount = prev + 1;
        if (newCount >= 10) {
          showSubtleMessage(`Multiple AI Warnings. Auto-submitting...`);
          finishTest(true);
        } else {
          showSubtleMessage(msg);
        }
        return newCount;
      });
    };

    const startCameraAndAI = async () => {
      setCameraRetrying(true);
      setCameraError(null);

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setCameraError('not_supported');
        setCameraRetrying(false);
        return;
      }

      const cameraConstraints = [
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
      ];

      let gotStream = false;
      for (const constraints of cameraConstraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          gotStream = true;
          break;
        } catch (err: any) {
          console.warn('Camera failed:', err?.name);
        }
      }

      if (!gotStream || !stream) {
        setCameraError('unknown');
        setCameraRetrying(false);
        return;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { 
          await videoRef.current.play(); 
          setCameraActive(true); // Show video immediately
        } catch (e) {}
      }

      setCameraError(null);
      setShowCameraGuide(false);
      setCameraRetrying(false);
      setFaceDetectionStatus('Monitoring Active');

      try {
        await tf.ready();
        const model = await blazeface.load();
        if (!model || typeof model.estimateFaces !== 'function') {
          throw new Error('AI Model failed to initialize correctly.');
        }
        detectionInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2 && !isOffline) {
            const predictions = await model.estimateFaces(videoRef.current, false);
            if (predictions.length === 0) {
              setFaceDetectionStatus('⚠️ No face detected!');
              handleWarning('No face detected. Please look at the camera.');
            } else if (predictions.length > 1) {
              setFaceDetectionStatus('⚠️ Multiple faces detected!');
              handleWarning('Multiple faces detected. Please sit alone.');
            } else {
              setFaceDetectionStatus('Monitoring Active');
            }
          }
        }, 10000); // Throttled to 10s for low-end devices (RAM/Battery)
      } catch (e) {}
    };

    cameraStartRef.current = startCameraAndAI;
    startCameraAndAI();

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      clearInterval(detectionInterval);
    };
  }, [result, loading, finishTest, captureScreenshot, studentId, test.id]);

  const handleOptionSelect = (qId: string, option: string) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const answeredCount = Object.keys(answers).length;
  const markedCount = Object.keys(markedForReview).filter(k => markedForReview[k]).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  const readQuestion = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const t = {
    EN: {
      answered: 'Answered',
      solved: 'Solved',
      marked: 'Marked',
      left: 'Left',
      finish: 'Finish & Submit Test',
      review: 'Review & Submit',
      navigator: 'Navigator',
      jump: 'Jump to Question',
      autosave: 'Auto-saving',
      lowBattery: 'Low Battery',
      start: 'Start Test Now',
      ready: 'Ready to Start?',
      rules: 'The test will open in fullscreen mode. Switching tabs or screenshots will be recorded.',
      yes: 'Yes, Submit Now',
      back: 'Go Back',
      monitoring: 'Monitoring Through AI'
    },
    HI: {
      answered: 'जवाब दिया',
      solved: 'हल किया',
      marked: 'मार्क किया',
      left: 'बाकी',
      finish: 'टेस्ट जमा करें',
      review: 'चेक करें और जमा करें',
      navigator: 'नेविगेटर',
      jump: 'सवाल पर जाएं',
      autosave: 'सेव हो रहा है',
      lowBattery: 'बैटरी कम है',
      start: 'अभी टेस्ट शुरू करें',
      ready: 'तैयार हैं?',
      rules: 'टेस्ट फुलस्क्रीन मोड में खुलेगा। टैब बदलना या स्क्रीनशॉट लेना मना है।',
      yes: 'हाँ, जमा करें',
      back: 'वापस जाएं',
      monitoring: 'AI द्वारा निगरानी'
    }
  }[language];

  if (result) {
    const shareMessage = `🎯 I scored ${result.score}/${result.total} in the ${test.title} at Sunrise Classes! 🚀\n\nJoin the elite batch at Sunrise Classes and ace your exams! 📖✨`;
    
    const handleShare = async () => {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My Test Result',
            text: shareMessage,
            url: window.location.origin
          });
        } catch (err) {}
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
      }
    };

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-700">
          {/* Branded Certificate Card */}
          <div id="result-card" className="bg-white rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-8 border-white">
            <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-8 text-center text-white relative">
              <div className="absolute top-4 right-4 bg-yellow-400 text-blue-900 text-[10px] font-black px-2 py-1 rounded-md rotate-12 shadow-lg">VERIFIED</div>
              <img src="/sunrise-logo.png" alt="Logo" className="h-16 w-16 mx-auto mb-4 bg-white rounded-full p-2" />
              <h2 className="text-xl font-black tracking-widest uppercase mb-1">Sunrise Classes</h2>
              <p className="text-[10px] text-blue-200 font-bold tracking-[0.2em] uppercase">Purnia's Best Coaching Institute</p>
            </div>
            
            <div className="p-8 text-center bg-white relative">
              <Award className="h-12 w-12 text-yellow-500 mx-auto mb-4 animate-bounce" />
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{studentName}</h3>
              <p className="text-sm text-gray-400 font-medium mb-6 italic">Has successfully completed the</p>
              
              <div className="bg-blue-50 py-4 px-6 rounded-2xl mb-8 border border-blue-100">
                <p className="text-xs text-blue-600 font-black uppercase mb-1">{test.title}</p>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-5xl font-black text-gray-900 leading-none">{result.score}</span>
                  <span className="text-xl font-bold text-gray-400">/ {result.total}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-left border-t pt-6">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Subject</p>
                  <p className="text-sm font-bold text-gray-700">{test.subject}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Date</p>
                  <p className="text-sm font-bold text-gray-700">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 text-center border-t border-dashed border-gray-200">
              <p className="text-[9px] text-gray-400 font-medium italic">"Dedicated to Quality Education since 2012"</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 px-4">
            <p className="text-blue-200 text-center text-sm font-medium animate-pulse">🎉 Screenshot & Share on your Story! 📸</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleShare}
                className="bg-green-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 shadow-xl transition-all active:scale-95"
              >
                <Share2 className="h-5 w-5" /> WhatsApp
              </button>
              <button 
                onClick={onComplete}
                className="bg-white/10 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-all border border-white/20"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isTestStarted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <ShieldAlert className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to Start?</h2>
          <p className="text-gray-600 mb-8">
            The test will open in <b>fullscreen mode</b>. Switching tabs, taking screenshots, or exiting fullscreen will be recorded as cheating.
          </p>
          <button
            onClick={() => {
              setIsTestStarted(true);
              const elem = document.documentElement;
              if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(() => console.warn('Fullscreen denied'));
              }
            }}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-xl transition-all"
          >
            Start Test Now
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
    <div className="min-h-screen bg-gray-50 pb-20 select-none no-print">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print { body { display: none !important; } }
        .no-print { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; }
        .test-blurred { filter: blur(20px); pointer-events: none; }
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .animate-bounce-subtle { animation: bounce-subtle 2s infinite; }
        .palette-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 8px; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
      
      {isWarningFlash && (
        <div className="fixed inset-0 z-[200] pointer-events-none bg-red-600/20 animate-pulse border-[20px] border-red-600/30"></div>
      )}

      {activeMessage && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-max max-w-[90vw]">
          <div className={`backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce-subtle border border-white/20 ${activeMessage.includes('⚠️') || activeMessage.includes('Warning') ? 'bg-red-600/90' : 'bg-gray-900/90'}`}>
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm font-medium">{activeMessage}</p>
          </div>
        </div>
      )}

      {/* Submission Summary Modal */}
      {showSubmitSummary && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl transform animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Finish Test?</h3>
              <p className="text-gray-500">Review your attempt before final submission.</p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 p-4 rounded-2xl text-center">
                <p className="text-2xl font-bold text-blue-600">{answeredCount}</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase">Solved</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-2xl text-center">
                <p className="text-2xl font-bold text-yellow-600">{markedCount}</p>
                <p className="text-[10px] font-bold text-yellow-400 uppercase">Marked</p>
              </div>
              <div className="bg-red-50 p-4 rounded-2xl text-center">
                <p className="text-2xl font-bold text-red-600">{unansweredCount}</p>
                <p className="text-[10px] font-bold text-red-400 uppercase">Left</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => finishTest(false)}
                disabled={submitting}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : 'Yes, Submit Now'}
              </button>
              <button
                onClick={() => setShowSubmitSummary(false)}
                className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Go Back to Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <CameraOff className="h-14 w-14 text-orange-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-gray-900 mb-1">Camera Required</h3>
            <button onClick={() => { setShowCameraGuide(false); if (cameraStartRef.current) cameraStartRef.current(); }} className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold mt-4">Retry Camera</button>
            <button onClick={() => setShowCameraGuide(false)} className="mt-2 w-full text-sm text-gray-400">Continue without camera</button>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="h-1 bg-gray-100 w-full overflow-hidden">
          <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Minimal AI Widget in Header */}
            {!result && (
              <div className="hidden sm:flex items-center gap-2 bg-black rounded-lg p-1 border border-gray-700 h-12 w-12 sm:w-20 overflow-hidden relative group">
                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${cameraActive ? 'opacity-100' : 'opacity-20'}`} />
                <div className={`absolute top-0 right-0 h-2 w-2 rounded-full border border-black ${faceDetectionStatus.includes('⚠️') ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <p className="text-[6px] text-white font-bold text-center leading-tight">AI Active</p>
                </div>
              </div>
            )}
            
            <div className="flex flex-col">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 leading-none mb-1">{test.title}</h1>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  {studentPhoto ? (
                    <img src={studentPhoto} alt="Student" className="h-4 w-4 rounded-full object-cover border border-blue-200" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-2 w-2 text-blue-600" />
                    </div>
                  )}
                  <p className="text-[9px] sm:text-xs text-blue-600 font-bold">{studentName}</p>
                </div>
                <span className="h-1 w-1 bg-gray-300 rounded-full"></span>
                <p className="text-[9px] sm:text-xs text-gray-500 font-semibold">{test.subject} • {answeredCount}/{questions.length} {t.answered}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Accessibility Controls */}
            <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-1">
              <button onClick={() => setFontSize(prev => Math.max(14, prev - 2))} className="px-2 text-xs font-bold text-gray-500 hover:text-blue-600">A-</button>
              <span className="w-[1px] h-3 bg-gray-300 mx-1"></span>
              <button onClick={() => setFontSize(prev => Math.min(24, prev + 2))} className="px-2 text-xs font-bold text-gray-500 hover:text-blue-600">A+</button>
            </div>

            <button 
              onClick={() => setLanguage(l => l === 'EN' ? 'HI' : 'EN')}
              className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100"
            >
              {language === 'EN' ? 'हिंदी' : 'English'}
            </button>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-bold transition-all duration-500 ${timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse scale-105' : 'bg-blue-50 text-blue-700'}`}>
              <Clock className="h-4 w-4" />
              <span className="text-sm font-mono">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} id={`q-${q.id}`} className={`bg-white rounded-xl shadow-sm border p-6 ${answers[q.id] ? 'border-blue-100' : 'border-gray-200'}`}>
              <div className="flex gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold ${answers[q.id] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</div>
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-grow">
                      {q.question_image && (
                        <div className="mb-4 rounded-lg overflow-hidden border border-gray-100 max-w-md bg-gray-50">
                          <img src={q.question_image} alt="Question Diagram" className="w-full h-auto object-contain" />
                        </div>
                      )}
                      <p className="font-medium text-gray-900 leading-relaxed" style={{ fontSize: `${fontSize}px` }}>{q.question_text}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => readQuestion(q.question_text)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                        title="Listen to question"
                      >
                        <RefreshCw className="h-4 w-4 transform rotate-90" />
                      </button>
                      <button onClick={() => setMarkedForReview(prev => ({ ...prev, [q.id]: !prev[q.id] }))} className={`text-[10px] font-bold px-2 py-1 rounded ${markedForReview[q.id] ? 'bg-yellow-100 text-yellow-700' : 'text-gray-400'}`}>{t.marked}</button>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {['A', 'B', 'C', 'D'].map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <button key={opt} onClick={() => handleOptionSelect(q.id, opt)} className={`text-left px-4 py-3 rounded-lg border-2 transition-all ${isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200'}`}>
                          <span className="font-bold mr-2 text-gray-400">{opt}.</span> 
                          <span style={{ fontSize: `${fontSize - 2}px` }}>{q[`option_${opt.toLowerCase()}` as keyof OnlineTestQuestion] as string}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-8 text-center pb-20">
            <button 
              onClick={() => setShowSubmitSummary(true)} 
              disabled={submitting || isOffline} 
              className="bg-green-600 text-white py-4 px-16 rounded-full font-bold text-xl hover:bg-green-700 disabled:opacity-50 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              {submitting ? 'Submitting...' : t.review}
            </button>
          </div>
        </div>

        <div className="hidden lg:block sticky top-24">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider">{t.navigator}</h3>
            <div className="palette-grid">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => scrollToQuestion(q.id)} className={`h-10 w-10 rounded-lg text-xs font-bold flex items-center justify-center border-2 transition-all ${answers[q.id] ? 'bg-blue-600 border-blue-600 text-white shadow-md' : markedForReview[q.id] ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-200'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => setShowPalette(true)} className="lg:hidden fixed bottom-6 left-6 z-40 bg-gray-900 text-white p-4 rounded-full shadow-2xl flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
        Nav
      </button>
      {showPalette && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm lg:hidden p-4">
          <div className="bg-white rounded-2xl p-6 mt-10 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold">{t.jump}</h3><button onClick={() => setShowPalette(false)}>✕</button></div>
            <div className="palette-grid">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => scrollToQuestion(q.id)} className={`h-12 w-12 rounded-xl text-sm font-bold flex items-center justify-center border-2 ${answers[q.id] ? 'bg-blue-600 border-blue-600 text-white' : markedForReview[q.id] ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-200'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end sm:hidden">
          {/* Keep bottom widget for mobile only as header is small */}
          <div className="bg-black rounded-lg overflow-hidden shadow-2xl border-2 border-white w-24 h-24">
            <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover transform scale-x-[-1] ${cameraActive ? 'opacity-100' : 'opacity-30'}`} />
          </div>
        </div>
      )}
    </div>
  );
}
