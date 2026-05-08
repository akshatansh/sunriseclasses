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

  const finishTest = useCallback(async (forced: boolean = false) => {
    if (submitting || result) return;
    setSubmitting(true);

    // Stop camera explicitly immediately on submit
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);

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
      if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
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
        streamRef.current = stream; // Store in ref
        try {
          await videoRef.current.play();
          setCameraActive(true); // Show video immediately
        } catch (e) { }
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
        const canvas = document.createElement('canvas');
        canvas.width = 1500; // Increased resolution
        canvas.height = 2100;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Helper to load images safely using Blob fetch (More reliable for Canvas/CORS)
        const loadImage = async (src: string): Promise<HTMLImageElement> => {
          try {
            // Add cache buster
            const cacheBuster = `cb=${new Date().getTime()}`;
            const url = src.includes('?') ? `${src}&${cacheBuster}` : `${src}?${cacheBuster}`;
            
            // Fetch as blob first to bypass some canvas tainting issues
            const response = await fetch(url);
            if (!response.ok) throw new Error("Fetch failed");
            const blob = await response.blob();
            
            return new Promise((res, rej) => {
              const img = new Image();
              img.onload = () => {
                // Important: Clean up the object URL after loading
                // URL.revokeObjectURL(img.src); // We can't do this here yet as we need it to draw
                res(img);
              };
              img.onerror = rej;
              img.src = URL.createObjectURL(blob);
            });
          } catch (e) {
            console.error("loadImage failed, trying fallback:", e);
            // Fallback to traditional image loading if fetch fails
            return new Promise((res, rej) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = src;
              img.onload = () => res(img);
              img.onerror = rej;
            });
          }
        };

        // 1. Premium Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1500, 2100);

        // Subtle Pattern Background
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        for (let i = 0; i < 1500; i += 40) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 2100); ctx.stroke();
        }
        for (let i = 0; i < 2100; i += 40) {
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1500, i); ctx.stroke();
        }

        // 2. Heavy Borders
        // Outer Navy
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 80;
        ctx.strokeRect(40, 40, 1420, 2020);

        // Inner Gold Accent
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 15;
        ctx.strokeRect(95, 95, 1310, 1910);

        // Corner Patterns
        ctx.fillStyle = '#eab308';
        const cs = 150;
        ctx.fillRect(40, 40, cs, cs);
        ctx.fillRect(1310, 40, cs, cs);
        ctx.fillRect(40, 1910, cs, cs);
        ctx.fillRect(1310, 1910, cs, cs);

        // 3. Header Section (Dark Blue Card)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(110, 110, 1280, 500);

        // Logo Rendering
        try {
          const logo = await loadImage('/sunrise-logo.png');
          ctx.drawImage(logo, 675, 150, 150, 150); // Centered logo
        } catch (e) {
          // Fallback if logo fails
          ctx.fillStyle = '#eab308';
          ctx.beginPath(); ctx.arc(750, 225, 75, 0, Math.PI * 2); ctx.fill();
        }

        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 110px serif';
        ctx.fillText('SUNRISE CLASSES', 750, 430);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText('AN INSTITUTE OF EXCELLENCE • CHAMPANAGAR, PURNIA', 750, 500);

        // 4. Certificate Content
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 70px serif';
        ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 750, 750);

        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 45px serif';
        ctx.fillText('This is to proudly certify that', 750, 880);

        // Student Photo
        const photoY = 1080;
        const photoSize = 280;
        if (studentPhoto) {
          try {
            const img = await loadImage(studentPhoto);
            ctx.save();
            ctx.beginPath();
            ctx.arc(750, photoY, photoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, 750 - photoSize / 2, photoY - photoSize / 2, photoSize, photoSize);
            ctx.restore();
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 12;
            ctx.stroke();
          } catch (e) {
            // Initial placeholder if photo fails
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath(); ctx.arc(750, photoY, photoSize / 2, 0, Math.PI * 2); ctx.fill();
          }
        }

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 100px sans-serif';
        ctx.fillText(studentName.toUpperCase(), 750, 1320);

        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 40px serif';
        ctx.fillText('has demonstrated outstanding performance in the', 750, 1400);

        ctx.fillStyle = '#2563eb';
        ctx.font = 'black 60px sans-serif';
        ctx.fillText(test.title.toUpperCase(), 750, 1480);

        // 5. Result Box
        const rx = 450, ry = 1580, rw = 600, rh = 200;
        ctx.fillStyle = '#f8fafc';
        if ((ctx as any).roundRect) (ctx as any).roundRect(rx, ry, rw, rh, 30); else ctx.rect(rx, ry, rw, rh);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 3; ctx.stroke();

        ctx.fillStyle = '#64748b'; ctx.font = 'bold 35px sans-serif';
        ctx.fillText('FINAL SCORE OBTAINED', 750, 1635);
        ctx.fillStyle = '#059669'; ctx.font = 'bold 90px sans-serif';
        ctx.fillText(`${result.score} / ${result.total}`, 750, 1730);

        // 6. Verified Seal & Signature
        // Seal
        ctx.fillStyle = '#eab308';
        ctx.beginPath(); ctx.arc(300, 1850, 100, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px sans-serif';
        ctx.fillText('OFFICIAL', 300, 1840); ctx.fillText('VERIFIED', 300, 1870);

        // Signature
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 40px serif';
        ctx.fillText('Surya Parkash Jha', 1200, 1850);
        ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(1050, 1865); ctx.lineTo(1350, 1865); ctx.stroke();
        ctx.font = 'bold 25px sans-serif'; ctx.fillStyle = '#64748b';
        ctx.fillText('Director, Sunrise Classes', 1200, 1900);

        // ID
        ctx.font = '18px monospace'; ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`VERIFICATION ID: SC-${test.id.slice(0, 8).toUpperCase()}`, 750, 2030);

        // Download
        const link = document.createElement('a');
        const safeName = studentName.replace(/\s+/g, '_');
        link.download = `Certificate_${safeName}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.98);
        link.click();
      } catch (err) {
        console.error(err);
        alert("Downloading certificate...");
      } finally {
        setIsDownloading(false);
      }
    };

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

      {/* Plain Dedicated Test Navbar */}
      <div className="bg-slate-900 text-white sticky top-0 z-50 shadow-2xl">
        <div className="h-1 bg-white/10 w-full overflow-hidden">
          <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-white/5 pr-6 pl-2 py-2 rounded-full border border-white/10">
              {studentPhoto ? (
                <img src={studentPhoto} alt="Student" className="h-12 w-12 rounded-full object-cover border-2 border-yellow-500/50" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center border-2 border-white/20">
                  <Users className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <p className="text-[10px] text-blue-300 font-black uppercase tracking-widest leading-tight">Student</p>
                <p className="text-sm font-bold text-white">{studentName}</p>
              </div>
            </div>

            <div className="hidden md:block">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">Subject</p>
              <p className="text-sm font-bold text-white/90">{test.subject}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            {/* AI Monitoring Status (Minimal) */}
            {!result && (
              <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                <div className="flex flex-col items-end">
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter leading-none mb-1">AI PROCTORING</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{faceDetectionStatus.includes('⚠️') ? 'ALERT' : 'ACTIVE'}</span>
                    <div className={`h-1.5 w-1.5 rounded-full ${faceDetectionStatus.includes('⚠️') ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px] px-4 py-2 rounded-2xl border-2 transition-all duration-500 ${timeLeft < 300 ? 'bg-red-500/20 border-red-500 animate-pulse scale-105' : 'bg-white/5 border-white/10'}`}>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Time Remaining</p>
              <div className="flex items-center gap-2">
                <Clock className={`h-4 w-4 ${timeLeft < 300 ? 'text-red-400' : 'text-yellow-500'}`} />
                <span className={`text-xl font-black font-mono leading-none ${timeLeft < 300 ? 'text-white' : 'text-yellow-500'}`}>{formatTime(timeLeft)}</span>
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

      <div className="max-w-6xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {questions.length > 0 && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              {(() => {
                const q = questions[currentQuestionIdx];
                const idx = currentQuestionIdx;
                return (
                  <div key={q.id} className={`bg-white rounded-2xl shadow-xl border-2 p-8 ${answers[q.id] ? 'border-blue-500/20' : 'border-gray-100'}`}>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg ${answers[q.id] ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
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
                            <p className="font-bold text-gray-900 leading-relaxed text-xl sm:text-2xl" style={{ fontSize: `${fontSize}px` }}>{q.question_text}</p>
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

                        <div className="grid gap-4 sm:grid-cols-2">
                          {['A', 'B', 'C', 'D'].map((opt) => {
                            const isSelected = answers[q.id] === opt;
                            return (
                              <button
                                key={opt}
                                onClick={() => handleOptionSelect(q.id, opt)}
                                className={`text-left px-6 py-5 rounded-2xl border-2 transition-all group relative overflow-hidden ${isSelected ? 'border-blue-600 bg-blue-50/50 shadow-lg shadow-blue-600/10' : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'}`}
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
                  className="px-8 py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 hover:border-gray-200 transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
                >
                  ← Previous
                </button>

                <div className="text-gray-400 font-black tracking-widest text-sm">
                  {currentQuestionIdx + 1} / {questions.length}
                </div>

                {currentQuestionIdx === questions.length - 1 ? (
                  <button
                    onClick={() => setShowSubmitSummary(true)}
                    className="px-8 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg shadow-green-600/30 hover:bg-green-700 transition-all transform hover:-translate-y-1 active:scale-95"
                  >
                    Finish Test
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                    className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center gap-2"
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
                <button key={q.id} onClick={() => { setCurrentQuestionIdx(i); setShowPalette(false); }} className={`h-12 w-12 rounded-xl text-sm font-bold flex items-center justify-center border-2 ${currentQuestionIdx === i ? 'ring-2 ring-blue-600 ring-offset-2' : ''} ${answers[q.id] ? 'bg-blue-600 border-blue-600 text-white' : markedForReview[q.id] ? 'bg-yellow-400 border-yellow-400 text-white' : 'bg-white border-gray-200'}`}>{i + 1}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING SECURITY MONITOR (The "Scary" Camera) */}
      {!result && (
        <div className="fixed bottom-6 right-6 z-[200] group">
          <div className="relative">
            {/* Pulsing background effect */}
            <div className="absolute inset-0 bg-red-600/20 rounded-2xl blur-xl animate-pulse group-hover:bg-blue-600/20"></div>
            
            <div className="relative bg-[#0f172a] rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl w-44 h-44 flex flex-col transition-all duration-500 hover:scale-105 hover:border-red-500/50">
               {/* Viewport */}
               <div className="relative flex-1 bg-black">
                 <video 
                   ref={videoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-700 ${cameraActive ? 'opacity-100' : 'opacity-20'}`} 
                 />
                 
                 {/* Security Overlays */}
                 <div className="absolute inset-0 pointer-events-none border-[1px] border-white/10 m-2"></div>
                 <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/40 px-1.5 py-0.5 rounded">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                   <span className="text-[8px] font-black text-white tracking-widest uppercase">LIVE</span>
                 </div>
                 
                 <div className="absolute bottom-2 right-2 text-[7px] font-mono text-white/40">
                   {new Date().toLocaleTimeString()}
                 </div>

                 {/* Warning Text when face not detected */}
                 {faceDetectionStatus.includes('⚠️') && (
                   <div className="absolute inset-0 flex items-center justify-center bg-red-900/60 backdrop-blur-[2px]">
                      <p className="text-[10px] font-black text-white text-center px-2 animate-bounce uppercase tracking-tighter">FACE NOT DETECTED • WARNING</p>
                   </div>
                 )}
               </div>

               {/* Monitor Footer */}
               <div className="bg-black/90 px-3 py-2 flex flex-col items-center justify-center border-t border-white/10 text-center">
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter leading-tight">S.P Sir Monitoring</p>
                 <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Your Camera</p>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
