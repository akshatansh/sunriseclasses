import React, { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Edit, Save, X, Settings, List, PlayCircle, StopCircle, Users, Download, Camera, AlertTriangle, Clock, RotateCcw, Copy, Search, Filter, FileSpreadsheet, Radio, RefreshCw, Eye, EyeOff, CheckCircle, Wand2, MessageCircle, Volume2, VolumeX } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import {
  getAllTestsAdmin, createTestAdmin, updateTestAdmin, deleteTestAdmin,
  getQuestionsAdmin, createQuestionAdmin, createQuestionsBatchAdmin, updateQuestionAdmin, deleteQuestionAdmin, getTestAttemptsAdmin, getProctoringLogsAdmin,
  resetStudentAttempt,
  uploadQuestionImage,
  deleteProctoringLogAdmin, autoDeleteOldProctoringLogs,
  OnlineTest, OnlineTestQuestion,
  banStudent, unbanStudent, getBannedStudentsAdmin,
  toggleSilentRecordAdmin, getTestVideoAdmin
} from '../lib/onlineTests';
function VideoGridCell({ 
  stream, 
  liveFrame,
  studentName, 
  isMuted, 
  onToggleMute, 
  onExpand,
  isDisconnected,
  onDisconnect,
  onReconnect,
  onRetryStream,
  isOnline
}: { 
  stream: MediaStream | undefined; 
  liveFrame?: string;
  studentName: string; 
  isMuted: boolean; 
  onToggleMute: () => void; 
  onExpand: () => void;
  isDisconnected: boolean;
  onDisconnect: () => void;
  onReconnect: () => void;
  onRetryStream: () => void;
  isOnline: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream && !isDisconnected && isOnline) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {
        console.warn('Autoplay blocked for student:', studentName);
      });
    }
  }, [stream, isDisconnected, isOnline, studentName]);

  if (isDisconnected) {
    return (
      <div className="relative bg-slate-900 aspect-video rounded-xl overflow-hidden border border-gray-800 flex flex-col items-center justify-center p-4 shadow-lg text-center animate-in fade-in duration-200">
        <Camera className="h-6 w-6 text-gray-500 mb-1.5" />
        <p className="text-white text-xs font-bold truncate max-w-full px-2 mb-1">{studentName}</p>
        <p className="text-[10px] text-gray-400 mb-3">Connection closed</p>
        <button
          onClick={onReconnect}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all"
        >
          Reconnect Video
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-black aspect-video rounded-xl overflow-hidden border border-gray-800 flex flex-col group shadow-lg">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover flex-1 bg-black"
        />
      ) : liveFrame ? (
        <img
          src={liveFrame}
          alt={studentName}
          className="w-full h-full object-cover flex-1 bg-black animate-in fade-in duration-200"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 text-center">
          <Camera className="h-6 w-6 text-blue-400 animate-pulse mb-1.5" />
          <p className="text-white text-xs font-bold truncate max-w-full">{studentName}</p>
          <span className="text-[9px] text-blue-300 font-semibold mt-1">Connecting Live Stream...</span>
        </div>
      )}
      {/* Controls Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3 opacity-90 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="flex justify-between items-start pointer-events-auto">
          <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wide flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 bg-white rounded-full" /> Live
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onExpand}
              className="p-1 bg-black/60 hover:bg-black/90 text-white rounded transition-colors"
              title="Expand Fullscreen"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDisconnect}
              className="p-1 bg-red-600/80 hover:bg-red-600 text-white rounded transition-colors"
              title="Close Stream"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center pointer-events-auto mt-auto">
          <p className="text-white text-xs font-bold truncate pr-2">{studentName}</p>
          <button
            onClick={onToggleMute}
            className={`p-1.5 rounded-full transition-colors ${
              isMuted
                ? 'bg-slate-750/80 hover:bg-slate-800 text-white/70'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
            title={isMuted ? 'Suno (Unmute)' : 'Mute'}
          >
            {isMuted ? (
              <VolumeX className="h-3.5 w-3.5" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
      {!stream && (
        <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-2 p-3">
          <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
          <p className="text-slate-400 text-[10px] font-medium tracking-wide">Connecting live stream...</p>
          <button
            onClick={onRetryStream}
            className="mt-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] transition-all"
          >
            Retry Connect
          </button>
        </div>
      )}
    </div>
  );
}

export default function OnlineTestAdmin() {
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [loading, setLoading] = useState(true);

  // Views: 'list', 'edit-test', 'manage-questions', 'view-attempts', 'view-proctoring', 'live-monitor', 'ban-management'
  const [view, setView] = useState<'list' | 'edit-test' | 'manage-questions' | 'view-attempts' | 'view-proctoring' | 'live-monitor' | 'ban-management'>('list');
  const [currentTest, setCurrentTest] = useState<Partial<OnlineTest>>({});

  // Ban management states
  const [bannedStudents, setBannedStudents] = useState<any[]>([]);
  const [bannedLoading, setBannedLoading] = useState(false);
  const [selectedStudentForBan, setSelectedStudentForBan] = useState<any>(null);
  const [banModalOpen, setBanModalOpen] = useState(false);
  const [banType, setBanType] = useState<'permanent' | 'temporary'>('permanent');
  const [banReason, setBanReason] = useState('');
  const [banUntil, setBanUntil] = useState('');
  const [savingBan, setSavingBan] = useState(false);
  const [banSearchQuery, setBanSearchQuery] = useState('');
  const [banFilterClass, setBanFilterClass] = useState('All');

  // Video proctoring playback states
  const [videoRecordings, setVideoRecordings] = useState<Record<string, string>>({});
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVideoStudentName, setCurrentVideoStudentName] = useState<string>('');
  const [videoError, setVideoError] = useState<boolean>(false);
  const [videoLoading, setVideoLoading] = useState<boolean>(false);

  // WebRTC Live Grid proctoring states & references
  const [liveVideoGridActive, setLiveVideoGridActive] = useState(false);
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [mutedMap, setMutedMap] = useState<Record<string, boolean>>({}); // student_id -> isMuted
  const [fullscreenStudentStream, setFullscreenStudentStream] = useState<{ id: string; name: string } | null>(null);
  const [manualDisconnects, setManualDisconnects] = useState<Record<string, boolean>>({});
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});

  const activeConnectionsRef = useRef<Record<string, { pc: RTCPeerConnection; channel: any }>>({});
  const adminSocketIdRef = useRef(Math.random().toString(36).substring(7));


  const [questions, setQuestions] = useState<OnlineTestQuestion[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [proctoringLogs, setProctoringLogs] = useState<any[]>([]);
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [studentAnswers, setStudentAnswers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  // Edit Score inline state
  const [editScoreAttemptId, setEditScoreAttemptId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState('');
  const [editTotalValue, setEditTotalValue] = useState('');
  const [savingScore, setSavingScore] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  // Lightbox for proctoring image zoom
  const [lightboxLog, setLightboxLog] = useState<any>(null);

  // Close lightbox on Escape key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxLog(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Live Monitor State
  const [liveStudents, setLiveStudents] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [liveFrameMap, setLiveFrameMap] = useState<Record<string, { image: string; timestamp: number }>>({});
  const liveRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to silent background live camera frame snapshots for every active student
  useEffect(() => {
    if (view !== 'live-monitor' || liveStudents.length === 0) return;

    const activeChannels: any[] = [];

    liveStudents.forEach((att) => {
      const studentId = att.student_id;
      const ch = supabase
        .channel(`live-frame-${studentId}`)
        .on('broadcast', { event: 'frame' }, (payload) => {
          if (payload.payload && payload.payload.image) {
            setLiveFrameMap((prev) => ({
              ...prev,
              [studentId]: { image: payload.payload.image, timestamp: Date.now() },
            }));
          }
        })
        .subscribe();

      activeChannels.push(ch);
    });

    return () => {
      activeChannels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [view, liveStudents]);

  const fetchLiveStudents = async () => {
    setLiveLoading(true);
    try {
      // Students with is_completed=false are currently taking a test
      const { data, error } = await supabase
        .from('online_test_attempts')
        .select('*, students(name, class_name, image), online_tests(title, subject, duration_minutes)')
        .eq('is_completed', false)
        .order('submitted_at', { ascending: false });
      if (!error) {
        const now = Date.now();
        // Only show students who started within (test duration + 45 min buffer) — filter out stale/abandoned attempts
        const activeLive = (data || []).filter(att => {
          const startedAt = new Date(att.submitted_at).getTime();
          const minutesAgo = (now - startedAt) / 60000;
          const maxMinutes = (att.online_tests?.duration_minutes || 60) + 45;
          return minutesAgo <= maxMinutes;
        });
        setLiveStudents(activeLive);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Error fetching live students:', err);
    } finally {
      setLiveLoading(false);
    }
  };

  const playProctoringAlertSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playBeep = (timeOffset: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime + timeOffset);
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
        gainNode.gain.linearRampToValueAtTime(0.12, ctx.currentTime + timeOffset + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.15);
        
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.16);
      };

      playBeep(0);
      playBeep(0.18);
    } catch (e) {
      console.warn('Audio synthesis alert failed:', e);
    }
  };

  const classes = ['Class 8', 'Class 9', 'Class 10'];

  useEffect(() => {
    fetchTests();
    // Auto-cleanup old logs (older than 15 days) silently in the background
    autoDeleteOldProctoringLogs();
  }, []);

  // Auto-refresh live monitor every 20 seconds when that view is active
  useEffect(() => {
    if (view === 'live-monitor') {
      fetchLiveStudents();
      liveRefreshRef.current = setInterval(fetchLiveStudents, 20000);
    }
    return () => {
      if (liveRefreshRef.current) clearInterval(liveRefreshRef.current);
    };
  }, [view]);

  // Real-time sound alert and instant update trigger for proctoring logs
  useEffect(() => {
    if (view !== 'live-monitor') return;

    const logChannel = supabase
      .channel('live-proctoring-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'proctoring_logs' },
        (payload) => {
          console.log('Realtime proctoring warning trigger:', payload.new);
          playProctoringAlertSound();
          fetchLiveStudents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(logChannel);
    };
  }, [view]);

  // WebRTC Multi-Grid Connection Manager
  useEffect(() => {
    if (view !== 'live-monitor' || !liveVideoGridActive) {
      // Cleanup all connections when grid is closed or view changes
      Object.keys(activeConnectionsRef.current).forEach(studentId => {
        try {
          const { pc, channel } = activeConnectionsRef.current[studentId];
          pc.close();
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      });
      activeConnectionsRef.current = {};
      setStreams({});
      setPresenceMap({});
      return;
    }

    const currentLiveIds = new Set(liveStudents.map(s => s.student_id));

    // 1. Cleanup any connections for students who are no longer active OR manually disconnected
    Object.keys(activeConnectionsRef.current).forEach(studentId => {
      const isStillActive = currentLiveIds.has(studentId);
      const isManuallyDisconnected = manualDisconnects[studentId] === true;

      if (!isStillActive || isManuallyDisconnected) {
        try {
          const { pc, channel } = activeConnectionsRef.current[studentId];
          pc.close();
          supabase.removeChannel(channel);
        } catch (e) {
          console.warn('Individual cleanup error:', e);
        }
        delete activeConnectionsRef.current[studentId];
        setStreams(prev => {
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
        setPresenceMap(prev => {
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
      }
    });

    // 2. Establish connections for newly active students (skip if manually disconnected)
    liveStudents.forEach(s => {
      const studentId = s.student_id;
      if (manualDisconnects[studentId] === true) return; // skipped manually
      if (activeConnectionsRef.current[studentId]) return; // already connecting/connected

      try {
        const channel = supabase.channel(`proctoring-stream-${studentId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: studentId }
          }
        });

        const pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            // Free TURN relay — works on firewalled school/mobile networks
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ]
        });

        // Helper: send request-stream signal (reused in retry)
        const requestStreamFromStudent = () => {
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'request-stream',
              adminSocketId: adminSocketIdRef.current,
              studentId
            }
          });
          console.log(`[WebRTC] request-stream sent to student ${studentId}`);
        };

        pc.ontrack = (event) => {
          console.log(`Received WebRTC stream for student ${studentId}`);
          if (event.streams && event.streams[0]) {
            setStreams(prev => ({
              ...prev,
              [studentId]: event.streams[0]
            }));
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'candidate',
                candidate: event.candidate,
                adminSocketId: adminSocketIdRef.current,
                studentId
              }
            });
          }
        };

        // Listen for offers and candidates from student
        channel.on('broadcast', { event: 'signal' }, async (payload) => {
          const { type, sdp, candidate, studentId: msgStudentId } = payload.payload || {};
          if (msgStudentId !== studentId) return;

          try {
            if (type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);

              // Send answer to student
              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: {
                  type: 'answer',
                  sdp: answer.sdp,
                  adminSocketId: adminSocketIdRef.current,
                  studentId
                }
              });
            } else if (type === 'candidate') {
              if (candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
            }
          } catch (err) {
            console.error(`Error processing peer signal for ${studentId}:`, err);
          }
        });

        // Track student presence state
        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const isOnline = Object.keys(state).length > 0;
            setPresenceMap(prev => ({
              ...prev,
              [studentId]: isOnline
            }));
          })
          .on('presence', { event: 'join' }, () => {
            setPresenceMap(prev => ({ ...prev, [studentId]: true }));
            // Re-request stream when student comes online (handles reconnect case)
            setTimeout(requestStreamFromStudent, 300);
          })
          .on('presence', { event: 'leave' }, () => {
            setPresenceMap(prev => ({ ...prev, [studentId]: false }));
          });

        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`Subscribed to student channel ${studentId}. Requesting stream in 600ms...`);
            // ⏱ RACE CONDITION FIX: Wait 600ms before sending request-stream
            // This gives student's channel time to subscribe and start listening
            // Without this delay, admin's message arrives before student is ready
            setTimeout(requestStreamFromStudent, 600);
          }
        });

        // Store references including requestStream for retry capability
        activeConnectionsRef.current[studentId] = { pc, channel, requestStream: requestStreamFromStudent };

      } catch (err) {
        console.error(`Failed to initiate WebRTC stream for student ${studentId}:`, err);
      }
    });

  }, [view, liveVideoGridActive, liveStudents, manualDisconnects]);

  // Load student list when ban management view is open
  useEffect(() => {
    if (view === 'ban-management') {
      fetchBannedStudents();
    }
  }, [view]);

  const fetchBannedStudents = async () => {
    setBannedLoading(true);
    try {
      const data = await getBannedStudentsAdmin();
      setBannedStudents(data);
    } catch (err) {
      console.error(err);
      alert('Error fetching students list');
    } finally {
      setBannedLoading(false);
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await getAllTestsAdmin();
      setTests(data);
    } catch (err) {
      console.error(err);
      alert('Error fetching tests');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (currentTest.id) {
        await updateTestAdmin(currentTest.id, currentTest);
      } else {
        await createTestAdmin(currentTest as OnlineTest);
      }
      setView('list');
      fetchTests();
    } catch (err) {
      console.error(err);
      alert('Error saving test');
    }
  };

  const handleSaveBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForBan) return;
    if (banType === 'temporary' && !banUntil) {
      alert('Kripya expiry date and time select karein temporary ban ke liye.');
      return;
    }
    setSavingBan(true);
    try {
      await banStudent(
        selectedStudentForBan.id,
        banType,
        banReason || 'Banned by Administrator',
        banType === 'temporary' ? new Date(banUntil).toISOString() : undefined
      );
      setBanModalOpen(false);
      setSelectedStudentForBan(null);
      setBanReason('');
      setBanUntil('');
      fetchBannedStudents();
    } catch (err) {
      console.error(err);
      alert('Error banning student');
    } finally {
      setSavingBan(false);
    }
  };

  const handleUnbanStudent = async (studentId: string) => {
    if (!window.confirm('Kya aap is student ko unban karna chahte hain?')) return;
    try {
      await unbanStudent(studentId);
      fetchBannedStudents();
    } catch (err) {
      console.error(err);
      alert('Error unbanning student');
    }
  };

  const handleToggleSilentRecord = async (studentId: string, currentVal: boolean) => {
    try {
      await toggleSilentRecordAdmin(studentId, !currentVal);
      fetchBannedStudents();
    } catch (err) {
      console.error(err);
      alert('Error updating silent video proctor setting');
    }
  };


  const handleToggleActive = async (test: OnlineTest) => {
    try {
      await updateTestAdmin(test.id, { is_active: !test.is_active });
      fetchTests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateTest = async (test: OnlineTest) => {
    if (!window.confirm(`Duplicate "${test.title}"? This will copy all questions too.`)) return;
    try {
      const newTest = await createTestAdmin({
        title: `${test.title} (Copy)`,
        class_name: test.class_name,
        subject: test.subject,
        duration_minutes: test.duration_minutes,
        is_active: false
      });

      const originalQuestions = await getQuestionsAdmin(test.id);
      for (const q of originalQuestions) {
        await createQuestionAdmin({
          test_id: newTest.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_option: q.correct_option,
          marks: q.marks
        });
      }
      fetchTests();
      alert('Test successfully duplicated with all questions!');
    } catch (err) {
      console.error(err);
      alert('Error duplicating test');
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!window.confirm("Delete this test? All questions and attempts will be lost!")) return;
    try {
      await deleteTestAdmin(id);
      fetchTests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProctoringLog = async (logId: string, proofUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this proctoring log and its media file?")) return;
    try {
      await deleteProctoringLogAdmin(logId, proofUrl);
      // Refresh the logs view
      if (currentTest.id) {
        const logs = await getProctoringLogsAdmin(currentTest.id);
        setProctoringLogs(logs);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete log.');
    }
  };

  // Questions Management
  const [newQuestion, setNewQuestion] = useState<Partial<OnlineTestQuestion>>({
    question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1, question_image: '', explanation: ''
  });
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [parsingBulk, setParsingBulk] = useState(false);

  const handleBulkSubmit = async () => {
    if (!currentTest.id || !bulkText.trim()) return;
    setParsingBulk(true);

    try {
      let normalizedText = bulkText.replace(/\r\n/g, '\n');
      // Auto-insert double newlines before Question markers if missing
      // Matches "1.", "1)", "Q1.", "Question 1.", etc. at the start of a line.
      // Also handles Hindi word "प्रश्न 1."
      normalizedText = normalizedText.replace(/\n(?=(?:Q(?:uestion)?\s*\d+[\.\)]\s*|प्रश्न\s*\d+[\.\)]\s*|\d+[\.\)]\s+))/gi, '\n\n');

      const blocks = normalizedText.split(/\n\s*\n/);
      const parsedQuestions: Partial<OnlineTestQuestion>[] = [];

      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);

        let ansLineIndex = lines.findIndex(l => {
          const lower = l.toLowerCase();
          return lower.startsWith('ans') || lower.startsWith('उत्तर');
        });

        if (ansLineIndex === -1) {
          const lastLine = lines[lines.length - 1];
          if (['a', 'b', 'c', 'd'].includes(lastLine.toLowerCase().trim())) {
            ansLineIndex = lines.length - 1;
          }
        }

        let optAIndex = lines.findIndex(l => l.match(/^[\(]?a[\.\)]?\s*/i));

        if (ansLineIndex > 0 && optAIndex > 0) {
          let qTextLines = lines.slice(0, optAIndex);
          qTextLines[0] = qTextLines[0].replace(/^(?:Q(?:uestion)?\s*\d+[\.\)]\s*|प्रश्न\s*\d+[\.\)]\s*|\d+[\.\)]\s*)/i, '');
          let qText = qTextLines.join('\n').trim();

          let optA = '', optB = '', optC = '', optD = '';
          let correctOpt = 'A';

          let optBIndex = lines.findIndex(l => l.match(/^[\(]?b[\.\)]?\s*/i));
          let optCIndex = lines.findIndex(l => l.match(/^[\(]?c[\.\)]?\s*/i));
          let optDIndex = lines.findIndex(l => l.match(/^[\(]?d[\.\)]?\s*/i));

          if (optAIndex !== -1 && optBIndex !== -1) {
            optA = lines.slice(optAIndex, optBIndex).join('\n').replace(/^[\(]?a[\.\)]?\s*/i, '').trim();
          }
          if (optBIndex !== -1 && optCIndex !== -1) {
            optB = lines.slice(optBIndex, optCIndex).join('\n').replace(/^[\(]?b[\.\)]?\s*/i, '').trim();
          }
          if (optCIndex !== -1 && optDIndex !== -1) {
            optC = lines.slice(optCIndex, optDIndex).join('\n').replace(/^[\(]?c[\.\)]?\s*/i, '').trim();
          }
          if (optDIndex !== -1 && ansLineIndex !== -1) {
            optD = lines.slice(optDIndex, ansLineIndex).join('\n').replace(/^[\(]?d[\.\)]?\s*/i, '').trim();
          }

          const ansRaw = lines[ansLineIndex].replace(/^(ans(wer)?|उत्तर)[\:\.\-]?\s*/i, '').trim();
          const match = ansRaw.match(/^[\[\(]?([A-D])[\]\)]?/i);
          if (match && ['A', 'B', 'C', 'D'].includes(match[1].toUpperCase())) {
            correctOpt = match[1].toUpperCase();
          }

          let explanationText = '';
          const extraTextMatch = ansRaw.match(/^[\[\(]?[A-D][\]\)]?[\s\:\-\.]*(.*)/i);
          if (extraTextMatch && extraTextMatch[1] && extraTextMatch[1].trim().length > 3) {
            explanationText = extraTextMatch[1].trim();
            if (explanationText.startsWith('(') && explanationText.endsWith(')')) {
              explanationText = explanationText.substring(1, explanationText.length - 1);
            }
          }

          if (ansLineIndex < lines.length - 1) {
            const expLines = lines.slice(ansLineIndex + 1);
            const expStr = expLines.join('\n').trim();
            if (expStr.toLowerCase().startsWith('exp') || expStr.toLowerCase().startsWith('sol') || expStr.startsWith('व्याख्या') || expStr.startsWith('हल')) {
              let cleanExp = expStr.replace(/^(exp(lanation)?|sol(ution)?|व्याख्या|हल)[\:\.\-]?\s*/i, '').trim();
              explanationText = explanationText ? explanationText + '\n' + cleanExp : cleanExp;
            } else {
              explanationText = explanationText ? explanationText + '\n' + expStr : expStr;
            }
          }

          parsedQuestions.push({
            test_id: currentTest.id,
            question_text: qText,
            option_a: optA,
            option_b: optB,
            option_c: optC,
            option_d: optD,
            correct_option: correctOpt,
            marks: 1,
            explanation: explanationText || undefined
          });
        }
      }

      if (parsedQuestions.length > 0) {
        await createQuestionsBatchAdmin(parsedQuestions);
        setBulkText('');
        setIsBulkMode(false);
        const data = await getQuestionsAdmin(currentTest.id);
        setQuestions(data);
        alert(`Successfully added ${parsedQuestions.length} questions!`);
      } else {
        alert("Could not parse any questions. Please check the format.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Bulk upload failed: ${err.message}`);
    } finally {
      setParsingBulk(false);
    }
  };

  const handleManageQuestions = async (test: OnlineTest) => {
    setCurrentTest(test);
    setView('manage-questions');
    try {
      const data = await getQuestionsAdmin(test.id);
      setQuestions(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTest.id) return;
    try {
      if (newQuestion.id) {
        // Update existing question
        await updateQuestionAdmin(newQuestion.id, { ...newQuestion, test_id: currentTest.id } as OnlineTestQuestion);
      } else {
        // Create new question
        await createQuestionAdmin({ ...newQuestion, test_id: currentTest.id } as OnlineTestQuestion);
      }
      setNewQuestion({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1, question_image: '', explanation: '' });
      const data = await getQuestionsAdmin(currentTest.id);
      setQuestions(data);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to add question: ${err.message || 'Unknown error'}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const url = await uploadQuestionImage(file);
      setNewQuestion({ ...newQuestion, question_image: url });
    } catch (err) {
      console.error(err);
      alert('Image upload failed. Please check file size/type.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await deleteQuestionAdmin(id);
      if (currentTest.id) {
        const data = await getQuestionsAdmin(currentTest.id);
        setQuestions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Attempts Management
  const handleViewAttempts = async (test: OnlineTest) => {
    setCurrentTest(test);
    setView('view-attempts');
    try {
      const data = await getTestAttemptsAdmin(test.id);
      setAttempts(data || []);

      const { data: vData } = await supabase
        .from('test_video_recordings')
        .select('student_id, video_url')
        .eq('test_id', test.id);
      
      const vMap: Record<string, string> = {};
      vData?.forEach(v => {
        vMap[v.student_id] = v.video_url;
      });
      setVideoRecordings(vMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetAttempt = async (studentId: string, studentName: string) => {
    if (!currentTest.id) return;
    if (!window.confirm(`"${studentName}" ka attempt reset kar doge? Unka score delete ho jaayega aur wo dobara test de sakenge.`)) return;
    try {
      // Also delete video recording if any
      await supabase.from('test_video_recordings').delete().eq('student_id', studentId).eq('test_id', currentTest.id);

      await resetStudentAttempt(studentId, currentTest.id);
      // Refresh attempts list
      const data = await getTestAttemptsAdmin(currentTest.id);
      setAttempts(data || []);

      const { data: vData } = await supabase
        .from('test_video_recordings')
        .select('student_id, video_url')
        .eq('test_id', currentTest.id);
      
      const vMap: Record<string, string> = {};
      vData?.forEach(v => {
        vMap[v.student_id] = v.video_url;
      });
      setVideoRecordings(vMap);

      alert(`${studentName} ka attempt successfully reset ho gaya. Ab wo dobara test de sakte hain.`);
    } catch (err) {
      console.error(err);
      alert('Error resetting attempt. Please try again.');
    }
  };

  const handleViewDetailedAnswers = async (att: any) => {
    setSelectedAttempt(att);
    setShowDetailedReview(true);
    try {
      // For detailed review, we need to compare student's answers (not stored yet) 
      // with correct ones. Wait, we don't store student's exact choice in online_test_attempts!
      // This is a missing feature in the database.
      // For now, I'll update the submission logic later to store it, 
      // but let's show what we can or mock it for the demo if needed.
      // Actually, let's keep it simple: Show Score Breakdown.
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewProctoringLogs = async (test: OnlineTest) => {
    setCurrentTest(test);
    setView('view-proctoring');
    try {
      const data = await getProctoringLogsAdmin(test.id);
      setProctoringLogs(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Edit Score: Admin can manually correct a student's score
  const handleEditScore = async (attemptId: string) => {
    const newScore = parseInt(editScoreValue);
    const newTotal = parseInt(editTotalValue);
    if (isNaN(newScore) || isNaN(newTotal) || newScore < 0 || newTotal <= 0 || newScore > newTotal) {
      alert('Galat marks! Score 0 se total_marks ke beech hona chahiye.');
      return;
    }
    setSavingScore(true);
    try {
      const { error } = await supabase
        .from('online_test_attempts')
        .update({ score: newScore, total_marks: newTotal, is_completed: true })
        .eq('id', attemptId);
      if (error) throw error;
      // Refresh list
      if (currentTest.id) {
        const data = await getTestAttemptsAdmin(currentTest.id);
        setAttempts(data || []);
      }
      setEditScoreAttemptId(null);
      alert(`Score updated: ${newScore}/${newTotal}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingScore(false);
    }
  };

  // Recalculate Score: DB mein stored answers se score dobara calculate karo
  const handleRecalculateScore = async (att: any) => {
    if (!window.confirm(`"${att.students?.name}" ka score stored answers se recalculate karein?`)) return;
    setSavingScore(true);
    try {
      // Step 1: DB se stored answers lo
      const { data: attemptData, error: aErr } = await supabase
        .from('online_test_attempts')
        .select('answers')
        .eq('id', att.id)
        .maybeSingle();
      if (aErr) throw aErr;

      const storedAnswers: Record<string, string> = attemptData?.answers || {};
      const answeredCount = Object.keys(storedAnswers).length;

      if (answeredCount === 0) {
        alert('Is student ke koi answers database mein save nahi hain.');
        setSavingScore(false);
        return;
      }

      // Step 2: Correct answers lo
      const { data: questions, error: qErr } = await supabase
        .from('online_test_questions')
        .select('id, correct_option, marks')
        .eq('test_id', att.test_id);
      if (qErr) throw qErr;

      // Step 3: Score calculate karo
      let newScore = 0;
      let newTotal = 0;
      questions?.forEach((q: any) => {
        newTotal += q.marks;
        if (storedAnswers[q.id] === q.correct_option) {
          newScore += q.marks;
        }
      });

      // Step 4: DB update karo
      const { error: uErr } = await supabase
        .from('online_test_attempts')
        .update({ score: newScore, total_marks: newTotal, is_completed: true })
        .eq('id', att.id);
      if (uErr) throw uErr;

      // Refresh
      if (currentTest.id) {
        const data = await getTestAttemptsAdmin(currentTest.id);
        setAttempts(data || []);
      }
      alert(`Score recalculated!\n${att.students?.name}: ${newScore}/${newTotal}\n(${answeredCount} answers found in DB)`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingScore(false);
    }
  };

  const handleDownloadRankCard = async () => {
    if (attempts.length === 0) {
      alert('No results available to download.');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // === HEADER BACKGROUND ===
    doc.setFillColor(15, 42, 92);
    doc.rect(0, 0, pageW, 50, 'F');

    // Accent bottom strip on header
    doc.setFillColor(245, 166, 35);
    doc.rect(0, 47, pageW, 3, 'F');

    // === LOGO ===
    try {
      const logoRes = await fetch('/sunrise-logo.png');
      const blob = await logoRes.blob();
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          doc.addImage(base64, 'PNG', 8, 7, 30, 30);
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (_) {
      // logo failed to load; skip silently
    }

    // === ACADEMY NAME ===
    doc.setTextColor(245, 166, 35);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('SUNRISE CLASSES & ACADEMY', pageW / 2, 18, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Champanagar, Purnia, Bihar - 854201  |  Mob: 9973152070', pageW / 2, 27, { align: 'center' });

    doc.setTextColor(200, 215, 255);
    doc.setFontSize(8.5);
    doc.text('Online Test Rank Card', pageW / 2, 36, { align: 'center' });

    // === TEST INFO BOX ===
    doc.setFillColor(248, 251, 255);
    doc.setDrawColor(213, 229, 255);
    doc.roundedRect(10, 56, pageW - 20, 22, 3, 3, 'FD');

    doc.setTextColor(15, 42, 92);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(currentTest.title || 'Online Test', 16, 65);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(`Subject: ${currentTest.subject || '-'}`, 16, 73);
    doc.text(`Date: ${dateStr}`, 90, 73);
    const firstTotal = attempts.length > 0 ? attempts[0].total_marks : 0;
    doc.text(`Total Marks: ${firstTotal}`, 155, 73);

    // === TABLE ===
    const sortedAttempts = [...attempts].sort((a, b) => b.score - a.score);
    const rows = sortedAttempts.map((att, idx) => {
      const marks = att.score;
      const total = att.total_marks;
      const pct = total > 0 ? ((marks / total) * 100).toFixed(1) : '0';
      return [idx + 1, att.students?.name || 'Unknown', att.students?.class_name || '-', `${marks} / ${total}`, `${pct}%`];
    });

    autoTable(doc, {
      startY: 85,
      head: [['Rank', 'Student Name', 'Class', 'Score', 'Percentage']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 42, 92],
        textColor: [245, 166, 35],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
      },
      bodyStyles: { fontSize: 10, textColor: [30, 30, 30], halign: 'left' },
      alternateRowStyles: { fillColor: [248, 251, 255] },
      columnStyles: {
        0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
        2: { halign: 'center' },
        3: { halign: 'center', fontStyle: 'bold' },
        4: { halign: 'center', fontStyle: 'bold' },
      },
      margin: { left: 10, right: 10 }
    });

    // === FOOTER ===
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      doc.text('Generated by Sunrise Classes Portal', 10, doc.internal.pageSize.getHeight() - 10);
    }

    doc.save(`RankCard_${currentTest.title?.replace(/\s+/g, '_') || 'Test'}.pdf`);
  };

  if (loading) return <div className="p-8 text-center">Loading tests...</div>;

  return (<>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          Online Tests Management
        </h2>

        {view === 'list' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('ban-management')}
              className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 text-sm font-medium transition-colors"
            >
              <AlertTriangle className="h-4 w-4" /> Ban Management
            </button>
            <button
              onClick={() => setView('live-monitor')}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm font-medium transition-colors animate-pulse"
            >
              <Radio className="h-4 w-4" /> Live Monitor
            </button>
            <button
              onClick={() => {
                setCurrentTest({ title: '', class_name: 'Class 10', subject: '', duration_minutes: 30, is_active: false });
                setView('edit-test');
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium transition-colors"
            >
              <PlusCircle className="h-4 w-4" /> Create Test
            </button>
          </div>
        ) : (
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            <List className="h-4 w-4" /> Back to Tests
          </button>
        )}
      </div>

      <div className="p-6">
        {view === 'list' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="All">All Classes</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class & Subject</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tests
                    .filter(t => (filterClass === 'All' || t.class_name === filterClass) && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(test => (
                      <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{test.title}</div>
                          <div className="text-[10px] flex items-center gap-1 text-gray-500 font-medium">
                            <Clock className="h-3 w-3" /> {test.duration_minutes} mins
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mb-1 uppercase tracking-wide">
                            {test.class_name}
                          </span>
                          <div className="text-xs font-medium text-gray-400">{test.subject}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {/* Hidden */}
                            <button
                              onClick={() => updateTestAdmin(test.id, { is_active: false, is_stopped: false }).then(fetchTests)}
                              className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all ${!test.is_active && !test.is_stopped
                                ? 'bg-gray-200 text-gray-700 border-gray-300 shadow-sm'
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                                }`}
                              title="Hidden - not visible to students"
                            >Hidden</button>
                            {/* Live */}
                            <button
                              onClick={() => updateTestAdmin(test.id, { is_active: true, is_stopped: false }).then(fetchTests)}
                              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all ${test.is_active
                                ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600'
                                }`}
                              title="Live - students can take this test"
                            >
                              <div className={`h-1.5 w-1.5 rounded-full ${test.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                              Live
                            </button>
                            {/* Stopped */}
                            <button
                              onClick={() => updateTestAdmin(test.id, { is_active: false, is_stopped: true }).then(fetchTests)}
                              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all ${test.is_stopped
                                ? 'bg-red-50 text-red-700 border-red-200 shadow-sm'
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-600'
                                }`}
                              title="Stop - test ends; students see Completed/Pending"
                            >
                              <div className={`h-1.5 w-1.5 rounded-full ${test.is_stopped ? 'bg-red-500' : 'bg-gray-300'}`}></div>
                              Stopped
                            </button>
                            {/* Allow Review */}
                            <button
                              onClick={() => updateTestAdmin(test.id, { allow_review: !test.allow_review }).then(fetchTests)}
                              className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-full border transition-all ${test.allow_review
                                ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'
                                : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-purple-50 hover:text-purple-600'
                                }`}
                              title="Allow Review - students can see Q&A review and download PDF"
                            >
                              {test.allow_review
                                ? <Eye className="h-3 w-3" />
                                : <EyeOff className="h-3 w-3" />}
                              {test.allow_review ? 'Review ON' : 'Review OFF'}
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleDuplicateTest(test)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Duplicate Test">
                              <Copy className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleViewProctoringLogs(test)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" title="View Proctoring Logs">
                              <Camera className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleViewAttempts(test)} className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="View Results">
                              <Users className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleManageQuestions(test)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all" title="Manage Questions">
                              <List className="h-4 w-4" />
                            </button>
                            <button onClick={() => { setCurrentTest(test); setView('edit-test'); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit Settings">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDeleteTest(test.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete Test">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {tests.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <List className="h-12 w-12 text-gray-200 mb-2" />
                          <p className="font-medium">No tests found. Create your first online test!</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'edit-test' && (
          <form onSubmit={handleSaveTest} className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{currentTest.id ? 'Edit Test Details' : 'Create New Test'}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Title</label>
              <input type="text" required value={currentTest.title || ''} onChange={e => setCurrentTest({ ...currentTest, title: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Weekly Physics Mock Test" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select value={currentTest.class_name || 'Class 10'} onChange={e => setCurrentTest({ ...currentTest, class_name: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input type="text" required value={currentTest.subject || ''} onChange={e => setCurrentTest({ ...currentTest, subject: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="e.g. Physics" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
              <input type="number" min="1" required value={currentTest.duration_minutes || 30} onChange={e => setCurrentTest({ ...currentTest, duration_minutes: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
            </div>
            <div className="pt-4 flex justify-end gap-3 border-t mt-6">
              <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                <Save className="h-4 w-4" /> Save Test
              </button>
            </div>
          </form>
        )}

        {view === 'manage-questions' && (
          <div className="space-y-8">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => setIsBulkMode(false)}
                    className={`font-bold pb-2 border-b-2 transition-colors ${!isBulkMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    Add Single Question
                  </button>
                  <button
                    onClick={() => setIsBulkMode(true)}
                    className={`font-bold pb-2 border-b-2 transition-colors ${isBulkMode ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    Bulk Paste Questions
                  </button>
                </div>
              </div>

              {!isBulkMode ? (
                <form onSubmit={handleAddQuestion} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                    <textarea required rows={3} value={newQuestion.question_text || ''} onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })} className="w-full px-3 py-2 border rounded-md" placeholder="Type question here..."></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option A</label>
                      <input type="text" required value={newQuestion.option_a || ''} onChange={e => setNewQuestion({ ...newQuestion, option_a: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option B</label>
                      <input type="text" required value={newQuestion.option_b || ''} onChange={e => setNewQuestion({ ...newQuestion, option_b: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option C</label>
                      <input type="text" required value={newQuestion.option_c || ''} onChange={e => setNewQuestion({ ...newQuestion, option_c: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Option D</label>
                      <input type="text" required value={newQuestion.option_d || ''} onChange={e => setNewQuestion({ ...newQuestion, option_d: e.target.value })} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Question Image (Optional)</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-grow">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="q-image-upload"
                          />
                          <label
                            htmlFor="q-image-upload"
                            className={`w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed rounded-md cursor-pointer transition-colors ${newQuestion.question_image ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                              }`}
                          >
                            {uploadingImage ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">Uploading...</span>
                              </>
                            ) : newQuestion.question_image ? (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Image Ready</span>
                              </>
                            ) : (
                              <>
                                <Camera className="h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Click to Upload</span>
                              </>
                            )}
                          </label>
                        </div>
                        {newQuestion.question_image && (
                          <button
                            type="button"
                            onClick={() => setNewQuestion({ ...newQuestion, question_image: '' })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                      <select value={newQuestion.correct_option || 'A'} onChange={e => setNewQuestion({ ...newQuestion, correct_option: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                        <option value="A">Option A</option>
                        <option value="B">Option B</option>
                        <option value="C">Option C</option>
                        <option value="D">Option D</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                    <input type="number" min="1" required value={newQuestion.marks || 1} onChange={e => setNewQuestion({ ...newQuestion, marks: parseInt(e.target.value) })} className="w-full px-3 py-2 border rounded-md" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">Detailed Solution / Explanation (Optional)</label>
                    </div>
                    <textarea
                      rows={4}
                      value={newQuestion.explanation || ''}
                      onChange={e => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:border-purple-400 focus:ring focus:ring-purple-200 outline-none transition-all"
                      placeholder="Step-by-step solution ya explanation yahan likhein..."
                    ></textarea>
                  </div>
                  <div className="text-right flex items-center justify-end gap-3">
                    {newQuestion.id && (
                      <button
                        type="button"
                        onClick={() => setNewQuestion({ id: undefined, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A', marks: 1, question_image: '', explanation: '' })}
                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md font-bold hover:bg-gray-300 transition"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-bold">
                      {newQuestion.id ? 'Update Question' : 'Add Question'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-800 mb-2">Paste Format Example:</h4>
                    <pre className="text-xs text-blue-700 font-mono bg-white p-3 rounded border border-blue-100">
                      {`1. Bharat ki rajdhani kya hai?
A) Mumbai
B) New Delhi
C) Kolkata
D) Chennai
Answer: B
Explanation: New Delhi is the capital of India.

2. Surya sabse pehle kis rajya mein nikalta hai?
A) Gujarat
B) Arunachal Pradesh
C) Assam
D) Rajasthan
Answer: B
Explanation: Arunachal Pradesh is the easternmost state.
`}
                    </pre>
                  </div>
                  <textarea
                    rows={12}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste all your questions here. Make sure there is a blank line between each question."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                  ></textarea>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4">
                    <button
                      onClick={handleBulkSubmit}
                      disabled={parsingBulk || !bulkText.trim()}
                      className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {parsingBulk ? <RefreshCw className="h-5 w-5 animate-spin" /> : <FileSpreadsheet className="h-5 w-5" />}
                      {parsingBulk ? 'Parsing...' : 'Parse & Add All'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2 text-lg">Existing Questions ({questions.length})</h3>
              <div className="space-y-4">
                {questions.map((q, idx) => (
                  <div key={q.id} className="border border-gray-200 rounded-lg p-4 relative group">
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <button
                        onClick={() => setNewQuestion({
                          id: q.id,
                          question_text: q.question_text,
                          option_a: q.option_a,
                          option_b: q.option_b,
                          option_c: q.option_c,
                          option_d: q.option_d,
                          correct_option: q.correct_option,
                          marks: q.marks,
                          question_image: q.question_image || ''
                        })}
                        className="text-blue-500 hover:text-blue-700 bg-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Edit Question"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-500 hover:text-red-700 bg-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Question">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    {q.question_image && (
                      <div className="mb-3 rounded overflow-hidden border border-gray-100 w-32 bg-gray-50">
                        <img src={q.question_image} alt="Preview" className="w-full h-auto" />
                      </div>
                    )}
                    <p className="font-medium text-gray-900 mb-2 pr-8">{idx + 1}. {q.question_text}</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className={`p-2 rounded ${q.correct_option === 'A' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>A. {q.option_a}</div>
                      <div className={`p-2 rounded ${q.correct_option === 'B' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>B. {q.option_b}</div>
                      <div className={`p-2 rounded ${q.correct_option === 'C' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>C. {q.option_c}</div>
                      <div className={`p-2 rounded ${q.correct_option === 'D' ? 'bg-green-100 font-bold border border-green-300' : 'bg-gray-50'}`}>D. {q.option_d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'view-attempts' && (
          <div>
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">{currentTest.title} - Results</h3>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 text-center">
                  <p className="text-[10px] font-bold text-blue-400 uppercase">Avg Score</p>
                  <p className="text-sm font-bold text-blue-700">
                    {attempts.length > 0 ? (attempts.reduce((acc, a) => acc + a.score, 0) / attempts.length).toFixed(1) : 0}
                  </p>
                </div>
                <div className="bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 text-center">
                  <p className="text-[10px] font-bold text-green-400 uppercase">Highest</p>
                  <p className="text-sm font-bold text-green-700">
                    {attempts.length > 0 ? Math.max(...attempts.map(a => a.score)) : 0}
                  </p>
                </div>
                <button
                  onClick={handleDownloadRankCard}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" /> Download Rank Card
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Taken</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Q. Reached</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proctoring</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submission</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attempts.map(att => (
                    <tr key={att.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{att.students?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-gray-400">ID: {att.student_id.split('-')[0]}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{att.students?.class_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg text-blue-600">{att.score}</span>
                          <span className="text-xs text-gray-400">/ {att.total_marks}</span>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-blue-500" style={{ width: `${(att.score / att.total_marks) * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      {/* Time Taken */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {att.time_taken_seconds ? (
                          <div className="text-sm font-bold text-gray-700">
                            {Math.floor(att.time_taken_seconds / 60)}m {att.time_taken_seconds % 60}s
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      {/* Last Question Seen */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {att.last_question_seen ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-purple-700">{att.last_question_seen}</span>
                            <span className="text-xs text-gray-400">/ {att.total_marks > 0 ? att.total_marks : '?'} Q</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      {/* Proctoring */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {att.cheat_warnings > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-tighter">
                              {att.cheat_warnings} Suspicious
                            </span>
                            <AlertTriangle className="h-3 w-3 text-red-500 animate-pulse" />
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 uppercase tracking-tighter">Clean</span>
                        )}
                      </td>
                      {/* Submission type + time */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-[11px] text-gray-500 mb-1">
                          {new Date(att.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {att.submission_type === 'auto_time' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 uppercase tracking-tighter">
                            <Clock className="h-2.5 w-2.5" /> Time Over
                          </span>
                        ) : att.submission_type === 'auto_cheat' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 uppercase tracking-tighter">
                            <AlertTriangle className="h-2.5 w-2.5" /> Auto Submit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 uppercase tracking-tighter">
                            Khud kiya
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          {editScoreAttemptId === att.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editScoreValue}
                                onChange={e => setEditScoreValue(e.target.value)}
                                className="w-14 border border-blue-400 rounded px-1 py-0.5 text-sm text-center font-bold"
                                placeholder="Score"
                                min={0}
                                max={att.total_marks || 999}
                              />
                              <span className="text-gray-400 text-xs">/</span>
                              <input
                                type="number"
                                value={editTotalValue}
                                onChange={e => setEditTotalValue(e.target.value)}
                                className="w-14 border border-blue-400 rounded px-1 py-0.5 text-sm text-center"
                                placeholder="Total"
                                min={1}
                              />
                              <button
                                onClick={() => handleEditScore(att.id)}
                                disabled={savingScore}
                                className="p-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                                title="Save Score"
                              >
                                <Save className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setEditScoreAttemptId(null)}
                                className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditScoreAttemptId(att.id);
                                  setEditScoreValue(att.score.toString());
                                  setEditTotalValue(att.total_marks.toString());
                                }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors border border-transparent hover:border-blue-200"
                                title="Score Edit Karo"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleRecalculateScore(att)}
                                disabled={savingScore}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors border border-transparent hover:border-green-200 disabled:opacity-40"
                                title="DB ke stored answers se score recalculate karo"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              {videoRecordings[att.student_id] && (
                                <button
                                  onClick={() => {
                                    setVideoError(false);
                                    setVideoLoading(true);
                                    setCurrentVideoUrl(videoRecordings[att.student_id]);
                                    setCurrentVideoStudentName(att.students?.name || 'Student');
                                  }}
                                  className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors border border-transparent hover:border-purple-200"
                                  title="Play Proctoring Video"
                                >
                                  <PlayCircle className="h-4 w-4 animate-pulse" />
                                </button>
                              )}
                              {att.students?.parent_phone && (
                                <button
                                  onClick={() => {
                                    const parentPhone = att.students.parent_phone;
                                    const studentName = att.students.name;
                                    const testTitle = currentTest.title || 'Online Test';
                                    const isAutoCheat = att.submission_type === 'auto_cheat';
                                    
                                    const text = isAutoCheat
                                      ? `🔴 Sunrise Classes ALERT: Aapka bachha ${studentName} (${att.students.class_name}) online test "${testTitle}" dete waqt cheating warnings limits exceed karne ke karan system dwara AUTO-SUBMIT kar diya gaya hai. Score: ${att.score}/${att.total_marks} marks. Kripya dhyan rakhein.`
                                      : `🟢 Sunrise Classes Update: Aapke bachhe ${studentName} (${att.students.class_name}) ne online test "${testTitle}" safalta-purvak complete kar liya hai. Score: ${att.score}/${att.total_marks} marks.`;
                                    
                                    window.open(`https://wa.me/91${parentPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-transparent hover:border-emerald-200"
                                  title="WhatsApp Parent Report"
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleResetAttempt(att.student_id, att.students?.name || 'Unknown')}
                                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition-colors border border-transparent hover:border-orange-200"
                                title="Reset Attempt"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Users className="h-10 w-10 text-gray-300 mb-2" />
                          <p>No students have attempted this test yet.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'live-monitor' && (
          <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Live Test Monitor
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {lastRefreshed ? `Last updated: ${lastRefreshed.toLocaleTimeString('en-IN')} · Auto-refreshes every 20s` : 'Loading...'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {liveStudents.length > 0 && (
                  <button
                    onClick={() => setLiveVideoGridActive(!liveVideoGridActive)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${
                      liveVideoGridActive
                        ? 'bg-red-600 border-red-700 text-white shadow-md'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Camera className="h-4 w-4" />
                    {liveVideoGridActive ? 'Stop Live Grid View' : 'Start Live Grid View (P2P)'}
                  </button>
                )}
                <button
                  onClick={fetchLiveStudents}
                  disabled={liveLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${liveLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {liveLoading && liveStudents.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-300" />
                <p>Fetching live data...</p>
              </div>
            ) : liveStudents.length === 0 ? (
              <div className="py-16 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                <p className="font-bold text-gray-500 text-lg">Koi bhi abhi test nahi de raha</p>
                <p className="text-sm text-gray-400 mt-1">Jab koi student test shuru karega, yahan dikhega</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-full text-sm font-bold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                  </span>
                  {liveStudents.length} Student{liveStudents.length > 1 ? 's' : ''} Currently In Exam
                </div>

            {liveVideoGridActive ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 animate-in fade-in duration-350">
                {liveStudents.map((att) => {
                  const studentId = att.student_id;
                  const studentName = att.students?.name || 'Unknown';
                  const stream = streams[studentId];
                  const isMuted = mutedMap[studentId] !== false; // default to true (muted)
                  
                  return (
                    <VideoGridCell
                      key={studentId}
                      stream={stream}
                      liveFrame={liveFrameMap[studentId]?.image}
                      studentName={studentName}
                      isMuted={isMuted}
                      onToggleMute={() => {
                        setMutedMap(prev => ({
                          ...prev,
                          [studentId]: !isMuted
                        }));
                      }}
                      onExpand={() => {
                        setFullscreenStudentStream({ id: studentId, name: studentName });
                      }}
                      isDisconnected={manualDisconnects[studentId] === true}
                      onDisconnect={() => {
                        setManualDisconnects(prev => ({
                          ...prev,
                          [studentId]: true
                        }));
                      }}
                      onReconnect={() => {
                        setManualDisconnects(prev => ({
                          ...prev,
                          [studentId]: false
                        }));
                      }}
                      onRetryStream={() => {
                        const conn = activeConnectionsRef.current[studentId];
                        if (conn && typeof conn.requestStream === 'function') {
                          conn.requestStream();
                        }
                      }}
                      isOnline={presenceMap[studentId] === true}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveStudents.map((att) => {
                  const startedAt = new Date(att.submitted_at);
                  const minutesAgo = Math.floor((Date.now() - startedAt.getTime()) / 60000);
                  return (
                    <div key={att.id} className="bg-white border border-green-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow animate-in fade-in duration-200">
                      <div className="flex items-center gap-3 mb-3">
                        {/* Student Photo */}
                        <div className="relative shrink-0">
                          {att.students?.image ? (
                            <img src={att.students.image} alt={att.students?.name} className="h-11 w-11 rounded-full object-cover border-2 border-green-300" />
                          ) : (
                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border-2 border-green-300">
                              <span className="text-white font-black text-sm">{(att.students?.name || 'U').charAt(0).toUpperCase()}</span>
                            </div>
                          )}
                          {/* Live dot */}
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white"></span>
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{att.students?.name || 'Unknown'}</p>
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                            {att.students?.class_name}
                          </span>
                        </div>
                      </div>

                      {/* Test Info */}
                      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                        <p className="text-xs font-bold text-gray-800 truncate">{att.online_tests?.title || 'Test'}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10px] text-gray-500 font-medium">{att.online_tests?.subject}</p>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full animate-pulse">
                            Solving Q.{att.current_question_index || 1}
                          </span>
                        </div>
                      </div>

                      {/* Admin Live Actions */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Started {minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const msg = prompt(`Enter warning message to send to ${att.students?.name}:`, 'Sit properly and look at the screen!');
                              if (msg) {
                                const ch = supabase.channel(`admin-signal-${att.student_id}`);
                                ch.subscribe((st) => {
                                  if (st === 'SUBSCRIBED') {
                                    ch.send({ type: 'broadcast', event: 'admin-warning', payload: { message: msg } });
                                  }
                                });
                              }
                            }}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded border border-amber-200 text-[10px] transition-colors"
                            title="Send Warning Message to Student"
                          >
                            ⚠️ Warn
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Trigger instant 360° Room Scan for ${att.students?.name}?`)) {
                                const ch = supabase.channel(`admin-signal-${att.student_id}`);
                                ch.subscribe((st) => {
                                  if (st === 'SUBSCRIBED') {
                                    ch.send({ type: 'broadcast', event: 'request-360-scan', payload: {} });
                                  }
                                });
                              }
                            }}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded border border-purple-200 text-[10px] transition-colors"
                            title="Request Instant 360 Room Scan"
                          >
                            🎥 360 Scan
                          </button>

                          <button
                            onClick={() => handleResetAttempt(att.student_id, att.students?.name || 'Unknown')}
                            className="p-1 text-orange-500 hover:bg-orange-50 rounded font-bold transition-colors"
                            title="Reset attempt"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </div>
            )}
          </div>
        )}

        {view === 'view-proctoring' && (
          <div>
            <div className="flex justify-between items-center mb-6 border-b pb-2">
              <h3 className="text-xl font-bold text-gray-900">{currentTest.title} - AI Proctoring Logs</h3>
            </div>
            {proctoringLogs.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-dashed rounded-lg">
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No cheating incidents recorded for this test.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {proctoringLogs.map(log => (
                  <div key={log.id} className="border border-red-200 rounded-lg overflow-hidden shadow-sm bg-white hover:shadow-md transition-shadow">
                    {log.proof_image_url ? (
                      log.proof_image_url.match(/\.(webm|mp3|mp4|wav|ogg|m4a)(\?.*)?$/i) ? (
                        <div className="relative aspect-video bg-gray-900 group flex items-center justify-center p-4">
                          <audio controls src={log.proof_image_url} className="w-full" />
                        </div>
                      ) : (
                        <div
                          className="relative aspect-video bg-gray-900 group cursor-zoom-in"
                          onClick={() => setLightboxLog(log)}
                          title="Click to enlarge"
                        >
                          <img
                            src={log.proof_image_url}
                            alt="Proctoring Proof"
                            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          />
                          {/* Zoom hint overlay */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                            <span className="text-white text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full">Click to Enlarge</span>
                          </div>
                          <div className="absolute inset-0 ring-1 ring-inset ring-black/10"></div>
                        </div>
                      )
                    ) : (
                      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
                        <Camera className="h-8 w-8 opacity-20" />
                        <span className="ml-2 text-sm font-medium">No Proof Uploaded</span>
                      </div>
                    )}
                    <div className="p-4 bg-red-50 border-t border-red-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900 truncate pr-2">{log.students?.name || 'Unknown'}</h4>
                        <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold shrink-0 uppercase tracking-wider">
                          {log.students?.class_name}
                        </span>
                      </div>
                      <p className="text-sm text-red-700 font-bold mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" /> {log.warning_type}
                      </p>
                      <div className="flex justify-between items-center">
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                          <Clock className="h-3 w-3" />
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        <button
                          onClick={() => handleDeleteProctoringLog(log.id, log.proof_image_url)}
                          className="text-red-400 hover:text-red-700 p-1 rounded transition-colors"
                          title="Delete this log"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'ban-management' && (
          <div className="space-y-6">
            {/* Header / Info */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Student Ban Management</h3>
                <p className="text-xs text-gray-500 mt-0.5">Students ko temporarily ya permanently online test dene se block karein.</p>
              </div>
              <button
                onClick={fetchBannedStudents}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${bannedLoading ? 'animate-spin' : ''}`} /> Refresh List
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-150">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Student name search..."
                  value={banSearchQuery}
                  onChange={(e) => setBanSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={banFilterClass}
                    onChange={(e) => setBanFilterClass(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="All">All Classes</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Student List Table */}
            {bannedLoading ? (
              <div className="p-12 text-center text-gray-500 font-medium">Loading student list...</div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Class</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ban Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Silent Record (Video)</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason / Details</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bannedStudents
                      .filter(s => {
                        const matchesClass = banFilterClass === 'All' || s.class_name === banFilterClass;
                        const matchesSearch = s.name.toLowerCase().includes(banSearchQuery.toLowerCase());
                        return matchesClass && matchesSearch;
                      })
                      .map(s => {
                        const banType = s.test_ban_type;
                        const isBanned = banType !== null;
                        const banUntil = s.test_ban_until;
                        
                        let isExpired = false;
                        if (banType === 'temporary' && banUntil) {
                          isExpired = new Date(banUntil) <= new Date();
                        }

                        return (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            {/* Profile Image & Name */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {s.image ? (
                                  <img
                                    src={s.image}
                                    alt={s.name}
                                    className="h-10 w-10 rounded-xl object-cover object-top border border-gray-200"
                                    onError={(e) => { e.currentTarget.src = '/sunrise-logo.png'; }}
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                                    {s.name[0]}
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-bold text-gray-900">{s.name}</div>
                                  <div className="text-[10px] text-gray-400 font-medium">ID: {s.id.slice(-6)}</div>
                                </div>
                              </div>
                            </td>

                            {/* Class */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wide">
                                {s.class_name}
                              </span>
                            </td>

                            {/* Ban Status */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {!isBanned || isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-150">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active (No Ban)
                                </span>
                              ) : banType === 'permanent' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-150">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Permanent Ban
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-150">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Temp Ban
                                </span>
                              )}
                            </td>

                            {/* Silent Record Toggle */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!s.silent_record_enabled}
                                  onChange={() => handleToggleSilentRecord(s.id, !!s.silent_record_enabled)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                <span className="ml-2 text-xs font-medium text-gray-700">
                                  {s.silent_record_enabled ? 'ON (Recording)' : 'OFF'}
                                </span>
                              </label>
                            </td>

                            {/* Reason / Details */}
                            <td className="px-6 py-4">
                              <div className="text-xs text-gray-700 max-w-xs truncate" title={s.test_ban_reason || ''}>
                                {s.test_ban_reason || <span className="text-gray-300">-</span>}
                              </div>
                              {banType === 'temporary' && banUntil && !isExpired && (
                                <div className="text-[10px] text-amber-600 font-semibold mt-1">
                                  Ban runs until: {new Date(banUntil).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                              )}
                            </td>

                             {/* Actions */}
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                               <div className="flex items-center justify-end gap-2">
                                 {s.parent_phone && (
                                   <button
                                     onClick={() => {
                                       const text = isBanned && !isExpired
                                         ? `⚠️ Sunrise Classes Alert: Aapke bachhe ${s.name} (${s.class_name}) ko online test portal se ban kar diya gaya hai. Reason: ${s.test_ban_reason || 'N/A'}`
                                         : `Sunrise Classes Update: Aapke bachhe ${s.name} (${s.class_name}) ke test performance ke baare mein update.`;
                                       window.open(`https://wa.me/91${s.parent_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                     }}
                                     className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-transparent hover:border-emerald-200"
                                     title="Notify Parent on WhatsApp"
                                   >
                                     <MessageCircle className="h-4 w-4" />
                                   </button>
                                 )}
                                 {isBanned && !isExpired ? (
                                   <button
                                     onClick={() => handleUnbanStudent(s.id)}
                                     className="text-xs text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg border border-green-200 font-bold transition-all"
                                   >
                                     Unban Student
                                   </button>
                                 ) : (
                                   <button
                                     onClick={() => {
                                       setSelectedStudentForBan(s);
                                       setBanModalOpen(true);
                                     }}
                                     className="text-xs text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-200 font-bold transition-all"
                                   >
                                     Ban Student
                                   </button>
                                 )}
                               </div>
                             </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ban Modal */}
            {banModalOpen && selectedStudentForBan && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
                <div className="relative max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
                  {/* Header */}
                  <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" /> Ban Student Account
                    </h4>
                    <button
                      onClick={() => {
                        setBanModalOpen(false);
                        setSelectedStudentForBan(null);
                      }}
                      className="text-gray-400 hover:text-gray-700 bg-gray-100 p-1.5 rounded-full transition-all"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveBan} className="p-6 space-y-4">
                    {/* Student Identity */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-2xl">
                      {selectedStudentForBan.image ? (
                        <img
                          src={selectedStudentForBan.image}
                          alt={selectedStudentForBan.name}
                          className="h-11 w-11 rounded-xl object-cover object-top"
                          onError={(e) => { e.currentTarget.src = '/sunrise-logo.png'; }}
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-xl bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                          {selectedStudentForBan.name[0]}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-gray-900">{selectedStudentForBan.name}</div>
                        <div className="text-xs text-gray-500">{selectedStudentForBan.class_name}</div>
                      </div>
                    </div>

                    {/* Ban Type */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Ban Duration (Type)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setBanType('permanent')}
                          className={`py-3 rounded-2xl border font-bold text-sm transition-all ${
                            banType === 'permanent'
                              ? 'bg-red-50 text-red-700 border-red-300 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ⛔ Permanent
                        </button>
                        <button
                          type="button"
                          onClick={() => setBanType('temporary')}
                          className={`py-3 rounded-2xl border font-bold text-sm transition-all ${
                            banType === 'temporary'
                              ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          ⏰ Temporary
                        </button>
                      </div>
                    </div>

                    {/* Temporary Expiry Date/Time */}
                    {banType === 'temporary' && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Ban Expire Date & Time</label>
                        <input
                          type="datetime-local"
                          value={banUntil}
                          onChange={(e) => setBanUntil(e.target.value)}
                          required
                          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Reason */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Reason for Ban</label>
                      <textarea
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="E.g., Cheating in Class 10 Maths Test, using multiple tabs"
                        rows={3}
                        required
                        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBanModalOpen(false);
                          setSelectedStudentForBan(null);
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-250 text-gray-700 font-bold py-3.5 rounded-2xl transition-all text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingBan}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3.5 rounded-2xl transition-all disabled:opacity-50 text-sm shadow-md"
                      >
                        {savingBan ? 'Banning...' : 'Confirm Ban'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>


    {/* ── Lightbox Modal ── */}
    {lightboxLog && (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={() => setLightboxLog(null)}
      >
        <div
          className="relative max-w-4xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-red-900/80">
            <div>
              <p className="font-bold text-white text-sm">{lightboxLog.students?.name || 'Unknown'} · {lightboxLog.students?.class_name}</p>
              <p className="text-red-300 text-xs flex items-center gap-1 mt-0.5">
                <AlertTriangle className="h-3 w-3" /> {lightboxLog.warning_type}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-red-300 text-xs">{new Date(lightboxLog.created_at).toLocaleString()}</p>
              <button
                onClick={() => setLightboxLog(null)}
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1.5 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          {/* Full Image */}
          <img
            src={lightboxLog.proof_image_url}
            alt="Proctoring Proof Full"
            className="w-full max-h-[80vh] object-contain bg-black"
          />
        </div>
      </div>
    )}

    {/* ── Video Playback Modal ── */}
    {currentVideoUrl && (
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
        onClick={() => setCurrentVideoUrl(null)}
      >
        <div
          className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in zoom-in-95 duration-150"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-white/5">
            <div>
              <p className="font-bold text-white text-base">Proctoring Video Recording</p>
              <p className="text-purple-400 text-xs mt-0.5">Student: {currentVideoStudentName}</p>
            </div>
            <button
              onClick={() => setCurrentVideoUrl(null)}
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Video Player */}
          <div className="bg-black flex items-center justify-center relative aspect-video">
            {videoLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 gap-3">
                <RefreshCw className="h-7 w-7 text-purple-500 animate-spin" />
                <p className="text-xs text-gray-400 font-medium">Video buffering...</p>
              </div>
            )}
            
            {videoError ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 p-6 text-center gap-3">
                <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
                <div>
                  <p className="text-white text-sm font-bold">Video direct play nahi ho raha hai</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto font-medium">
                    Kripya niche diye gaye "Download Video" button par click karke video ko download karein aur locally play karein (MIME browser mismatch issue).
                  </p>
                </div>
              </div>
            ) : null}

            <video
              controls
              autoPlay
              onCanPlay={() => setVideoLoading(false)}
              onError={() => {
                setVideoError(true);
                setVideoLoading(false);
              }}
              className="w-full h-full object-contain"
            >
              <source src={currentVideoUrl} />
              Your browser does not support the video tag.
            </video>
          </div>
          {/* Footer controls/download */}
          <div className="px-6 py-4 bg-slate-800/50 flex justify-between items-center text-xs text-slate-400">
            <p>Runs silently in background. Auto-deletes in 10 days.</p>
            <a
              href={currentVideoUrl}
              download={`recording_${currentVideoStudentName.replace(/\s+/g, '_')}.webm`}
              target="_blank"
              rel="noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Download Video
            </a>
          </div>
        </div>
      </div>
    )}

    {/* ── WebRTC Fullscreen Live Watch Modal ── */}
    {fullscreenStudentStream && (
      <div
        className="fixed inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
        onClick={() => setFullscreenStudentStream(null)}
      >
        <div
          className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-white/5">
            <div>
              <p className="font-bold text-white text-base">Live Proctoring View</p>
              <p className="text-red-400 text-xs mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                Live Streaming: {fullscreenStudentStream.name}
              </p>
            </div>
            <button
              onClick={() => setFullscreenStudentStream(null)}
              className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Large Video Player */}
          <div className="bg-black flex items-center justify-center relative aspect-video flex-1">
            <video
              ref={el => {
                if (el && streams[fullscreenStudentStream.id]) {
                  el.srcObject = streams[fullscreenStudentStream.id];
                }
              }}
              autoPlay
              playsInline
              controls
              className="w-full h-full object-contain"
            />
          </div>
          {/* Footer Controls */}
          <div className="px-6 py-4 bg-slate-800/80 flex justify-between items-center text-xs text-slate-400">
            <p>Peer-to-peer live communication. Zero latency.</p>
            <button
              onClick={() => setFullscreenStudentStream(null)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-colors"
            >
              Close Live Watch
            </button>
          </div>
        </div>
      </div>
    )}
  </>);
}
