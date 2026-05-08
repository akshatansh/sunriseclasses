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
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loading, result, finishTest, captureScreenshot, studentId, test.id]);

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

      {/* AI Proctoring Video Widget */}
      {!result && (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-xl shadow-2xl p-3 border-2 border-gray-100 w-48 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">AI Proctoring</span>
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                cameraError ? 'bg-orange-400' : faceDetectionStatus.includes('⚠️') ? 'bg-red-400' : 'bg-green-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                cameraError ? 'bg-orange-500' : faceDetectionStatus.includes('⚠️') ? 'bg-red-500' : 'bg-green-500'
              }`}></span>
            </span>
          </div>

          <div className="relative rounded-lg bg-gray-900 overflow-hidden aspect-[4/3] border border-gray-800 shadow-inner">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform scale-x-[-1]"
            />
            {!cameraActive && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center gap-1">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span className="text-[9px] text-gray-400 font-medium">
                  {cameraRetrying ? 'Starting...' : 'Starting Camera...'}
                </span>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center gap-1 bg-gray-900">
                <CameraOff className="h-6 w-6 text-orange-400" />
                <span className="text-[9px] text-orange-300 font-medium">
                  {cameraError === 'permission_denied' ? 'Camera Blocked' :
                   cameraError === 'no_device' ? 'No Camera Found' : 'Camera Error'}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 text-center">
            {cameraError ? (
              <>
                <p className="text-[10px] font-bold text-orange-600">
                  {cameraError === 'permission_denied' ? 'Allow camera to enable AI' :
                   cameraError === 'no_device' ? 'No camera detected' : 'Camera unavailable'}
                </p>
                {cameraError === 'permission_denied' && (
                  <button
                    onClick={() => {
                      setShowCameraGuide(true);
                    }}
                    className="mt-1 text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded hover:bg-blue-200 transition-colors"
                  >
                    How to Allow?
                  </button>
                )}
              </>
            ) : (
              <>
                <p className={`text-[11px] font-bold ${
                  faceDetectionStatus.includes('⚠️') ? 'text-red-600' : 'text-green-600'
                }`}>
                  {faceDetectionStatus}
                </p>
                {faceWarnings > 0 && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 bg-red-50 py-0.5 rounded">
                    Strikes: {faceWarnings} / 5
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
