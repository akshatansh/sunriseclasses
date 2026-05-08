import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OnlineTest, OnlineTestQuestion, getTestQuestions, submitTest, logProctoringEvent } from '../lib/onlineTests';
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Camera, CameraOff, RefreshCw, Share2, Award, Download, Smartphone, Users, BookOpen } from 'lucide-react';
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
  const [isDownloading, setIsDownloading] = useState(false); // For JPG download state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

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
  const [antiCheatReady, setAntiCheatReady] = useState(false); // Grace period: activates 3s after test start
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [isTestStarted, setIsTestStarted] = useState(false);
  const cameraStartRef = useRef<(() => void) | null>(null);
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const finishTest = useCallback(async (forced: boolean = false, isRetry: boolean = false) => {
    if (submitting || result) return;
    setSubmitting(true);

    // Stop camera immediately on submit
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);

    try {
      const finalResult = await submitTest(
        { student_id: studentId, test_id: test.id, cheat_warnings: cheatWarnings + faceWarnings },
        answers
      );
      localStorage.removeItem(`test_progress_${test.id}_${studentId}`);
      setResult({ score: finalResult.score, total: finalResult.total_marks });
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
      setShowSubmitSummary(false);
    } catch (err) {
      console.error('Error submitting test:', err);
      setSubmitting(false); // Must reset so retry/user can try again
      if (!isRetry) {
        showSubtleMessage('❌ Network Error! Retrying in 3 seconds...');
        setTimeout(() => finishTest(forced, true), 3000);
      } else {
        showSubtleMessage('❌ Submission failed. Please check connection and try submitting again.');
      }
      return; // Exit early — do NOT fall through to setSubmitting(false) again
    }
    setSubmitting(false); // Only reached on success
  }, [answers, cheatWarnings, faceWarnings, result, studentId, submitting, test.id, showSubtleMessage]);

  // Load Questions
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const storageKey = `test_progress_${test.id}_${studentId}`;
        const savedProgress = localStorage.getItem(storageKey);

        if (savedProgress) {
          const parsed = JSON.parse(savedProgress);
          // Only use cached progress if questions exist AND time is still valid
          if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0 && parsed.timeLeft > 0) {
            setQuestions(parsed.questions);
            setAnswers(parsed.answers || {});
            setMarkedForReview(parsed.markedForReview || {});
            if (parsed.timeLeft < timeLeft) setTimeLeft(parsed.timeLeft);
            setLoading(false);
            return;
          } else {
            // Stale or invalid cache — clear it
            localStorage.removeItem(storageKey);
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

  // Timer — only runs when test is loaded and actively running
  useEffect(() => {
    if (loading || result || !isTestStarted) return; // Don't tick timer before test starts

    const timerId = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          finishTest(true); // auto submit on timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [loading, result, isTestStarted, finishTest]);

  // Anti-Cheat: Visibility Change (Tab Switch)
  // NOTE: We wait 3 seconds after test start before activating to prevent
  // fullscreen transition from causing false-positive auto-submissions.
  useEffect(() => {
    if (loading || result || !antiCheatReady) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        const blob = await captureScreenshot();
        logProctoringEvent(test.id, studentId, 'Switched Tab / Minimized Browser', blob);

        setCheatWarnings(prev => {
          const newCount = prev + 1;
          if (newCount >= 5) {
            showSubtleMessage('Bahut zyada cheating pakdi gayi! Test submit ho raha hai...');
            finishTest(true);
          } else {
            showSubtleMessage(`⚠️ Warning ${newCount}/5: Tab switch pakda gaya! Dobara mat karna.`);
          }
          return newCount;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // NOTE: blur/focus listeners removed - they fire too aggressively during
    // fullscreen transitions and camera permission prompts, causing false positives.

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading, result, finishTest, captureScreenshot, studentId, test.id, showSubtleMessage, antiCheatReady]);

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
          showSubtleMessage(`Bahut zyada AI warnings! Test submit ho raha hai...`);
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
        streamRef.current = stream;

        // Wait for metadata before calling play() — this fixes black screen on mobile.
        // Calling play() immediately after setting srcObject fails silently on iOS/Android.
        await new Promise<void>((resolve) => {
          if (!videoRef.current) { resolve(); return; }
          const onReady = () => {
            videoRef.current?.play()
              .then(() => setCameraActive(true))
              .catch(() => setCameraActive(true)); // Still show even if autoplay fails
            resolve();
          };
          videoRef.current.onloadedmetadata = onReady;
          // iOS Safari fires 'canplay' more reliably than 'loadedmetadata'
          videoRef.current.oncanplay = onReady;
          // Timeout fallback — if neither event fires in 3s, force it
          setTimeout(() => {
            videoRef.current?.play().catch(() => { });
            setCameraActive(true);
            resolve();
          }, 3000);
        });
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
              setFaceDetectionStatus(`⚠️ ${studentName.split(' ')[0]}, camera mein dekho!`);
              handleWarning(`${studentName.split(' ')[0]}, camera mein dekho! Chehra nahi dikh raha.`);
            } else if (predictions.length > 1) {
              setFaceDetectionStatus(`⚠️ ${studentName.split(' ')[0]}, akele baithiye!`);
              handleWarning(`${studentName.split(' ')[0]}, akele baithiye! Ek se zyada chehra dikh raha hai.`);
            } else {
              // Check Face Orientation / "Eye Contact" using landmarks
              const face = predictions[0] as any;
              if (face.landmarks && face.landmarks.length >= 3) {
                const rightEye = face.landmarks[0]; // viewer's left
                const leftEye = face.landmarks[1];  // viewer's right
                const nose = face.landmarks[2];

                const eyeDistance = Math.abs(leftEye[0] - rightEye[0]);
                // Distance from nose to each eye
                const noseToRightEye = Math.abs(nose[0] - rightEye[0]);
                const noseToLeftEye = Math.abs(nose[0] - leftEye[0]);

                // If nose is too close to one eye (less than 25% of total eye distance), 
                // the face is turned significantly left or right
                if (eyeDistance > 10) { // avoid division by zero or tiny faces
                  if (noseToRightEye < eyeDistance * 0.25 || noseToLeftEye < eyeDistance * 0.25) {
                    setFaceDetectionStatus(`⚠️ ${studentName.split(' ')[0]}, screen par dhyan do!`);
                    handleWarning(`${studentName.split(' ')[0]}, idhar-udhar mat dekhiye! Apna dhyan screen par rakhiye.`);
                    return;
                  }
                }
              }
              setFaceDetectionStatus('Monitoring Active ✓');
            }
          }
        }, 8000); // Increased interval to 8 seconds for better performance on slow devices
      } catch (e) { }
    };

    cameraStartRef.current = startCameraAndAI;
    startCameraAndAI();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraActive(false);
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
      const shareUrl = `https://sunriseclasses.co.in/online-tests`;
      const text = `Hey! I just scored ${result.score}/${result.total} in the ${test.title} at Sunrise Classes! 🏆 Check it out!`;

      try {
        // Try to share as a file if supported
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1700;
        // ... we would need the drawing logic here too, or reuse a hidden canvas
        // For now, let's just stick to URL/Text share but improve the fallback

        if (navigator.share) {
          await navigator.share({
            title: 'My Sunrise Classes Result',
            text: text,
            url: shareUrl
          });
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
        }
      } catch (err) { }
    };

    const downloadCertificate = async () => {
      setIsDownloading(true);
      try {
        const W = 1600, H = 2260;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Triple-fallback image loader: Direct Blob -> weserv proxy -> img tag
        const loadImage = async (src: string): Promise<HTMLImageElement> => {
          const tryBlob = async (url: string) => {
            const r = await fetch(url, { mode: 'cors', cache: 'no-cache' });
            if (!r.ok) throw new Error('fetch failed');
            const blob = await r.blob();
            return new Promise<HTMLImageElement>((res, rej) => {
              const img = new Image();
              img.onload = () => res(img); img.onerror = rej;
              img.src = URL.createObjectURL(blob);
            });
          };
          try { return await tryBlob(src + (src.includes('?') ? '&' : '?') + '_t=' + Date.now()); } catch (e1) { }
          try { return await tryBlob(`https://images.weserv.nl/?url=${encodeURIComponent(src.replace(/^https?:\/\//, ''))}&_t=${Date.now()}`); } catch (e2) { }
          return new Promise((res, rej) => {
            const img = new Image(); img.crossOrigin = 'anonymous';
            img.onload = () => res(img); img.onerror = rej; img.src = src;
          });
        };

        const cx = W / 2;
        const B = 36;

        // 1. BACKGROUND — warm ivory with dot watermark
        ctx.fillStyle = '#FDFAF3';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(15,23,42,0.035)';
        for (let x = 48; x < W; x += 52) {
          for (let y = 48; y < H; y += 52) {
            ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
          }
        }

        // 2. OUTER FRAME — thick navy bars + gold inner line
        ctx.fillStyle = '#0D1B3E';
        ctx.fillRect(0, 0, W, B); ctx.fillRect(0, H - B, W, B);
        ctx.fillRect(0, 0, B, H); ctx.fillRect(W - B, 0, B, H);
        ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 6;
        ctx.strokeRect(B + 16, B + 16, W - (B + 16) * 2, H - (B + 16) * 2);
        ctx.strokeStyle = '#0D1B3E'; ctx.lineWidth = 2;
        ctx.strokeRect(B + 30, B + 30, W - (B + 30) * 2, H - (B + 30) * 2);

        // Corner ornaments
        const drawCorner = (ox: number, oy: number, fx: number, fy: number) => {
          ctx.save(); ctx.translate(ox, oy); ctx.scale(fx, fy);
          ctx.fillStyle = '#C9A84C';
          ctx.fillRect(0, 0, 90, 6); ctx.fillRect(0, 0, 6, 90);
          ctx.beginPath(); ctx.arc(18, 18, 12, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        };
        drawCorner(B + 12, B + 12, 1, 1); drawCorner(W - B - 12, B + 12, -1, 1);
        drawCorner(B + 12, H - B - 12, 1, -1); drawCorner(W - B - 12, H - B - 12, -1, -1);

        // 3. HEADER — full-width navy gradient
        const hGrad = ctx.createLinearGradient(0, B, 0, B + 545);
        hGrad.addColorStop(0, '#0D1B3E'); hGrad.addColorStop(1, '#162C5C');
        ctx.fillStyle = hGrad;
        ctx.fillRect(B, B, W - B * 2, 545);
        ctx.fillStyle = '#C9A84C'; ctx.fillRect(B, B + 545, W - B * 2, 8);

        // Logo in header with gold ring
        try {
          const logo = await loadImage('/sunrise-logo.png');
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, B + 148, 92, 0, Math.PI * 2); ctx.clip();
          ctx.drawImage(logo, cx - 92, B + 56, 184, 184); ctx.restore();
          ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 7;
          ctx.beginPath(); ctx.arc(cx, B + 148, 98, 0, Math.PI * 2); ctx.stroke();
        } catch (e) {
          ctx.fillStyle = '#C9A84C';
          ctx.beginPath(); ctx.arc(cx, B + 148, 80, 0, Math.PI * 2); ctx.fill();
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 90px Georgia, serif';
        ctx.fillText('SUNRISE CLASSES', cx, B + 330);
        ctx.fillStyle = '#C9A84C'; ctx.font = '38px Georgia, serif';
        ctx.fillText('AN INSTITUTE OF EXCELLENCE', cx, B + 384);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '28px sans-serif';
        ctx.fillText('Champanagar, Purnia, Bihar  •  Est. 2012', cx, B + 430);

        // Divider
        const divY = B + 468;
        ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - 300, divY); ctx.lineTo(cx - 22, divY); ctx.stroke();
        ctx.fillStyle = '#C9A84C'; ctx.beginPath(); ctx.arc(cx, divY, 14, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 22, divY); ctx.lineTo(cx + 300, divY); ctx.stroke();

        // 4. CERTIFICATE TITLE
        ctx.fillStyle = '#C9A84C'; ctx.font = 'bold 72px Georgia, serif';
        ctx.fillText('CERTIFICATE OF ACHIEVEMENT', cx, B + 655);
        ctx.fillStyle = '#64748B'; ctx.font = 'italic 40px Georgia, serif';
        ctx.fillText('This is to proudly certify that', cx, B + 735);

        // 5. STUDENT PHOTO with double gold ring
        const pCx = cx, pCy = B + 1018, pR = 162;
        ctx.shadowColor = 'rgba(0,0,0,0.22)'; ctx.shadowBlur = 36;
        ctx.fillStyle = '#E8ECF4';
        ctx.beginPath(); ctx.arc(pCx, pCy, pR + 18, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

        if (studentPhoto) {
          try {
            const pUrl = studentPhoto.includes('supabase.co')
              ? `https://images.weserv.nl/?url=${encodeURIComponent(studentPhoto.replace(/^https?:\/\//, ''))}&w=400&h=400&fit=cover&_t=${Date.now()}`
              : studentPhoto;
            const pImg = await loadImage(pUrl);
            ctx.save();
            ctx.beginPath(); ctx.arc(pCx, pCy, pR, 0, Math.PI * 2); ctx.clip();
            ctx.drawImage(pImg, pCx - pR, pCy - pR, pR * 2, pR * 2);
            ctx.restore();
          } catch (e) {
            ctx.fillStyle = '#CBD5E1';
            ctx.beginPath(); ctx.arc(pCx, pCy, pR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0D1B3E'; ctx.font = 'bold 90px sans-serif';
            ctx.fillText(studentName.charAt(0).toUpperCase(), pCx, pCy + 32);
          }
        } else {
          ctx.fillStyle = '#E2E8F0';
          ctx.beginPath(); ctx.arc(pCx, pCy, pR, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 90px sans-serif';
          ctx.fillText(studentName.charAt(0).toUpperCase(), pCx, pCy + 32);
        }
        ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 11;
        ctx.beginPath(); ctx.arc(pCx, pCy, pR + 10, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#F5D78E'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(pCx, pCy, pR + 22, 0, Math.PI * 2); ctx.stroke();

        // 6. STUDENT NAME — Title Case, italic elegant script style
        const toTitleCase = (str: string) => str.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
        const displayName = toTitleCase(studentName);

        // Shadow for name
        ctx.shadowColor = 'rgba(13,27,62,0.12)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
        ctx.fillStyle = '#0D1B3E'; ctx.font = 'bold italic 88px Georgia, serif';
        ctx.fillText(displayName, cx, B + 1258);
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

        const nW = ctx.measureText(displayName).width;
        const ulG = ctx.createLinearGradient(cx - nW / 2, 0, cx + nW / 2, 0);
        ulG.addColorStop(0, 'transparent'); ulG.addColorStop(0.5, '#C9A84C'); ulG.addColorStop(1, 'transparent');
        ctx.strokeStyle = ulG; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(cx - nW / 2, B + 1276); ctx.lineTo(cx + nW / 2, B + 1276); ctx.stroke();

        ctx.fillStyle = '#475569'; ctx.font = 'italic 40px Georgia, serif';
        ctx.fillText('has successfully demonstrated outstanding performance in', cx, B + 1346);
        // Test title in Title Case, not ALL CAPS
        ctx.fillStyle = '#1E40AF'; ctx.font = 'bold 58px Georgia, serif';
        ctx.fillText(toTitleCase(test.title), cx, B + 1424);
        ctx.fillStyle = '#64748B'; ctx.font = '32px sans-serif';
        ctx.fillText('Subject: ' + test.subject + '  |  ' + (test.class_name || ''), cx, B + 1478);

        // 7. SCORE BOX — navy gradient card
        const pct = Math.round((result.score / result.total) * 100);
        const grade = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 45 ? 'C' : 'D';
        const sbGrad = ctx.createLinearGradient(cx - 380, 0, cx + 380, 0);
        sbGrad.addColorStop(0, '#0D1B3E'); sbGrad.addColorStop(1, '#1E3A8A');
        ctx.fillStyle = sbGrad;
        const sbY = B + 1536;
        if ((ctx as any).roundRect) (ctx as any).roundRect(cx - 380, sbY, 760, 240, 28);
        else ctx.rect(cx - 380, sbY, 760, 240);
        ctx.fill();
        ctx.fillStyle = '#C9A84C'; ctx.fillRect(cx - 380, sbY, 760, 8);

        ctx.fillStyle = '#94A3B8'; ctx.font = 'bold 28px sans-serif';
        ctx.fillText('SCORE', cx - 170, sbY + 62); ctx.fillText('PERCENTAGE', cx + 110, sbY + 62);
        ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 100px Georgia, serif';
        ctx.fillText(result.score + '/' + result.total, cx - 150, sbY + 178);
        ctx.fillStyle = '#C9A84C'; ctx.font = 'bold 88px Georgia, serif';
        ctx.fillText(pct + '%', cx + 160, sbY + 178);
        ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.font = '28px sans-serif';
        ctx.fillText('Grade: ' + grade, cx, sbY + 218);

        // Date
        ctx.fillStyle = '#64748B'; ctx.font = 'italic 32px Georgia, serif';
        const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
        ctx.fillText('Issued: ' + dateStr, cx, sbY + 300);

        // 8. SEAL + SIGNATURE
        const sY = sbY + 440;
        const sealX = cx - 390;
        ctx.strokeStyle = '#C9A84C'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(sealX, sY, 88, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sealX, sY, 68, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#C9A84C';
        ctx.beginPath(); ctx.arc(sealX, sY, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0D1B3E'; ctx.font = 'bold 19px sans-serif';
        ctx.fillText('OFFICIAL', sealX, sY - 22); ctx.fillText('VERIFIED', sealX, sY + 4); ctx.fillText('SEAL', sealX, sY + 28);

        const sigX = cx + 290;
        ctx.fillStyle = '#1E3A8A'; ctx.font = 'bold italic 54px Georgia, serif';
        ctx.fillText('S. P. Jha', sigX, sY - 12);
        ctx.strokeStyle = '#0D1B3E'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sigX - 170, sY + 18); ctx.lineTo(sigX + 170, sY + 18); ctx.stroke();
        ctx.fillStyle = '#475569'; ctx.font = 'bold 28px sans-serif';
        ctx.fillText('Surya Parkash Jha', sigX, sY + 56);
        ctx.font = '24px sans-serif';
        ctx.fillText('Director, Sunrise Classes', sigX, sY + 88);

        // 9. FOOTER STRIP
        ctx.fillStyle = '#0D1B3E';
        ctx.fillRect(B, H - B - 108, W - B * 2, 108);
        ctx.fillStyle = '#C9A84C'; ctx.font = 'bold 26px sans-serif';
        ctx.fillText('sunriseclasses.co.in  \u2022  9973152070  \u2022  Champanagar, Purnia, Bihar', cx, H - B - 62);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '20px monospace';
        ctx.fillText('Certificate ID: SC-' + test.id.slice(0, 8).toUpperCase() + '-' + studentId.slice(0, 4).toUpperCase(), cx, H - B - 26);

        // DOWNLOAD via Blob (works on all devices including mobile gallery)
        canvas.toBlob((blob) => {
          if (!blob) { alert('Certificate generation failed.'); return; }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = 'Sunrise_Certificate_' + studentName.replace(/\s+/g, '_') + '.jpg';
          link.href = url;
          document.body.appendChild(link); link.click(); document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }, 'image/jpeg', 0.97);

      } catch (err) {
        console.error('Certificate error:', err);
        alert('Certificate download failed. Please try again.');
      } finally {
        setIsDownloading(false);
      }
    };;

    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 sm:p-8">
        <div className="max-w-2xl w-full animate-in fade-in zoom-in duration-1000">
          {/* Branded Certificate Card */}
          <div id="result-card" className="bg-white rounded-[3rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.7)] border-[16px] border-slate-900 relative">
            {/* Artistic Inner Border */}
            <div className="absolute inset-0 border-[2px] border-yellow-500/40 m-4 rounded-[2.5rem] pointer-events-none"></div>

            {/* Header Section */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-12 text-center text-white relative overflow-hidden">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>

              <div className="absolute top-8 right-8 bg-yellow-500 text-black text-[10px] font-black px-4 py-2 rounded-full rotate-12 shadow-2xl border-2 border-white flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> VERIFIED
              </div>

              <img src="/sunrise-logo.png" alt="Logo" className="h-24 w-24 mx-auto mb-6 bg-white rounded-3xl p-3 shadow-2xl transform hover:rotate-6 transition-transform duration-500" />
              <h2 className="text-4xl font-black tracking-tight uppercase mb-2 drop-shadow-2xl">Sunrise Classes</h2>
              <p className="text-xs text-blue-300 font-bold tracking-[0.4em] uppercase opacity-90">Champanagar, Purnia, Bihar</p>
              <div className="mt-4 h-1 w-24 bg-yellow-500 mx-auto rounded-full"></div>
            </div>

            <div className="p-12 text-center bg-white relative">
              {/* Student Profile with Aura */}
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-2xl animate-pulse"></div>
                {studentPhoto ? (
                  <img src={studentPhoto} className="h-36 w-36 rounded-full object-cover border-8 border-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative z-10" />
                ) : (
                  <div className="h-36 w-36 rounded-full bg-slate-50 border-8 border-white shadow-2xl flex items-center justify-center relative z-10">
                    <Award className="h-16 w-16 text-yellow-500" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-full shadow-2xl border-4 border-white z-20">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>

              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Certificate of Achievement</p>
              <h3 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{studentName}</h3>
              <p className="text-lg text-slate-500 font-medium italic mb-10">Successfully completed the official test with distinction</p>

              {/* Score Showcase */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 py-8 px-10 rounded-[2.5rem] mb-10 border border-slate-200 shadow-inner relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Award className="h-20 w-20 text-slate-900" />
                </div>
                <p className="text-xs text-blue-600 font-black uppercase mb-4 tracking-[0.2em]">{test.title}</p>
                <div className="flex items-end justify-center gap-3">
                  <span className="text-8xl font-black text-slate-900 leading-none tabular-nums tracking-tighter">{result.score}</span>
                  <span className="text-3xl font-bold text-slate-300 mb-2 tracking-widest">/ {result.total}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-left border-t border-slate-100 pt-10">
                <div className="group">
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <BookOpen className="h-3 w-3 text-blue-500" /> Subject
                  </p>
                  <p className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{test.subject}</p>
                </div>
                <div className="group">
                  <p className="text-xs text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldAlert className="h-3 w-3 text-emerald-500" /> Accuracy
                  </p>
                  <p className="text-xl font-bold text-emerald-600 group-hover:scale-105 transition-transform origin-left">{Math.round((result.score / result.total) * 100)}% Result</p>
                </div>
              </div>
            </div>

            {/* Footer Seal */}
            <div className="bg-slate-50/80 p-8 text-center border-t border-dashed border-slate-200 flex flex-col items-center gap-3">
              <div className="h-10 w-10 bg-yellow-500/10 rounded-full flex items-center justify-center border border-yellow-500/20">
                <CheckCircle className="h-5 w-5 text-yellow-600" />
              </div>
              <p className="text-xs text-slate-500 font-bold italic">Dedicated to Quality Education since 2012</p>
              <p className="text-[10px] text-slate-300 font-mono">ID: SC-{test.id.slice(0, 4)}-{studentId.slice(0, 4)}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4 px-4 pb-10">
            <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-400/20 text-center">
              <p className="text-blue-300 text-sm font-bold">🎉 Social Media par share karein aur coaching ko tag karein! Sunriseclasses81 📸</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={downloadCertificate}
                disabled={isDownloading}
                className="bg-white text-gray-900 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-2xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
              >
                <Download className={`h-5 w-5 ${isDownloading ? 'animate-spin' : ''}`} /> {isDownloading ? 'Saving...' : 'Save JPG'}
              </button>
              <button
                onClick={handleShare}
                className="bg-green-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-green-700 shadow-2xl transition-all active:scale-95"
              >
                <Share2 className="h-5 w-5" /> Share
              </button>
            </div>

            <button
              onClick={onComplete}
              className="w-full bg-white/5 text-white/60 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-xs"
            >
              Back to Portal
            </button>
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
              // Activate anti-cheat only after a 3-second grace period.
              // This prevents fullscreen transition + camera permission dialogs
              // from being falsely detected as tab-switch cheating events.
              setTimeout(() => setAntiCheatReady(true), 3000);
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
      <style dangerouslySetInnerHTML={{
        __html: `
        /* Hide global layout elements during test */
        header, footer, nav, .navbar, .whatsapp-float, #whatsapp-widget, [class*="whatsapp"], [id*="whatsapp"], .wa-float, .floating-whatsapp { display: none !important; }
        
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] w-max max-w-[88vw]">
          <div className={`backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/20 ${activeMessage.includes('⚠️') || activeMessage.includes('Warning') || activeMessage.includes('pakda') || activeMessage.includes('dekho') ? 'bg-red-600/95' : 'bg-gray-900/90'}`}>
            <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
            <p className="text-sm font-bold">{activeMessage}</p>
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

      {/* Plain Dedicated Test Navbar */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-2xl">
        <div className="h-1 bg-white/10 w-full overflow-hidden">
          <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-white/5 pr-3 pl-2 py-1.5 rounded-full border border-white/10">
              {studentPhoto ? (
                <img src={studentPhoto} alt="Student" className="h-9 w-9 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-yellow-500/50" />
              ) : (
                <div className="h-9 w-9 sm:h-12 sm:w-12 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white/20">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              )}
              <div>
                <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest leading-tight">Student</p>
                <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[80px] sm:max-w-none">{studentName.split(" ")[0]}</p>
              </div>
            </div>

            <div className="hidden md:block">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">Subject</p>
              <p className="text-sm font-bold text-white/90">{test.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            {/* AI Monitoring Status (Minimal) - hidden on mobile */}
            {!result && (
              <div className="hidden sm:flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                <div className="flex flex-col items-end">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter leading-none mb-1">AI PROCTORING</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{faceDetectionStatus.includes('⚠️') ? 'ALERT' : 'ACTIVE'}</span>
                    <div className={`h-1.5 w-1.5 rounded-full ${faceDetectionStatus.includes('⚠️') ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex flex-col items-center justify-center min-w-[80px] sm:min-w-[120px] px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border-2 transition-all duration-500 ${timeLeft < 300 ? 'bg-red-500/20 border-red-500 animate-pulse scale-105' : 'bg-white/5 border-white/10'}`}>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Time Remaining</p>
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${timeLeft < 300 ? 'text-red-400' : 'text-yellow-500'}`} />
                <span className={`text-lg sm:text-xl font-black font-mono leading-none ${timeLeft < 300 ? 'text-white' : 'text-yellow-500'}`}>{formatTime(timeLeft)}</span>
              </div>
            </div>

            <button
              onClick={() => setLanguage(l => l === 'EN' ? 'HI' : 'EN')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors text-xs font-bold"
            >
              <RefreshCw className="h-3 w-3" /> {language === 'EN' ? 'HI' : 'EN'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 mt-4 sm:mt-6 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8 pb-32 sm:pb-20">
        <div className="lg:col-span-3 space-y-6">
          {questions.length > 0 && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              {(() => {
                const q = questions[currentQuestionIdx];
                const idx = currentQuestionIdx;
                return (
                  <div key={q.id} className={`bg-white rounded-2xl shadow-xl border-2 p-4 sm:p-8 ${answers[q.id] ? 'border-blue-500/20' : 'border-gray-100'}`}>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className={`flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-base sm:text-xl font-black shadow-lg ${answers[q.id] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {idx + 1}
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex-grow">
                            {q.question_image && (
                              <div className="mb-6 rounded-2xl overflow-hidden border-4 border-gray-50 shadow-inner max-w-xl bg-gray-50 group relative">
                                <img src={q.question_image} alt="Question Diagram" className="w-full h-auto object-contain transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Diagram</div>
                              </div>
                            )}
                            <p className="font-bold text-gray-900 leading-relaxed text-base sm:text-xl" style={{ fontSize: `${Math.min(fontSize, 18)}px` }}>{q.question_text}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => readQuestion(q.question_text)}
                              className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                              title="Listen to question"
                            >
                              <RefreshCw className="h-5 w-5 transform rotate-90" />
                            </button>
                            <button
                              onClick={() => setMarkedForReview(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                              className={`text-xs font-black px-4 py-2 rounded-xl transition-all ${markedForReview[q.id] ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-400/30' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                              {markedForReview[q.id] ? 'MARKED' : 'MARK'}
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const isSelected = answers[q.id] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleOptionSelect(q.id, opt)}
                                className={`text-left px-4 py-4 sm:px-6 sm:py-5 rounded-xl sm:rounded-2xl border-2 transition-all group relative overflow-hidden active:scale-95 ${isSelected ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/10' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
                              >
                                {isSelected && <div className="absolute top-0 right-0 p-2 text-blue-600"><CheckCircle className="h-5 w-5" /></div>}
                                <span className={`font-black mr-3 ${isSelected ? 'text-blue-600' : 'text-gray-300'}`}>{opt}.</span>
                                <span className={`font-semibold ${isSelected ? 'text-gray-900' : 'text-gray-700'}`} style={{ fontSize: `${fontSize - 2}px` }}>
                                  {q[`option_${opt.toLowerCase()}` as keyof OnlineTestQuestion] as string}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Navigation Controls */}
              <div className="flex items-center justify-between mt-10">
                <button
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                  className="px-4 sm:px-8 py-3 sm:py-4 bg-white border-2 border-gray-100 rounded-xl sm:rounded-2xl font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2 text-sm sm:text-base"
                >
                  ← Previous
                </button>

                <div className="text-gray-400 font-black tracking-widest text-sm">
                  {currentQuestionIdx + 1} / {questions.length}
                </div>

                {currentQuestionIdx === questions.length - 1 ? (
                  <button
                    onClick={() => setShowSubmitSummary(true)}
                    className="px-4 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-xl sm:rounded-2xl font-black shadow-lg shadow-green-600/30 hover:bg-green-700 transition-all active:scale-95 text-sm sm:text-base"
                  >
                    Finish Test
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="px-4 sm:px-10 py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 text-sm sm:text-base"
                  >
                    Next Question →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block sticky top-24">
          <div className="bg-white rounded-xl border p-6">
            <h3 className="text-sm font-bold mb-4 uppercase tracking-wider">{t.navigator}</h3>
            <div className="palette-grid">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => setCurrentQuestionIdx(i)} className={`h-10 w-10 rounded-lg text-xs font-bold flex items-center justify-center border-2 transition-all ${currentQuestionIdx === i ? 'ring-2 ring-blue-600 ring-offset-2' : ''} ${answers[q.id] ? 'bg-blue-600 border-blue-600 text-white shadow-md' : markedForReview[q.id] ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-200'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button onClick={() => setShowPalette(true)} className="lg:hidden fixed bottom-4 left-4 z-40 bg-gray-900 text-white p-3 rounded-full shadow-2xl flex items-center gap-2 text-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
        Nav
      </button>
      {showPalette && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm lg:hidden p-4">
          <div className="bg-white rounded-2xl p-6 mt-10 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6"><h3 className="font-bold">{t.jump}</h3><button onClick={() => setShowPalette(false)}>✕</button></div>
            <div className="palette-grid">
              {questions.map((q, i) => (
                <button key={q.id} onClick={() => { setCurrentQuestionIdx(i); setShowPalette(false); }} className={`h-12 w-12 rounded-xl text-sm font-bold flex items-center justify-center border-2 ${currentQuestionIdx === i ? 'ring-2 ring-blue-600 ring-offset-2' : ''} ${answers[q.id] ? 'bg-blue-600 border-blue-600 text-white' : markedForReview[q.id] ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-200'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SECURITY MONITOR */}
      {!result && (
        <div className="fixed bottom-4 right-3 z-[200] group">
          <div className="relative">
            <div className="absolute inset-0 bg-red-600/20 rounded-2xl blur-xl animate-pulse group-hover:bg-blue-600/20"></div>
            <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl w-36 sm:w-48 flex flex-col transition-all duration-500 hover:scale-105">
              {/* Camera Viewport */}
              <div className="relative bg-black" style={{ height: '120px' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-500 ${cameraActive ? 'opacity-100' : 'opacity-0'}`}
                />
                {/* LIVE badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-[9px] font-black text-white tracking-widest uppercase">LIVE</span>
                </div>
                {/* Timestamp */}
                <div className="absolute bottom-1.5 right-2 text-[8px] font-mono text-white/40">
                  {new Date().toLocaleTimeString()}
                </div>
                {/* Warning overlay when face not detected */}
                {faceDetectionStatus.includes('⚠️') && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-900/70 backdrop-blur-[2px]">
                    <p className="text-[11px] font-black text-white text-center px-2 animate-pulse uppercase leading-snug">
                      {studentName.split(' ')[0]},<br />camera mein dekho!
                    </p>
                  </div>
                )}
              </div>
              {/* Footer */}
              <div className="bg-[#080d1a] px-2 py-2 flex flex-col items-center justify-center border-t border-white/10 text-center gap-0.5">
                <p className="text-[11px] font-black text-blue-400 uppercase tracking-wide leading-tight">S.P Sir Monitor</p>
                <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest leading-tight">Your Camera</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
