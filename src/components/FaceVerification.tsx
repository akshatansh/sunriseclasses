import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle, AlertTriangle, RefreshCw, UserX, Loader } from 'lucide-react';

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
  | 'capturing'
  | 'verifying'
  | 'success'
  | 'exhausted'
  | 'no_photo'
  | 'camera_error';

export default function FaceVerification({ studentPhotoUrl, studentName, onSuccess, onFail }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>('loading_models');
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // ── Load Models ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);
        if (!studentPhotoUrl) {
          setStep('no_photo');
        } else {
          setStep('ready');
        }
      } catch (e) {
        console.error('Model load failed', e);
        setErrorMsg('AI models load nahi ho sake. Internet check karo aur dobara try karo.');
        setStep('camera_error');
      }
    };
    load();
  }, [studentPhotoUrl]);

  // ── Camera ───────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      const isDenied = e?.name === 'NotAllowedError';
      setErrorMsg(isDenied ? 'Camera permission deny hai. Browser settings mein camera allow karo.' : 'Camera nahi mila.');
      setStep('camera_error');
    }
  }, []);

  useEffect(() => {
    if (step === 'ready') startCamera();
  }, [step, startCamera]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // ── Auto-proceed if no photo ─────────────────────────────────────────────
  useEffect(() => {
    if (step === 'no_photo') {
      const t = setTimeout(() => onSuccess(), 2500);
      return () => clearTimeout(t);
    }
  }, [step, onSuccess]);

  // ── Capture + Verify ─────────────────────────────────────────────────────
  const captureAndVerify = useCallback(async () => {
    setStep('verifying');
    setErrorMsg('');
    try {
      if (!videoRef.current) throw new Error('Camera ready nahi hai');
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
      const snapshotUrl = canvas.toDataURL('image/jpeg', 0.85);

      const liveImg = await faceapi.fetchImage(snapshotUrl);
      const liveDet = await faceapi
        .detectSingleFace(liveImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!liveDet) throw new Error('Chehra camera mein nahi dikh raha. Seedha camera ki taraf dekhein aur achhi roshni mein baithen.');

      // Fetch stored photo via CORS proxy
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(studentPhotoUrl!.replace(/^https?:\/\//, ''))}&w=400&h=400&fit=cover`;
      let storedImg: HTMLImageElement;
      try { storedImg = await faceapi.fetchImage(proxyUrl); }
      catch { storedImg = await faceapi.fetchImage(studentPhotoUrl!); }

      const storedDet = await faceapi
        .detectSingleFace(storedImg, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!storedDet) {
        // Profile photo mein face detect nahi — bypass gracefully
        console.warn('No face in stored photo — bypassing verification');
        stopCamera();
        setStep('success');
        setTimeout(onSuccess, 1200);
        return;
      }

      const distance = faceapi.euclideanDistance(liveDet.descriptor, storedDet.descriptor);
      console.log(`Face distance: ${distance.toFixed(3)} threshold: ${MATCH_THRESHOLD}`);

      if (distance <= MATCH_THRESHOLD) {
        stopCamera();
        setStep('success');
        setTimeout(onSuccess, 1500);
      } else {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        if (remaining <= 0) {
          stopCamera();
          setStep('exhausted');
          setTimeout(onFail, 2000);
        } else {
          setErrorMsg(`Chehra match nahi hua (score: ${(1 - distance).toFixed(2)}). ${remaining} chance bacha hai. Achhi roshni mein seedha dekhein.`);
          setStep('ready');
        }
      }
    } catch (e: any) {
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) {
        stopCamera();
        setStep('exhausted');
        setTimeout(onFail, 2000);
      } else {
        setErrorMsg(e?.message || 'Verification fail hui. Dobara try karo.');
        setStep('ready');
      }
    }
  }, [attemptsLeft, studentPhotoUrl, onSuccess, onFail]);

  const startCountdown = useCallback(() => {
    setStep('capturing');
    setErrorMsg('');
    let c = 3;
    setCountdown(c);
    const interval = setInterval(() => {
      c -= 1;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(interval);
        captureAndVerify();
      }
    }, 1000);
  }, [captureAndVerify]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/sunrise-logo.png" alt="Sunrise" className="h-14 w-14 mx-auto mb-3 rounded-2xl bg-white p-1.5 shadow-lg" />
          <h2 className="text-xl font-black text-white">Face Verification</h2>
          <p className="text-slate-400 text-sm mt-1">Aapki identity verify ki ja rahi hai</p>
        </div>

        <div className="bg-[#0f172a] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">

          {/* Loading Models */}
          {step === 'loading_models' && (
            <div className="p-10 text-center">
              <Loader className="h-10 w-10 text-blue-400 mx-auto mb-4 animate-spin" />
              <p className="text-white font-bold">AI System Load Ho Raha Hai...</p>
              <p className="text-slate-400 text-sm mt-2">Pehli baar thoda time lagta hai (~10 sec)</p>
            </div>
          )}

          {/* No Photo — Auto bypass */}
          {step === 'no_photo' && (
            <div className="p-10 text-center">
              <div className="h-16 w-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserX className="h-8 w-8 text-yellow-400" />
              </div>
              <p className="text-white font-bold">Photo Upload Nahi Hai</p>
              <p className="text-slate-400 text-sm mt-2">Face verification skip ho rahi hai. Admin se apni photo upload karwayein.</p>
              <div className="mt-5 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 rounded-full" style={{ width: '100%', transition: 'width 2.4s linear' }} />
              </div>
            </div>
          )}

          {/* Webcam Step */}
          {(step === 'ready' || step === 'capturing' || step === 'verifying') && (
            <div>
              <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  autoPlay
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {/* Oval guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`w-44 h-56 rounded-full border-4 transition-colors duration-300 ${
                    step === 'capturing' ? 'border-yellow-400 animate-pulse shadow-[0_0_30px_rgba(234,179,8,0.5)]' :
                    step === 'verifying' ? 'border-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.5)]' :
                    'border-white/30'
                  }`} />
                </div>
                {/* Countdown */}
                {step === 'capturing' && countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-8xl font-black text-white drop-shadow-2xl">{countdown}</span>
                  </div>
                )}
                {/* Verifying overlay */}
                {step === 'verifying' && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader className="h-10 w-10 text-blue-400 animate-spin" />
                    <p className="text-white font-bold text-sm">Verify ho raha hai...</p>
                  </div>
                )}
                {/* Attempt counter */}
                <div className="absolute top-3 right-3 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur">
                  {attemptsLeft}/{MAX_ATTEMPTS} Chances
                </div>
              </div>

              <div className="p-5">
                <p className="text-center text-white font-bold mb-1">{studentName}</p>
                <p className="text-center text-slate-400 text-xs mb-4">Apna chehra oval ke andar rakhen • Seedha camera ki taraf dekhein</p>

                {errorMsg && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-red-300 text-xs leading-relaxed">{errorMsg}</p>
                  </div>
                )}

                {step === 'ready' && (
                  <button
                    onClick={startCountdown}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                  >
                    <Camera className="h-5 w-5" />
                    Apna Chehra Scan Karo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="p-12 text-center">
              <div className="h-24 w-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-green-500/30 animate-pulse">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Identity Verified!</h3>
              <p className="text-green-400 font-semibold">Aapka chehra successfully match ho gaya.</p>
              <p className="text-slate-400 text-sm mt-3">Test portal khul raha hai...</p>
            </div>
          )}

          {/* Exhausted */}
          {step === 'exhausted' && (
            <div className="p-12 text-center">
              <div className="h-24 w-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-red-500/30">
                <UserX className="h-12 w-12 text-red-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Verification Failed</h3>
              <p className="text-red-400 font-semibold">3 baar try kiya — chehra match nahi hua.</p>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">Admin se contact karo ya apni profile photo update karwao.</p>
            </div>
          )}

          {/* Camera Error */}
          {step === 'camera_error' && (
            <div className="p-8 text-center">
              <div className="h-16 w-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-orange-400" />
              </div>
              <p className="text-white font-bold mb-2">Camera Error</p>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{errorMsg}</p>
              <button
                onClick={() => { setStep('ready'); setErrorMsg(''); }}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mb-3"
              >
                <RefreshCw className="h-4 w-4" />
                Dobara Try Karo
              </button>
              <button
                onClick={onSuccess}
                className="w-full bg-white/5 text-slate-400 text-sm py-2 rounded-xl hover:bg-white/10 transition-all"
              >
                Camera ke bina aage jaao
              </button>
            </div>
          )}

        </div>

        {(step === 'ready' || step === 'capturing') && (
          <p className="text-center text-slate-500 text-xs mt-4">Achhi roshni mein baithen • Chehra clearly dikhe • Glasses ok hain</p>
        )}
      </div>
    </div>
  );
}
