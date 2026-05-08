import React, { useState, useEffect, useCallback } from 'react';
import { OnlineTest, OnlineTestQuestion, getTestQuestions, submitTest, logProctoringEvent } from '../lib/onlineTests';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Camera, CameraOff, RefreshCw } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

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

  // AI Proctoring State
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>('Initializing AI...');
  const [faceWarnings, setFaceWarnings] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCameraGuide, setShowCameraGuide] = useState(false);
  const [cameraRetrying, setCameraRetrying] = useState(false);
  const cameraStartRef = React.useRef<(() => void) | null>(null);

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
  }, [answers, cheatWarnings, faceWarnings, result, studentId, submitting, test.id]);

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

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const blob = await captureScreenshot();
        logProctoringEvent(test.id, studentId, 'Switched Tab / Minimized Browser', blob);
        
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
    
    // Block Back Button (Mobile focus)
    const handlePopState = (e: PopStateEvent) => {
      window.history.pushState(null, '', window.location.pathname + window.location.hash);
      alert("Back button is disabled during the test. Please use the 'Submit' button to finish.");
    };
    window.history.pushState(null, '', window.location.pathname + window.location.hash);
    window.addEventListener('popstate', handlePopState);

    // Warn before Refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Set active hash to hide Header/Footer
    window.location.hash = 'active';

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.location.hash = ''; // Clear hash on exit
    };
  }, [loading, result, finishTest, captureScreenshot, studentId, test.id]);

  // Anti-Cheat: Prevent Copy/Paste/Right-Click
  useEffect(() => {
    if (result) return;
    const preventAction = (e: Event) => e.preventDefault();
    
    const handleKeydown = (e: KeyboardEvent) => {
      // Block Ctrl+P or Cmd+P (Print)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        alert("Printing/Screenshots are not allowed!");
        return false;
      }
      // Block PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        alert("Screenshots are not allowed!");
        return false;
      }
      // Block Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
      // Block Esc key (prevent exiting fullscreen)
      if (e.key === 'Escape') {
        e.preventDefault();
        alert("Escaping Fullscreen is not allowed. Please stay in the test!");
        return false;
      }
    };

    document.addEventListener('contextmenu', preventAction);
    document.addEventListener('copy', preventAction);
    document.addEventListener('keydown', handleKeydown);
    
    // Request and Lock full screen on mount
    const elem = document.documentElement;
    const enterFullscreen = () => {
      if (elem.requestFullscreen && !document.fullscreenElement) {
        elem.requestFullscreen().catch(() => {
          console.warn('Fullscreen request denied');
        });
      }
    };

    enterFullscreen();

    // Re-enforce fullscreen if user tries to exit (for browsers that allow event cancellation)
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !result) {
        setCheatWarnings(prev => prev + 1);
        setShowWarning(true);
        // We don't force back automatically because it requires user gesture, 
        // but we show the warning modal which will have a button.
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('contextmenu', preventAction);
      document.removeEventListener('copy', preventAction);
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [result]);

  // Anti-Cheat: AI Camera Proctoring (Mobile-Fixed)
  useEffect(() => {
    if (result || loading) return;

    let stream: MediaStream | null = null;
    let detectionInterval: NodeJS.Timeout;

    const handleWarning = async (msg: string) => {
      const blob = await captureScreenshot();
      logProctoringEvent(test.id, studentId, msg, blob);
      setFaceWarnings(prev => {
        const newCount = prev + 1;
        if (newCount >= 5) {
          alert(`Multiple AI Warnings: ${msg} Test is being auto-submitted.`);
          finishTest(true);
        }
        return newCount;
      });
    };

    const startCameraAndAI = async () => {
      setCameraRetrying(true);
      setCameraError(null);

      // Guard: Browser camera API support check
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setCameraError('not_supported');
        setCameraRetrying(false);
        logProctoringEvent(test.id, studentId, 'Camera API not supported on this browser/device', undefined);
        return;
      }

      // Step 1: Try multiple constraint profiles (front cam → any cam)
      const cameraConstraints = [
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
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
          if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
            setCameraError('permission_denied');
            setShowCameraGuide(true);
            setCameraRetrying(false);
            logProctoringEvent(test.id, studentId, 'Camera permission denied by student', undefined);
            return;
          }
          if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
            setCameraError('no_device');
            setCameraRetrying(false);
            logProctoringEvent(test.id, studentId, 'No camera device found on device', undefined);
            return;
          }
          console.warn('Camera constraint failed, trying fallback:', err?.name);
        }
      }

      if (!gotStream || !stream) {
        setCameraError('unknown');
        setCameraRetrying(false);
        logProctoringEvent(test.id, studentId, 'Camera failed to start (all constraints failed)', undefined);
        return;
      }

      // Step 2: Wait for videoRef to be ready in DOM (race condition fix)
      let videoEl = videoRef.current;
      if (!videoEl) {
        // Wait up to 2 seconds for DOM to mount
        await new Promise<void>(resolve => {
          let attempts = 0;
          const check = setInterval(() => {
            attempts++;
            if (videoRef.current || attempts > 20) {
              clearInterval(check);
              resolve();
            }
          }, 100);
        });
        videoEl = videoRef.current;
      }

      if (!videoEl) {
        setCameraError('unknown');
        setCameraRetrying(false);
        stream.getTracks().forEach(t => t.stop());
        logProctoringEvent(test.id, studentId, 'Video element not found in DOM', undefined);
        return;
      }

      // Step 3: Attach stream — use loadedmetadata event for reliable iOS/Android play
      videoEl.srcObject = stream;
      await new Promise<void>((resolve) => {
        const onReady = () => { videoEl!.removeEventListener('loadedmetadata', onReady); resolve(); };
        videoEl!.addEventListener('loadedmetadata', onReady);
        // Fallback timeout if event never fires
        setTimeout(resolve, 3000);
      });

      try {
        await videoEl.play();
      } catch (playErr) {
        console.warn('Video play() failed (autoplay policy):', playErr);
        // Still continue — stream may render on iOS via playsInline
      }

      setCameraActive(true);
      setCameraError(null);
      setShowCameraGuide(false);
      setCameraRetrying(false);
      setFaceDetectionStatus('Loading AI Model...');

      // Step 4: Load TensorFlow & Blazeface
      try {
        await tf.ready();
        const model = await blazeface.load();
        setFaceDetectionStatus('AI Monitoring Active');

        // Step 5: Start Detection Loop

        detectionInterval = setInterval(async () => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const predictions = await model.estimateFaces(videoRef.current, false);
              if (predictions.length === 0) {
                setFaceDetectionStatus('⚠️ No face detected!');
                handleWarning('No face detected. Please look at the camera.');
              } else if (predictions.length > 1) {
                setFaceDetectionStatus('⚠️ Multiple faces detected!');
                handleWarning('Multiple faces detected. Please sit alone.');
              } else {
                setFaceDetectionStatus('AI Monitoring Active');
              }
            } catch (err) {
              console.error('Face detection error:', err);
            }
          }
        }, 3000);
      } catch (aiErr) {
        console.error('AI model load failed:', aiErr);
        setFaceDetectionStatus('AI Model Failed');
        // Camera is still active for screenshot purposes
      }
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
    <div className="min-h-screen bg-gray-50 pb-20 select-none no-print">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { display: none !important; }
        }
        .no-print {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}} />
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
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setShowWarning(false);
                  // Force fullscreen back on mobile
                  const elem = document.documentElement;
                  if (elem.requestFullscreen) elem.requestFullscreen().catch(e => console.warn(e));
                }}
                className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 shadow-lg"
              >
                Return to Test & Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Permission Guide Modal */}
      {showCameraGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center shadow-2xl">
            <CameraOff className="h-14 w-14 text-orange-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {cameraError === 'no_device' ? 'No Camera Found' :
               cameraError === 'not_supported' ? 'Camera Not Supported' :
               'Camera Permission Required'}
            </h3>

            {cameraError === 'no_device' ? (
              <div className="bg-red-50 rounded-lg p-4 mb-5 text-sm text-red-700 text-left">
                <p className="font-bold mb-1">⚠️ Is device mein camera nahi mila.</p>
                <p>Kisi aur device (mobile ya laptop with camera) se test dijiye. Test bina camera ke bhi continue ho sakta hai.</p>
              </div>
            ) : cameraError === 'not_supported' ? (
              <div className="bg-yellow-50 rounded-lg p-4 mb-5 text-sm text-yellow-800 text-left">
                <p className="font-bold mb-1">⚠️ Yeh browser camera support nahi karta.</p>
                <p>Kripya <strong>Chrome</strong> ya <strong>Safari</strong> browser use karein aur HTTPS link se test kholen.</p>
              </div>
            ) : (
              <ol className="text-left text-sm text-gray-700 space-y-2 mb-5 bg-orange-50 rounded-lg p-4">
                <li className="flex gap-2"><span className="font-bold text-orange-600">1.</span> <span>Tap the <strong>🔒 lock icon</strong> or <strong>ℹ️ info icon</strong> in your browser address bar</span></li>
                <li className="flex gap-2"><span className="font-bold text-orange-600">2.</span> <span>Find <strong>"Camera"</strong> permission and set it to <strong>Allow</strong></span></li>
                <li className="flex gap-2"><span className="font-bold text-orange-600">3.</span> <span>Tap the button below to <strong>retry</strong></span></li>
              </ol>
            )}

            {cameraError !== 'no_device' && cameraError !== 'not_supported' && (
              <button
                onClick={() => {
                  setShowCameraGuide(false);
                  setCameraError(null);
                  if (cameraStartRef.current) cameraStartRef.current();
                }}
                disabled={cameraRetrying}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 transition-all mb-2"
              >
                <RefreshCw className={`h-4 w-4 ${cameraRetrying ? 'animate-spin' : ''}`} />
                {cameraRetrying ? 'Starting Camera...' : 'Retry Camera'}
              </button>
            )}
            <button
              onClick={() => setShowCameraGuide(false)}
              className="mt-1 w-full text-sm text-gray-400 hover:text-gray-600 py-1"
            >
              Continue without camera (recorded)

            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-base sm:text-xl font-bold text-gray-900 leading-tight">{test.title}</h1>
            <p className="text-[10px] sm:text-sm text-gray-500 uppercase tracking-tight font-semibold">{test.subject} • Secure Mode</p>
          </div>
          <div className={`flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-blue-100 text-blue-700'}`}>
            <Clock className="h-4 w-4 sm:h-5 sm:h-5" />
            <span className="text-sm sm:text-base">{formatTime(timeLeft)}</span>
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
            className="w-full sm:w-auto bg-green-600 text-white py-3 px-12 rounded-full font-bold text-lg hover:bg-green-700 disabled:opacity-50 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>

      {/* AI Proctoring Video Widget - Fixed for Mobile */}
      {!result && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
          <div className="bg-black rounded-full sm:rounded-xl overflow-hidden shadow-2xl border-2 border-white w-24 h-24 sm:w-44 sm:h-auto transition-all duration-300 group">
            <div className="hidden sm:flex items-center justify-between p-2 bg-white/10 backdrop-blur-md">
              <span className="text-[8px] uppercase font-bold text-white tracking-widest">AI Proctoring</span>
              <div className={`h-2 w-2 rounded-full ${faceDetectionStatus.includes('⚠️') ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
            </div>
            
            <div className="relative aspect-square sm:aspect-video bg-gray-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transform scale-x-[-1] ${cameraActive ? 'opacity-100' : 'opacity-30'}`}
              />
              {!cameraActive && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-white animate-spin opacity-50" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-[2px] py-1 px-2 text-center pointer-events-none">
                <p className="text-[8px] sm:text-[10px] font-bold text-white truncate drop-shadow-md">
                  {faceDetectionStatus}
                </p>
              </div>
            </div>
          </div>
          
          {/* Status Badge below widget for extra clarity */}
          <div className="mt-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm border border-gray-200 hidden sm:block max-w-[176px]">
            {cameraError ? (
              <p className="text-[9px] text-red-600 font-bold truncate">⚠️ Camera Error: {cameraError}</p>
            ) : (
              <p className={`text-[9px] font-bold truncate ${faceDetectionStatus.includes('⚠️') ? 'text-red-600' : 'text-blue-600'}`}>
                {faceWarnings > 0 ? `Warnings: ${faceWarnings}/5` : 'Monitoring Active'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
