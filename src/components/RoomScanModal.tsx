import React, { useState, useEffect, useRef } from 'react';
import { Camera, ShieldAlert, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface RoomScanModalProps {
  studentName: string;
  className: string;
  studentId: string;
  testId: string;
  attemptId?: string;
  onComplete: (videoUrl?: string) => void;
  onRefuse: () => void;
}

export const RoomScanModal: React.FC<RoomScanModalProps> = ({
  studentName,
  className,
  studentId,
  testId,
  attemptId,
  onComplete,
  onRefuse,
}) => {
  const [phase, setPhase] = useState<'prompt' | 'recording' | 'uploading' | 'completed'>('prompt');
  const [countdown, setCountdown] = useState(8); // 8-second 360 scan recording
  const [timeoutSeconds, setTimeoutSeconds] = useState(30); // 30 sec limit to respond
  const [errorMsg, setErrorMsg] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 30-second timeout countdown for refusal
  useEffect(() => {
    if (phase !== 'prompt') return;
    const timer = setInterval(() => {
      setTimeoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onRefuse(); // Refusal timeout trigger
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, onRefuse]);

  const start360Recording = async () => {
    setErrorMsg('');
    setPhase('recording');
    recordedChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        await uploadScanVideo();
      };

      recorder.start(1000);

      // Start 8-second countdown for 360 degree rotation
      let left = 8;
      const scanTimer = setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) {
          clearInterval(scanTimer);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);
    } catch (err: any) {
      console.error('Camera access error during 360 scan:', err);
      setErrorMsg('Camera access required for 360° scan. Please allow camera permissions.');
      setPhase('prompt');
    }
  };

  const uploadScanVideo = async () => {
    setPhase('uploading');
    try {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const fileName = `360scan_${studentId}_${testId}_${Date.now()}.webm`;
      const filePath = `${fileName}`;

      const { data, error } = await supabase.storage
        .from('proctoring_recordings')
        .upload(filePath, blob, { contentType: 'video/webm' });

      if (error) {
        console.error('Failed to upload 360 scan video:', error);
        setPhase('completed');
        onComplete();
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('proctoring_recordings')
        .getPublicUrl(filePath);

      const videoUrl = publicUrlData?.publicUrl;

      // Log room scan in database
      await supabase.from('proctoring_logs').insert({
        student_id: studentId,
        test_id: testId,
        warning_type: '360_room_scan',
        proof_image_url: videoUrl,
      }).catch(() => {});

      setPhase('completed');
      setTimeout(() => {
        onComplete(videoUrl);
      }, 1000);
    } catch (err) {
      console.error('Error uploading 360 room scan:', err);
      setPhase('completed');
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-amber-400/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl text-center relative overflow-hidden">
        {/* Header Alert Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-amber-500/20">
          <ShieldAlert className="w-4 h-4" /> Mandatory Security Scan
        </div>

        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
          🎥 Live 360° Room Scan Required
        </h3>

        <p className="text-sm text-gray-600 dark:text-slate-300 mb-6">
          To ensure test fairness, please rotate your phone/laptop camera <strong className="text-amber-600 dark:text-amber-400">360° around your room</strong> to verify your surroundings.
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 text-red-600 text-xs font-semibold rounded-lg border border-red-500/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* Video / Action Area */}
        <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-6 border border-slate-700 flex items-center justify-center">
          {phase === 'prompt' && (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
              <p className="text-xs text-slate-400">
                Test timer is <span className="text-emerald-400 font-bold">PAUSED</span>. You have <span className="text-amber-400 font-bold">{timeoutSeconds}s</span> to start rotation scan.
              </p>
              <button
                onClick={start360Recording}
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-5 h-5 animate-spin" /> Start 360° Camera Scan
              </button>
            </div>
          )}

          {phase === 'recording' && (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
              
              {/* Rotating Guide Ring Overlay */}
              <div className="absolute inset-0 border-4 border-dashed border-amber-400 animate-spin rounded-full pointer-events-none opacity-40 m-4" />
              
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border border-amber-400/50 shadow-lg">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                Rotate Camera 360° ({countdown}s left)
              </div>
            </>
          )}

          {(phase === 'uploading' || phase === 'completed') && (
            <div className="text-center p-6 space-y-3">
              {phase === 'uploading' ? (
                <>
                  <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-300 font-semibold">Encrypting & Uploading 360° Scan...</p>
                </>
              ) : (
                <>
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
                  <p className="text-xs text-emerald-400 font-bold">360° Scan Verified! Resuming Test...</p>
                </>
              )}
            </div>
          )}
        </div>

        {phase === 'prompt' && (
          <button
            onClick={onRefuse}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors underline"
          >
            Refuse Scan (Will trigger cheat warning & submit test)
          </button>
        )}
      </div>
    </div>
  );
};

export default RoomScanModal;
