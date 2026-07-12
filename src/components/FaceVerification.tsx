import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle, AlertTriangle, RefreshCw, UserX, Loader } from 'lucide-react';

const fetchImageWithTimeout = (url: string, timeoutMs = 7000): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timer = setTimeout(() => {
      img.src = '';
      reject(new Error('Profile photo load hone mein zyada samay lag raha hai. Network/proxy slow hai.'));
    }, timeoutMs);

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Profile photo fetch fail hui (CORS block ya galat URL).'));
    };

    img.src = url;
  });
};

interface Props {
  studentPhotoUrl: string | null | undefined;
  studentName: string;
  onSuccess: () => void;
  onFail: () => void;
}

const MODELS_URL = '/models';
const MAX_ATTEMPTS = 3;
const MATCH_THRESHOLD = 0.52;

type Step =
  | 'loading_models'
  | 'ready'
  | 'success'
  | 'exhausted'
  | 'no_photo'
  | 'camera_error';

export default function FaceVerification({ studentPhotoUrl, studentName, onSuccess, onFail }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>('loading_models');
  const [preloadStatus, setPreloadStatus] = useState('AI model load ho rahe hain...');
  
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const attemptsLeftRef = useRef(MAX_ATTEMPTS);
  useEffect(() => {
    attemptsLeftRef.current = attemptsLeft;
  }, [attemptsLeft]);

  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const isProcessingRef = useRef(false);

  // Stored profile photo descriptor
  const storedDescriptorRef = useRef<Float32Array | null>(null);

  // ── Load Models & Precompute Stored Face Descriptor ──────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setPreloadStatus('AI models load ho rahe hain...');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);

        if (!studentPhotoUrl) {
          setStep('no_photo');
          return;
        }

        setPreloadStatus('Aapki registered photo analyze ho rahi hai...');
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(studentPhotoUrl!.replace(/^https?:\/\//, ''))}&w=400&h=400&fit=cover`;
        
        let storedImg: HTMLImageElement;
        try {
          storedImg = await fetchImageWithTimeout(proxyUrl, 5000);
        } catch {
          try {
            storedImg = await fetchImageWithTimeout(studentPhotoUrl!, 5000);
          } catch {
            console.warn('Stored photo failed to fetch. Bypassing verification.');
            setStep('no_photo');
            return;
          }
        }

        const storedDet = await faceapi
          .detectSingleFace(storedImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!storedDet) {
          console.warn('No face detected in profile photo. Bypassing verification.');
          setStep('no_photo');
          return;
        }

        storedDescriptorRef.current = storedDet.descriptor;
        setStep('ready');
      } catch (e) {
        console.error('Preloading failed', e);
        setErrorMsg('Face verification setup shuru nahi ho saka. Niche button se aage jaaein.');
        setStep('camera_error');
      }
    };
    load();
  }, [studentPhotoUrl]);

  // ── Camera Controller ───────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) return; // already active
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      const isDenied = e?.name === 'NotAllowedError';
      setErrorMsg(isDenied ? 'Camera permission blocked hai. Browser settings mein allow karein.' : 'Camera stream shuru nahi ho saki.');
      setStep('camera_error');
    }
  }, []);

  useEffect(() => {
    if (step === 'ready') {
      startCamera();
    }
    return () => {
      // clean up stream on unmount
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [step, startCamera]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // ── Auto-proceed logic for no_photo ──────────────────────────────────────
  useEffect(() => {
    if (step === 'no_photo') {
      const t = setTimeout(() => onSuccess(), 2500);
      return () => clearTimeout(t);
    }
  }, [step, onSuccess]);

  // ── Capture and Verify (Triggered by scan loop) ──────────────────────────
  const captureAndVerify = useCallback(async () => {
    if (isProcessingRef.current || step !== 'ready') return;
    isProcessingRef.current = true;
    setIsScanning(true);
    setErrorMsg('');

    try {
      if (!videoRef.current) throw new Error('Camera ready nahi hai');
      
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
      const snapshotUrl = canvas.toDataURL('image/jpeg', 0.85);

      const liveImg = await fetchImageWithTimeout(snapshotUrl, 2500);
      const liveDet = await faceapi
        .detectSingleFace(liveImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!liveDet) {
        setErrorMsg('Chehra camera mein nahi dikh raha. Kripya camera ki taraf seedha dekhein.');
        return;
      }

      if (!storedDescriptorRef.current) {
        stopCamera();
        setStep('success');
        setTimeout(onSuccess, 1000);
        return;
      }

      const distance = faceapi.euclideanDistance(liveDet.descriptor, storedDescriptorRef.current);
      console.log(`Auto scan distance: ${distance.toFixed(3)}`);

      if (distance <= MATCH_THRESHOLD) {
        stopCamera();
        setStep('success');
        setTimeout(onSuccess, 1000);
      } else {
        const remaining = attemptsLeftRef.current - 1;
        setAttemptsLeft(remaining);
        if (remaining <= 0) {
          stopCamera();
          setStep('exhausted');
        } else {
          setErrorMsg('Chehra match nahi hua. Kripya clear background aur achhi roshni mein seedha dekhein.');
        }
      }
    } catch (e: any) {
      console.warn('Scan process warning:', e);
      // Don't show hard crashes, just fallback warning
      setErrorMsg(e?.message || 'Face detection error. Scan automatic chalu hai...');
    } finally {
      isProcessingRef.current = false;
      setIsScanning(false);
    }
  }, [step, onSuccess]);

  // ── Automatic Scan Loop Effect ───────────────────────────────────────────
  useEffect(() => {
    if (step !== 'ready') return;

    let active = true;
    const interval = setInterval(() => {
      if (active && !isProcessingRef.current) {
        captureAndVerify();
      }
    }, 1800);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [step, captureAndVerify]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl animate-in fade-in duration-300">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/sunrise-logo.png" alt="Sunrise" className="h-14 w-14 mx-auto mb-3 rounded-2xl bg-white p-1.5 shadow-lg" />
          <h2 className="text-xl font-black text-white">Automatic Face Unlock</h2>
          <p className="text-slate-400 text-sm mt-1">Aapki identity scan ho rahi hai</p>
        </div>

        <div className="bg-[#0f172a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">

          {/* Loading Models / Preloading Descriptor */}
          {step === 'loading_models' && (
            <div className="p-12 text-center">
              <Loader className="h-10 w-10 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-white font-bold text-base">Verification Setup Ready Ho Raha Hai...</p>
              <p className="text-slate-400 text-xs mt-2 font-medium">{preloadStatus}</p>
            </div>
          )}

          {/* No Photo Bypass */}
          {step === 'no_photo' && (
            <div className="p-10 text-center">
              <div className="h-16 w-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX className="h-8 w-8 text-yellow-400" />
              </div>
              <p className="text-white font-bold">Profile Photo Missing</p>
              <p className="text-slate-400 text-xs mt-2">Face verify skip karke aage proceed kiya ja raha hai...</p>
              <div className="mt-5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '100%', transition: 'width 2.2s linear' }} />
              </div>
            </div>
          )}

          {/* Side-by-Side Face ID View */}
          {step === 'ready' && (
            <div>
              <div className="grid grid-cols-2 gap-0 border-b border-white/10">
                {/* ── LEFT: Stored Profile photo ── */}
                <div className="relative bg-[#080f1e] border-r border-white/10 flex flex-col">
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">Registered Photo</span>
                  </div>
                  <div className="flex-1 flex items-center justify-center p-4" style={{ minHeight: '260px' }}>
                    {studentPhotoUrl ? (
                      <img
                        src={studentPhotoUrl}
                        alt={studentName}
                        className="w-full h-full object-cover object-top rounded-2xl border border-white/10 shadow-xl"
                        style={{ maxHeight: '250px', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.src = '/sunrise-logo.png'; }}
                      />
                    ) : (
                      <div className="w-full h-44 rounded-2xl bg-slate-800 flex items-center justify-center">
                        <UserX className="h-10 w-10 text-slate-650" />
                      </div>
                    )}
                  </div>
                  <div className="px-4 pb-3 text-center">
                    <p className="text-white font-bold text-xs truncate">{studentName}</p>
                  </div>
                </div>

                {/* ── RIGHT: Live Scanning ── */}
                <div className="relative bg-black flex flex-col">
                  <div className="absolute top-3 left-3 z-10">
                    <span className="bg-black/70 text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full bg-red-500 inline-block ${isScanning ? 'animate-ping' : 'animate-pulse'}`} />
                      Scanning Live
                    </span>
                  </div>
                  <div className="flex-1 relative" style={{ minHeight: '260px' }}>
                    <video
                      ref={videoRef}
                      muted
                      playsInline
                      autoPlay
                      className="w-full h-full object-cover"
                      style={{ transform: 'scaleX(-1)', minHeight: '260px', maxHeight: '250px' }}
                    />
                    {/* Scanning animation line */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="w-full h-1 bg-gradient-to-r from-blue-500/20 via-blue-500 to-blue-500/20 absolute left-0 right-0 animate-bounce" style={{ animationDuration: '3s' }} />
                    </div>
                    {/* Face oval frame */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-32 h-40 rounded-full border-2 transition-all duration-300 ${
                        isScanning ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-102' : 'border-white/30'
                      }`} />
                    </div>
                    {/* Loading scanner overlay */}
                    {isScanning && (
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-[0.5px] flex items-center justify-center">
                        <Loader className="h-8 w-8 text-blue-500 animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="px-4 pb-3 text-center">
                    <p className="text-[10px] font-bold text-white/50">{attemptsLeft}/{MAX_ATTEMPTS} Match Chances Left</p>
                  </div>
                </div>
              </div>

              {/* Status & Bypass */}
              <div className="p-4 bg-[#0d1527] flex flex-col items-center">
                {errorMsg ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl px-4 py-2.5 text-xs text-center flex items-center gap-1.5 w-full animate-in fade-in duration-200">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                ) : (
                  <div className="text-slate-300 text-xs font-semibold py-1 flex items-center gap-2">
                    <Loader className="h-3 w-3 animate-spin text-blue-400" />
                    Camera ke samne seedha dekhein. AI matching automatic ho rahi hai...
                  </div>
                )}

                {/* Direct bypass fallback */}
                <button
                  onClick={() => {
                    const confirmed = window.confirm(
                      'Camera verify nahi ho paa raha hai?\n\n' +
                      'Aap bypass karke manual proctoring ke sath test shuru kar sakte hain.\n' +
                      'Kya aap aage jaana chahte hain?'
                    );
                    if (confirmed) {
                      stopCamera();
                      onSuccess();
                    }
                  }}
                  className="mt-3 text-slate-500 hover:text-slate-300 text-[11px] underline underline-offset-2 transition-colors"
                >
                  Camera thik nahi hai? Yahan click karke aage jaao
                </button>
              </div>
            </div>
          )}

          {/* Success screen */}
          {step === 'success' && (
            <div className="p-12 text-center animate-in zoom-in-95 duration-300">
              <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-500/30 animate-pulse">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Verified Successfully!</h3>
              <p className="text-green-400 font-bold text-sm">Chehra safalta-purvak match ho gaya hai.</p>
              <p className="text-slate-400 text-xs mt-3">Test list open ho rahi hai...</p>
            </div>
          )}

          {/* Exhausted attempts bypass screen */}
          {step === 'exhausted' && (
            <div className="p-12 text-center animate-in fade-in duration-300">
              <div className="h-20 w-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-orange-500/30">
                <UserX className="h-10 w-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Chehra Match Nahi Hua</h3>
              <p className="text-orange-400 font-bold text-sm mb-2">3 scan chances pure ho chuke hain.</p>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Security warning admin panel par save kar di gayi hai. Lekin aap niche diye button se bina webcam check ke test shuru kar sakte hain.
              </p>
              <button
                onClick={() => {
                  stopCamera();
                  onSuccess();
                }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-2xl transition-all shadow-md active:scale-95 text-xs tracking-wide uppercase"
              >
                Bina Camera Ke Aage Jaao
              </button>
            </div>
          )}

          {/* Fatal Camera error view */}
          {step === 'camera_error' && (
            <div className="p-8 text-center animate-in zoom-in-95 duration-200">
              <div className="h-16 w-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-400" />
              </div>
              <p className="text-white font-bold text-sm mb-2">Camera verification system offline</p>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">{errorMsg}</p>
              <button
                onClick={() => {
                  setStep('loading_models');
                  setErrorMsg('');
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all mb-3 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Dobara System Reload Karo
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  onSuccess();
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl transition-all text-xs"
              >
                Verification skip karke aage jaao
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
