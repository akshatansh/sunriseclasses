import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  Star, 
  Download, 
  Search, 
  Filter, 
  RefreshCw, 
  FileText, 
  HelpCircle, 
  ArrowRight, 
  ChevronDown, 
  Eye, 
  X,
  Sparkles,
  BookMarked,
  Printer,
  Calendar
} from 'lucide-react';
import { 
  OnlineTest, 
  OnlineTestQuestion, 
  StudentTestAttempt, 
  getAllClassTestsForRevision, 
  getRevisionQuestionsForTests 
} from '../lib/onlineTests';
import { 
  generateRevisionBankPDF, 
  RevisionQuestionItem 
} from '../lib/revisionPdfGenerator';

interface Props {
  student: {
    id: string;
    name: string;
    class_name: string;
    image?: string;
  };
  studentAttempts: StudentTestAttempt[];
  onBackToTests?: () => void;
}

export default function StudentRevisionVault({ student, studentAttempts, onBackToTests }: Props) {
  // Data loading states
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<OnlineTest[]>([]);
  const [allQuestions, setAllQuestions] = useState<OnlineTestQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Local interactive practice state for absent/missed questions
  const [practiceAnswers, setPracticeAnswers] = useState<Record<string, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  // Starred / Bookmarked questions (stored in localStorage)
  const [starredIds, setStarredIds] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`starred_q_${student.id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleStar = (qId: string) => {
    setStarredIds(prev => {
      const next = { ...prev, [qId]: !prev[qId] };
      if (!next[qId]) delete next[qId];
      try {
        localStorage.setItem(`starred_q_${student.id}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string>('all'); // 'all' or testId
  const [selectedSubject, setSelectedSubject] = useState<string>('all'); // 'all' or subject
  const [statusFilter, setStatusFilter] = useState<'all' | 'incorrect' | 'absent' | 'starred' | 'correct'>('all');

  // PDF Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ percent: number; message: string }>({ percent: 0, message: '' });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  // Fetch tests and questions
  const loadRevisionData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch all class tests
      const classTests = await getAllClassTestsForRevision(student.class_name);
      setTests(classTests);

      // 2. Fetch all questions for these tests
      const testIds = classTests.map(t => t.id);
      if (testIds.length > 0) {
        const questions = await getRevisionQuestionsForTests(testIds);
        setAllQuestions(questions);
      } else {
        setAllQuestions([]);
      }
    } catch (err: any) {
      console.error('Error loading revision data:', err);
      setError('Revision data load nahi ho paya. Kripya refresh karein.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevisionData();
  }, [student.class_name]);

  // Map tests by ID for fast lookup
  const testsById = useMemo(() => {
    const map = new Map<string, OnlineTest>();
    tests.forEach(t => map.set(t.id, t));
    return map;
  }, [tests]);

  // Map student completed attempts by test ID
  const attemptsByTestId = useMemo(() => {
    const map = new Map<string, StudentTestAttempt>();
    studentAttempts.forEach(att => {
      if (att && att.test_id && att.is_completed) {
        map.set(att.test_id, att);
      }
    });
    return map;
  }, [studentAttempts]);

  // Extract distinct subjects
  const subjects = useMemo(() => {
    const set = new Set<string>();
    tests.forEach(t => {
      if (t.subject) set.add(t.subject.trim());
    });
    return Array.from(set).sort();
  }, [tests]);

  // Build unified list of QuestionItems with attempt and status metadata
  const questionItems: RevisionQuestionItem[] = useMemo(() => {
    return allQuestions.map(q => {
      const test = testsById.get(q.test_id) || {
        id: q.test_id,
        title: 'Online Test',
        class_name: student.class_name,
        subject: 'General',
        duration_minutes: 30,
        is_active: false,
        is_stopped: true,
        allow_review: true,
        created_at: new Date().toISOString()
      };

      const attempt = attemptsByTestId.get(q.test_id);
      const studentAnswer = attempt?.answers?.[q.id];
      const isStarred = !!starredIds[q.id];

      let status: 'correct' | 'incorrect' | 'absent' | 'unattempted' = 'absent';

      if (attempt) {
        if (studentAnswer) {
          const isCorrect = studentAnswer.trim().toUpperCase() === q.correct_option?.trim().toUpperCase();
          status = isCorrect ? 'correct' : 'incorrect';
        } else {
          status = 'unattempted';
        }
      } else {
        status = 'absent'; // Student did not take this test
      }

      return {
        question: q,
        test,
        attempt,
        studentAnswer,
        isCorrect: status === 'correct',
        status,
        isStarred
      };
    });
  }, [allQuestions, testsById, attemptsByTestId, starredIds, student.class_name]);

  // Global counts for stat cards
  const stats = useMemo(() => {
    let total = questionItems.length;
    let correct = 0;
    let incorrect = 0;
    let absent = 0;
    let starred = 0;

    questionItems.forEach(item => {
      if (item.status === 'correct') correct++;
      else if (item.status === 'incorrect') incorrect++;
      else if (item.status === 'absent' || item.status === 'unattempted') absent++;

      if (item.isStarred) starred++;
    });

    return { total, correct, incorrect, absent, starred };
  }, [questionItems]);

  // Filtered Items based on current selection
  const filteredItems = useMemo(() => {
    return questionItems.filter(item => {
      // 1. Test Filter
      if (selectedTestId !== 'all' && item.test.id !== selectedTestId) {
        return false;
      }

      // 2. Subject Filter
      if (selectedSubject !== 'all' && item.test.subject !== selectedSubject) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter === 'incorrect' && item.status !== 'incorrect') return false;
      if (statusFilter === 'correct' && item.status !== 'correct') return false;
      if (statusFilter === 'absent' && item.status !== 'absent' && item.status !== 'unattempted') return false;
      if (statusFilter === 'starred' && !item.isStarred) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inQuestion = item.question.question_text?.toLowerCase().includes(query);
        const inTest = item.test.title?.toLowerCase().includes(query);
        const inSubject = item.test.subject?.toLowerCase().includes(query);
        const inExplanation = item.question.explanation?.toLowerCase().includes(query);
        if (!inQuestion && !inTest && !inSubject && !inExplanation) {
          return false;
        }
      }

      return true;
    });
  }, [questionItems, selectedTestId, selectedSubject, statusFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTestId, selectedSubject, statusFilter, searchQuery]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;

  // Handle PDF Export
  const handleExportPDF = async (mode: 'current_view' | 'single_test' | 'all_tests' | 'mistakes_only' | 'absent_only') => {
    let itemsToExport: RevisionQuestionItem[] = [];
    let title = 'STUDENT REVISION & QUESTION BANK';
    let filterLabel = 'Filtered Revision';

    if (mode === 'current_view') {
      itemsToExport = filteredItems;
      filterLabel = `Custom View (${statusFilter.toUpperCase()})`;
    } else if (mode === 'single_test') {
      const test = tests.find(t => t.id === selectedTestId);
      itemsToExport = questionItems.filter(i => i.test.id === selectedTestId);
      title = `${test?.title || 'TEST'} • REVISION BANK`;
      filterLabel = `Test: ${test?.title || 'Selected'}`;
    } else if (mode === 'all_tests') {
      itemsToExport = questionItems;
      title = `COMPLETE MASTER QUESTION BANK (${tests.length} TESTS)`;
      filterLabel = `All ${tests.length} Tests Included`;
    } else if (mode === 'mistakes_only') {
      itemsToExport = questionItems.filter(i => i.status === 'incorrect');
      title = 'GALTI NOTEBOOK • MISTAKE REVISION SHEET';
      filterLabel = 'Only Incorrect Questions';
    } else if (mode === 'absent_only') {
      itemsToExport = questionItems.filter(i => i.status === 'absent' || i.status === 'unattempted');
      title = 'MISSED TESTS & UNATTEMPTED QUESTIONS';
      filterLabel = 'Absent / Missed Questions';
    }

    if (itemsToExport.length === 0) {
      alert('Is filter ke tehat koi sawaal uplabdh nahi hai.');
      return;
    }

    try {
      setIsExportingPDF(true);
      setShowExportModal(false);
      setExportProgress({ percent: 5, message: 'PDF taiyyar ho raha hai...' });

      await generateRevisionBankPDF({
        studentName: student.name,
        className: student.class_name,
        title,
        filterLabel,
        items: itemsToExport,
        onProgress: (percent, message) => {
          setExportProgress({ percent, message });
        }
      });
    } catch (err: any) {
      console.error('PDF export failed:', err);
      alert('PDF download mein samasya aayi: ' + (err.message || 'Error'));
    } finally {
      setIsExportingPDF(false);
      setExportProgress({ percent: 0, message: '' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header & Hero ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-blue-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Question Vault & Revision
              </span>
              <span className="bg-white/10 text-white/80 text-xs font-bold px-2 py-0.5 rounded-full">
                {student.class_name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-amber-400" />
              अभ्यास एवं पुनरावृत्ति (Revision Bank)
            </h1>
            <p className="text-sm text-blue-200 mt-1 max-w-2xl font-medium">
              Abhi tak ke saare tests ke sawaal, aapke sahi-galat jawab aur absent tests ki complete self-study sheet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {onBackToTests && (
              <button
                onClick={onBackToTests}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors flex items-center gap-2"
              >
                ← Wapas Live Tests
              </button>
            )}

            <button
              onClick={() => setShowExportModal(true)}
              disabled={loading || questionItems.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs transition-all shadow-lg shadow-orange-500/30 flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              DOWNLOAD REVISION PDF
            </button>

            <button
              onClick={loadRevisionData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Stats Summary Badges ── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-white/10">
          <button
            onClick={() => setStatusFilter('all')}
            className={`p-3 rounded-2xl text-left transition-all ${
              statusFilter === 'all'
                ? 'bg-white/20 ring-2 ring-white/50 shadow-md'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-blue-200">Total Sawaal</p>
            <p className="text-2xl font-black text-white mt-0.5">{stats.total}</p>
            <p className="text-[10px] text-blue-300 font-medium mt-0.5">{tests.length} Tests se</p>
          </button>

          <button
            onClick={() => setStatusFilter('incorrect')}
            className={`p-3 rounded-2xl text-left transition-all ${
              statusFilter === 'incorrect'
                ? 'bg-red-500/30 ring-2 ring-red-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-red-300">❌ Galat Hue</p>
            <p className="text-2xl font-black text-red-400 mt-0.5">{stats.incorrect}</p>
            <p className="text-[10px] text-red-300 font-medium mt-0.5">Sudharne yogya</p>
          </button>

          <button
            onClick={() => setStatusFilter('absent')}
            className={`p-3 rounded-2xl text-left transition-all ${
              statusFilter === 'absent'
                ? 'bg-amber-500/30 ring-2 ring-amber-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300">⚠️ Absent / Missed</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{stats.absent}</p>
            <p className="text-[10px] text-amber-200 font-medium mt-0.5">Chhoote hue test</p>
          </button>

          <button
            onClick={() => setStatusFilter('correct')}
            className={`p-3 rounded-2xl text-left transition-all ${
              statusFilter === 'correct'
                ? 'bg-green-500/30 ring-2 ring-green-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-green-300">✅ Sahi Hue</p>
            <p className="text-2xl font-black text-green-400 mt-0.5">{stats.correct}</p>
            <p className="text-[10px] text-green-200 font-medium mt-0.5">Shandar taiyyari</p>
          </button>

          <button
            onClick={() => setStatusFilter('starred')}
            className={`col-span-2 sm:col-span-1 p-3 rounded-2xl text-left transition-all ${
              statusFilter === 'starred'
                ? 'bg-yellow-500/30 ring-2 ring-yellow-400 shadow-md'
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider font-bold text-yellow-300">⭐ Starred</p>
            <p className="text-2xl font-black text-yellow-400 mt-0.5">{stats.starred}</p>
            <p className="text-[10px] text-yellow-200 font-medium mt-0.5">Khaas sawaal</p>
          </button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-4">
        {/* Search & Selectors Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Live Search */}
          <div className="md:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Sawaal ya topic search karein..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Test Selector (Single Test vs All Tests) */}
          <div className="md:col-span-4">
            <select
              value={selectedTestId}
              onChange={e => setSelectedTestId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">📚 Saare Tests (Master Bank - {tests.length} Tests)</option>
              {tests.map(t => {
                const isAttempted = attemptsByTestId.has(t.id);
                return (
                  <option key={t.id} value={t.id}>
                    {isAttempted ? '✅' : '⚠️'} {t.title} ({t.subject || 'All'})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="all">🎯 Sabhi Subjects</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-400 mr-2 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Filter:
          </span>

          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Sabhi ({stats.total})
          </button>

          <button
            onClick={() => setStatusFilter('incorrect')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'incorrect'
                ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
            }`}
          >
            ❌ Sirf Galat ({stats.incorrect})
          </button>

          <button
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'absent'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            ⚠️ Chhoot Gaye/Absent ({stats.absent})
          </button>

          <button
            onClick={() => setStatusFilter('starred')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'starred'
                ? 'bg-yellow-500 text-white shadow-md shadow-yellow-500/20'
                : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
            }`}
          >
            ⭐ Starred ({stats.starred})
          </button>

          <button
            onClick={() => setStatusFilter('correct')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              statusFilter === 'correct'
                ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            ✅ Sahi ({stats.correct})
          </button>

          <span className="ml-auto text-xs font-bold text-gray-500">
            Dikhaye gaye: <span className="text-blue-600 font-black">{filteredItems.length}</span> sawaal
          </span>
        </div>
      </div>

      {/* ── Active Filters Summary Notification ── */}
      {(selectedTestId !== 'all' || selectedSubject !== 'all' || statusFilter !== 'all' || searchQuery) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 font-semibold">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>Filter lagu hai:</span>
            {selectedTestId !== 'all' && (
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                Test: {tests.find(t => t.id === selectedTestId)?.title}
              </span>
            )}
            {selectedSubject !== 'all' && (
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                Subject: {selectedSubject}
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-bold uppercase">
                {statusFilter}
              </span>
            )}
            {searchQuery && (
              <span className="bg-white px-2 py-0.5 rounded-md border border-blue-200 font-bold">
                "{searchQuery}"
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSelectedTestId('all');
              setSelectedSubject('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="text-red-600 hover:text-red-800 font-bold underline"
          >
            Filters Hatao
          </button>
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-base font-bold text-gray-800">Saare tests aur sawaal load ho rahe hain...</p>
          <p className="text-xs text-gray-500 mt-1">Kuch hi seconds mein complete question bank saamne hoga.</p>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-red-800">{error}</p>
          <button
            onClick={loadRevisionData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
          >
            Dobara Try Karein
          </button>
        </div>
      )}

      {/* ── Empty State ── */}
      {!loading && !error && filteredItems.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-4">
            <BookMarked className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-black text-gray-900">Koi Sawaal Nahi Mila</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 font-medium">
            Aapke chune hue filter ke hisaab se koi question match nahi hua. Filter badal kar dekhein.
          </p>
          <button
            onClick={() => {
              setSelectedTestId('all');
              setSelectedSubject('all');
              setStatusFilter('all');
              setSearchQuery('');
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
          >
            Saare Sawaal Dekhein
          </button>
        </div>
      )}

      {/* ── Questions List ── */}
      {!loading && !error && filteredItems.length > 0 && (
        <div className="space-y-4">
          {paginatedItems.map((item, idx) => {
            const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
            const q = item.question;
            const test = item.test;
            const isAbsent = item.status === 'absent';
            const isUnattempted = item.status === 'unattempted';
            const isAttempted = !!item.attempt && !isAbsent;

            // Interactive practice for absent / missed questions
            const selectedOpt = isAttempted 
              ? item.studentAnswer 
              : practiceAnswers[q.id];
            
            const isRevealed = isAttempted || revealedAnswers[q.id];

            return (
              <div
                key={q.id}
                className={`bg-white rounded-2xl border-2 transition-all overflow-hidden ${
                  item.status === 'correct'
                    ? 'border-green-200 shadow-sm'
                    : item.status === 'incorrect'
                    ? 'border-red-200 shadow-sm'
                    : item.status === 'starred'
                    ? 'border-yellow-200 shadow-sm'
                    : 'border-gray-200 shadow-sm'
                }`}
              >
                {/* Question Top Meta Strip */}
                <div className="px-5 py-3 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                      Q{globalIdx}
                    </span>

                    <span className="text-xs font-bold text-gray-700 bg-white px-2.5 py-1 rounded-lg border border-gray-200">
                      📚 {test.title}
                    </span>

                    {test.subject && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {test.subject}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    {item.status === 'correct' && (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                        <CheckCircle className="h-3.5 w-3.5" /> Sahi Jawab (+{q.marks || 1})
                      </span>
                    )}

                    {item.status === 'incorrect' && (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full border border-red-200">
                        <AlertTriangle className="h-3.5 w-3.5" /> Galat Jawab (0/{q.marks || 1})
                      </span>
                    )}

                    {isAbsent && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200">
                        ⚠️ Test Missed / Absent
                      </span>
                    )}

                    {isUnattempted && !isAbsent && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full border border-gray-200">
                        ⚪ Not Attempted
                      </span>
                    )}

                    {/* Star / Bookmark Button */}
                    <button
                      onClick={() => toggleStar(q.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        item.isStarred
                          ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                          : 'text-gray-300 hover:text-yellow-500 hover:bg-gray-100'
                      }`}
                      title={item.isStarred ? 'Remove Star' : 'Star this Question for Revision'}
                    >
                      <Star className={`h-4 w-4 ${item.isStarred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Question Body */}
                <div className="p-5 sm:p-6">
                  <p className="text-gray-900 font-bold text-base sm:text-lg leading-relaxed mb-4">
                    {q.question_text}
                  </p>

                  {/* Question Image (if any) */}
                  {q.question_image && (
                    <div className="mb-4">
                      <img
                        src={q.question_image}
                        alt="Question Diagram"
                        className="max-h-64 rounded-xl border border-gray-200 object-contain shadow-sm"
                      />
                    </div>
                  )}

                  {/* 4 Options Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {[
                      { key: 'A', text: q.option_a },
                      { key: 'B', text: q.option_b },
                      { key: 'C', text: q.option_c },
                      { key: 'D', text: q.option_d },
                    ].map(opt => {
                      const isCorrect = q.correct_option?.trim().toUpperCase() === opt.key;
                      const isStudentSelected = selectedOpt?.trim().toUpperCase() === opt.key;

                      let cardStyle = 'border-gray-200 bg-gray-50 text-gray-700';

                      if (isRevealed) {
                        if (isCorrect) {
                          cardStyle = 'border-green-500 bg-green-50/80 text-green-950 ring-2 ring-green-300 font-bold';
                        } else if (isStudentSelected && !isCorrect) {
                          cardStyle = 'border-red-500 bg-red-50/80 text-red-950 ring-2 ring-red-300 font-bold';
                        }
                      } else if (isStudentSelected) {
                        cardStyle = 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-300 font-bold';
                      }

                      return (
                        <div
                          key={opt.key}
                          onClick={() => {
                            if (!isAttempted) {
                              setPracticeAnswers(prev => ({ ...prev, [q.id]: opt.key }));
                            }
                          }}
                          className={`p-3.5 sm:p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${cardStyle} ${
                            !isAttempted ? 'cursor-pointer hover:border-blue-300 active:scale-[0.99]' : ''
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-colors ${
                              isRevealed && isCorrect
                                ? 'bg-green-600 text-white'
                                : isRevealed && isStudentSelected && !isCorrect
                                ? 'bg-red-600 text-white'
                                : isStudentSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-700'
                            }`}
                          >
                            {opt.key}
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm leading-snug">{opt.text}</p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {isRevealed && isStudentSelected && (
                                <span
                                  className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-black ${
                                    isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                                  }`}
                                >
                                  ← Aapka Jawab
                                </span>
                              )}
                              {isRevealed && isCorrect && (
                                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-black bg-green-600 text-white">
                                  ✓ Sahi Jawab
                                </span>
                              )}
                            </div>
                          </div>

                          {isRevealed && isCorrect && (
                            <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                          )}
                          {isRevealed && isStudentSelected && !isCorrect && (
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Interactive Reveal Button for Absent / Missed Questions */}
                  {!isAttempted && !revealedAnswers[q.id] && (
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                      <span className="text-amber-800 font-medium">
                        💡 Yeh test aapka miss ho gaya tha. Pehle khud option choose karein, phir answer check karein!
                      </span>
                      <button
                        onClick={() => setRevealedAnswers(prev => ({ ...prev, [q.id]: true }))}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-black shrink-0 ml-2"
                      >
                        Sahi Jawab Dekhein →
                      </button>
                    </div>
                  )}

                  {/* Explanation Box (Visible if revealed or already attempted) */}
                  {isRevealed && q.explanation && (
                    <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900">
                      <div className="flex items-start gap-2">
                        <span className="p-1 rounded-md bg-blue-200 text-blue-800 text-xs font-bold shrink-0">
                          💡 Solution
                        </span>
                        <div>
                          <p className="text-xs font-bold text-blue-950 mb-1">Detailed Explanation:</p>
                          <p className="text-xs sm:text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                            {q.explanation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Pagination Controls ── */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm mt-6">
              <span className="text-xs font-bold text-gray-500">
                Page <span className="text-gray-900 font-black">{currentPage}</span> of{' '}
                <span className="text-gray-900 font-black">{totalPages}</span> (Total {filteredItems.length} sawaal)
              </span>

              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-4 py-2 border rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  ← Pichhla
                </button>

                {/* Page numbers */}
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
                >
                  Agla →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Export PDF Modal ── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Download Revision PDF</h3>
                <p className="text-xs text-gray-500">Apne hisaab se PDF format chunein</p>
              </div>
            </div>

            <div className="space-y-3 my-6">
              {/* Option 1: Current Filtered View */}
              <button
                onClick={() => handleExportPDF('current_view')}
                className="w-full text-left p-4 rounded-2xl border-2 border-blue-200 hover:border-blue-600 bg-blue-50/50 hover:bg-blue-50 transition-all flex items-start justify-between group"
              >
                <div>
                  <p className="text-sm font-black text-blue-900 flex items-center gap-1.5">
                    🎯 Current View PDF ({filteredItems.length} Sawaal)
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Aapne jo filter screen par lagaya hai (Status, Subject, Search), theek wahi PDF mein download hoga.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-blue-600 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </button>

              {/* Option 2: All 50 Tests Master Question Bank */}
              <button
                onClick={() => handleExportPDF('all_tests')}
                className="w-full text-left p-4 rounded-2xl border-2 border-gray-200 hover:border-purple-600 hover:bg-purple-50/50 transition-all flex items-start justify-between group"
              >
                <div>
                  <p className="text-sm font-black text-gray-900 group-hover:text-purple-900 flex items-center gap-1.5">
                    📚 Complete Master Question Bank ({tests.length} Tests • {questionItems.length} Sawaal)
                  </p>
                  <p className="text-xs text-gray-500 group-hover:text-purple-700 mt-1">
                    Class {student.class_name} ke saare past tests ka ek saath complete solved question bank.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </button>

              {/* Option 3: Mistakes Only (Galti Notebook) */}
              <button
                onClick={() => handleExportPDF('mistakes_only')}
                disabled={stats.incorrect === 0}
                className="w-full text-left p-4 rounded-2xl border-2 border-red-200 hover:border-red-600 hover:bg-red-50/50 transition-all flex items-start justify-between group disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-black text-red-900 flex items-center gap-1.5">
                    ❌ Galti Notebook (Sirf Galat Hue Sawaal - {stats.incorrect})
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Exam se pehle sirf apni galtiyon ko revise karne ke liye best option!
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-red-600 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </button>

              {/* Option 4: Absent / Missed Tests Only */}
              <button
                onClick={() => handleExportPDF('absent_only')}
                disabled={stats.absent === 0}
                className="w-full text-left p-4 rounded-2xl border-2 border-amber-200 hover:border-amber-600 hover:bg-amber-50/50 transition-all flex items-start justify-between group disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-black text-amber-900 flex items-center gap-1.5">
                    ⚠️ Missed / Absent Sawaal ({stats.absent})
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Jo tests bache ne attend nahi kiye the unke saare solved questions.
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-amber-600 group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exporting Progress Overlay ── */}
      {isExportingPDF && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl">
            <RefreshCw className="h-10 w-10 text-amber-500 animate-spin mx-auto mb-4" />
            <h4 className="text-lg font-black text-gray-900">PDF Taiyyar Ho Raha Hai...</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4">{exportProgress.message}</p>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
              <div
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-300"
                style={{ width: `${exportProgress.percent}%` }}
              ></div>
            </div>
            <p className="text-xs font-black text-amber-600 mt-2">{exportProgress.percent}% Complete</p>
          </div>
        </div>
      )}
    </div>
  );
}
