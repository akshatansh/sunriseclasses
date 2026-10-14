import { OnlineTest, OnlineTestQuestion, StudentTestAttempt } from './onlineTests';

export interface RevisionQuestionItem {
  question: OnlineTestQuestion;
  test: OnlineTest;
  attempt?: StudentTestAttempt;
  studentAnswer?: string;
  isCorrect?: boolean;
  status: 'correct' | 'incorrect' | 'absent' | 'unattempted';
  isStarred?: boolean;
}

export interface PDFExportOptions {
  studentName: string;
  className: string;
  studentPin?: string;
  title?: string;
  subtitle?: string;
  filterLabel?: string;
  items: RevisionQuestionItem[];
  onProgress?: (progressPercent: number, message: string) => void;
}

// ── Subject Categorization and Exact User Ordering ──────────────────────────
// 1. Math  2. Sanskrit  3. Hindi  4. Science  5. Social Science  6. Others
export function getSubjectCategory(rawSubject: string): { key: string; label: string; priority: number } {
  const s = (rawSubject || '').trim().toLowerCase();
  if (s.includes('math')) {
    return { key: 'math', label: 'Mathematics (गणित)', priority: 1 };
  }
  if (s.includes('sanskrit')) {
    return { key: 'sanskrit', label: 'Sanskrit (संस्कृत)', priority: 2 };
  }
  if (s.includes('hindi')) {
    return { key: 'hindi', label: 'Hindi (हिन्दी)', priority: 3 };
  }
  if (s.includes('sci')) {
    return { key: 'science', label: 'Science (विज्ञान)', priority: 4 };
  }
  if (s.includes('hist') || s.includes('geog') || s.includes('civic') || s.includes('econ') || s.includes('social') || s.includes('sst')) {
    return { key: 'social_science', label: 'Social Science (सामाजिक विज्ञान)', priority: 5 };
  }
  return { key: 'other', label: rawSubject ? rawSubject.trim() : 'General', priority: 6 };
}

// Sort items according to the requested subject hierarchy:
// Math -> Sanskrit -> Hindi -> Science -> Social Science -> Others
export function sortItemsBySubjectHierarchy(items: RevisionQuestionItem[]): RevisionQuestionItem[] {
  return [...items].sort((a, b) => {
    const catA = getSubjectCategory(a.test.subject || '');
    const catB = getSubjectCategory(b.test.subject || '');

    if (catA.priority !== catB.priority) {
      return catA.priority - catB.priority;
    }

    // Within same subject, sort by test title
    const testCmp = (a.test.title || '').localeCompare(b.test.title || '');
    if (testCmp !== 0) return testCmp;

    // Within same test, sort by question order
    return (a.question.created_at || '').localeCompare(b.question.created_at || '');
  });
}

// Helper to escape HTML characters
function escapeHtml(text?: string | null): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper to format basic math superscripts (e.g., x^2 -> x<sup>2</sup>)
function formatMathText(text?: string | null): string {
  if (!text) return '';
  let safe = escapeHtml(text);
  // Convert basic x^2, x^3 etc to superscripts if not already formatted
  safe = safe.replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>');
  return safe;
}

/**
 * Generates an authentic, high-resolution A4 printable document with:
 * - Proper Hindi (Devanagari) & Sanskrit fonts (no broken characters like (? . M ...))
 * - Exact subject ordering: Math -> Sanskrit -> Hindi -> Science -> Social Science
 * - Clean question cards with options, correct answer, student answer, and solutions
 * - Automatically triggers the browser's "Save as PDF / Print" dialog
 */
export async function generateRevisionBankPDF(options: PDFExportOptions): Promise<void> {
  const {
    studentName,
    className,
    studentPin,
    title = 'STUDENT REVISION & QUESTION BANK',
    filterLabel = 'All Questions',
    items,
    onProgress,
  } = options;

  if (!items || items.length === 0) {
    throw new Error('No questions to export');
  }

  onProgress?.(10, 'Organizing questions subject-wise (Math, Sanskrit, Hindi, Science, Social Science)...');

  // Sort items in the exact subject order
  const sortedItems = sortItemsBySubjectHierarchy(items);

  // Group by Subject Category
  const subjectGroups = new Map<string, { label: string; priority: number; items: RevisionQuestionItem[] }>();

  sortedItems.forEach(item => {
    const cat = getSubjectCategory(item.test.subject || '');
    if (!subjectGroups.has(cat.key)) {
      subjectGroups.set(cat.key, { label: cat.label, priority: cat.priority, items: [] });
    }
    subjectGroups.get(cat.key)!.items.push(item);
  });

  // Calculate statistics
  const totalQ = sortedItems.length;
  const correctQ = sortedItems.filter(i => i.status === 'correct').length;
  const incorrectQ = sortedItems.filter(i => i.status === 'incorrect').length;
  const absentQ = sortedItems.filter(i => i.status === 'absent' || i.status === 'unattempted').length;

  onProgress?.(30, 'Generating high-resolution print document...');

  // Build HTML
  let html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Sunrise Classes - ${escapeHtml(studentName)} - ${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Devanagari:wght@400;500;600;700;800;900&family=Poppins:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Inter', 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
      font-size: 13px;
    }
    
    /* Top Action Bar (hidden in print) */
    .top-action-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #0f2a5c;
      color: #ffffff;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .top-action-bar h2 {
      font-size: 15px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .print-btn {
      background: #f5a623;
      color: #0f2a5c;
      font-weight: 800;
      font-size: 13px;
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      transition: all 0.2s;
    }
    .print-btn:hover {
      background: #e69818;
      transform: translateY(-1px);
    }
    .close-btn {
      background: rgba(255,255,255,0.15);
      color: #ffffff;
      font-weight: 600;
      font-size: 12px;
      padding: 8px 14px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      cursor: pointer;
      margin-left: 10px;
    }

    /* Print Document Container */
    .document-page {
      max-width: 210mm;
      margin: 20px auto;
      background: #ffffff;
      padding: 16mm 16mm 20mm 16mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border-radius: 4px;
      position: relative;
    }

    /* Watermark */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 64px;
      font-weight: 900;
      color: rgba(15, 42, 92, 0.04);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      text-transform: uppercase;
      letter-spacing: 4px;
    }

    /* Header Banner */
    .header-banner {
      background: #0f2a5c;
      border-bottom: 3px solid #f5a623;
      border-radius: 12px;
      padding: 18px 24px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .institute-title {
      font-size: 20px;
      font-weight: 900;
      color: #f5a623;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-family: 'Poppins', sans-serif;
    }
    .institute-meta {
      font-size: 11px;
      color: #e2e8f0;
      margin-top: 2px;
    }
    .header-badge {
      background: rgba(245, 166, 35, 0.15);
      border: 1px solid #f5a623;
      color: #f5a623;
      font-size: 11px;
      font-weight: 800;
      padding: 6px 12px;
      border-radius: 8px;
      text-transform: uppercase;
      text-align: right;
    }

    /* Student Info Box */
    .student-info-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px 18px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 22px;
      font-size: 12px;
      position: relative;
      z-index: 1;
    }
    .info-group {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .info-item strong {
      color: #475569;
      font-weight: 600;
    }
    .info-item span {
      color: #0f172a;
      font-weight: 700;
    }
    .summary-pills {
      display: flex;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .pill-correct {
      background: #dcfce7;
      color: #15803d;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #bbf7d0;
    }
    .pill-incorrect {
      background: #fee2e2;
      color: #b91c1c;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #fecaca;
    }
    .pill-absent {
      background: #fef3c7;
      color: #b45309;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #fde68a;
    }

    /* Subject Section Header */
    .subject-section {
      margin-top: 28px;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .subject-title-bar {
      background: linear-gradient(135deg, #0f2a5c 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-left: 6px solid #f5a623;
    }
    .subject-count {
      font-size: 12px;
      background: rgba(255,255,255,0.2);
      padding: 2px 10px;
      border-radius: 20px;
      font-weight: 600;
    }

    /* Test Sub-header */
    .test-header-bar {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      margin: 14px 0 10px 0;
    }

    /* Question Card */
    .question-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      margin-bottom: 14px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      page-break-inside: avoid;
      break-inside: avoid;
      position: relative;
      z-index: 1;
    }
    .card-top {
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      padding: 6px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .q-number-badge {
      background: #0f2a5c;
      color: #ffffff;
      font-weight: 800;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .card-body {
      padding: 12px 16px;
    }
    .question-text {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
      line-height: 1.6;
    }
    
    /* Options Grid */
    .options-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 10px;
    }
    .option-cell {
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      font-size: 12.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .option-label {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 11px;
      background: #e2e8f0;
      color: #475569;
      flex-shrink: 0;
    }
    
    /* Highlight States */
    .opt-correct {
      border: 1.5px solid #22c55e !important;
      background: #f0fdf4 !important;
      color: #14532d !important;
      font-weight: 700;
    }
    .opt-correct .option-label {
      background: #16a34a !important;
      color: #ffffff !important;
    }
    
    .opt-incorrect {
      border: 1.5px solid #ef4444 !important;
      background: #fef2f2 !important;
      color: #7f1d1d !important;
      font-weight: 700;
    }
    .opt-incorrect .option-label {
      background: #dc2626 !important;
      color: #ffffff !important;
    }

    /* Result Strip */
    .result-strip {
      background: #f8fafc;
      border-top: 1px solid #f1f5f9;
      padding: 6px 14px;
      font-size: 11.5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tag-correct {
      color: #16a34a;
      font-weight: 800;
    }
    .tag-incorrect {
      color: #dc2626;
      font-weight: 800;
    }
    .tag-absent {
      color: #b45309;
      font-weight: 800;
    }

    /* Solution Box */
    .solution-box {
      margin-top: 8px;
      background: #eff6ff;
      border-left: 3px solid #3b82f6;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 11.5px;
      color: #1e40af;
      line-height: 1.5;
    }
    .solution-box strong {
      color: #1d4ed8;
      display: block;
      margin-bottom: 2px;
    }

    /* Print Styles */
    @media print {
      body {
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
      .document-page {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .subject-section {
        page-break-before: auto;
      }
      .question-card {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      @page {
        size: A4 portrait;
        margin: 12mm 14mm 14mm 14mm;
      }
    }
  </style>
</head>
<body>
  <!-- Floating Action Bar for Web View -->
  <div class="top-action-bar no-print">
    <h2>
      Sunrise Classes — Print & Save PDF Preview
    </h2>
    <div>
      <button class="print-btn" onclick="window.print()">
        Print / Save as PDF
      </button>
      <button class="close-btn" onclick="window.close()">
        Close
      </button>
    </div>
  </div>

  <div class="document-page">
    <div class="watermark">SUNRISE CLASSES</div>

    <!-- Header Banner -->
    <div class="header-banner">
      <div>
        <div class="institute-title">SUNRISE CLASSES & ACADEMY</div>
        <div class="institute-meta">Champanagar, Purnia, Bihar - 854201 • Mob: 9973152070</div>
        <div class="institute-meta" style="color: #93c5fd; font-weight: 700; margin-top: 4px;">
          ${escapeHtml(title)} • Class: ${escapeHtml(className)}
        </div>
      </div>
      <div class="header-badge">
        <div>Official Revision</div>
        <div style="font-size: 9px; opacity: 0.8; margin-top: 2px;">Sunrise Question Bank</div>
      </div>
    </div>

    <!-- Student Info Card -->
    <div class="student-info-card">
      <div class="info-group">
        <div class="info-item"><strong>Student:</strong> <span>${escapeHtml(studentName)}</span></div>
        <div class="info-item"><strong>Class:</strong> <span>${escapeHtml(className)}</span></div>
        ${studentPin ? `<div class="info-item"><strong>Roll/PIN:</strong> <span>${escapeHtml(studentPin)}</span></div>` : ''}
        <div class="info-item"><strong>Scope:</strong> <span>${escapeHtml(filterLabel)}</span></div>
        <div class="info-item"><strong>Total Questions:</strong> <span>${totalQ}</span></div>
      </div>
      <div class="summary-pills">
        <span class="pill-correct">Correct: ${correctQ}</span>
        <span class="pill-incorrect">Incorrect: ${incorrectQ}</span>
        <span class="pill-absent">Not Attempted: ${absentQ}</span>
      </div>
    </div>
`;

  // Render Questions Grouped by Subject in strict order:
  // Math (1) -> Sanskrit (2) -> Hindi (3) -> Science (4) -> Social Science (5) -> Others (6)
  const sortedSubjects = Array.from(subjectGroups.values()).sort((a, b) => a.priority - b.priority);

  let globalQuestionCounter = 1;

  for (const group of sortedSubjects) {
    html += `
    <!-- Subject Section: ${escapeHtml(group.label)} -->
    <div class="subject-section">
      <div class="subject-title-bar">
        <span>SUBJECT: ${escapeHtml(group.label)}</span>
        <span class="subject-count">${group.items.length} Questions</span>
      </div>
    </div>
`;

    // Group items inside this subject by test title
    let currentTest = '';

    for (const item of group.items) {
      const q = item.question;
      const test = item.test;

      if (test.title !== currentTest) {
        currentTest = test.title;
        html += `
      <div class="test-header-bar">
        Test: ${escapeHtml(test.title)}
      </div>
`;
      }

      const qNum = globalQuestionCounter++;
      const isCorrect = item.status === 'correct';
      const isIncorrect = item.status === 'incorrect';
      const isAbsent = item.status === 'absent' || item.status === 'unattempted';

      const studentAns = item.studentAnswer?.trim().toUpperCase();
      const correctAns = q.correct_option?.trim().toUpperCase();

      html += `
      <div class="question-card">
        <div class="card-top">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="q-number-badge">Q${qNum}</span>
            <span style="color: #64748b; font-weight: 600;">${escapeHtml(test.title)}</span>
          </div>
          <span style="color: #64748b; font-weight: 600;">Marks: ${q.marks || 1}</span>
        </div>

        <div class="card-body">
          <div class="question-text">${formatMathText(q.question_text)}</div>

          ${q.question_image ? `<div style="margin-bottom: 10px;"><img src="${escapeHtml(q.question_image)}" style="max-height: 180px; max-width: 100%; border-radius: 6px; border: 1px solid #cbd5e1;" alt="Diagram" /></div>` : ''}

          <div class="options-grid">
            <!-- Option A -->
            <div class="option-cell ${correctAns === 'A' ? 'opt-correct' : studentAns === 'A' ? 'opt-incorrect' : ''}">
              <span class="option-label">A</span>
              <span>${formatMathText(q.option_a)}</span>
            </div>

            <!-- Option B -->
            <div class="option-cell ${correctAns === 'B' ? 'opt-correct' : studentAns === 'B' ? 'opt-incorrect' : ''}">
              <span class="option-label">B</span>
              <span>${formatMathText(q.option_b)}</span>
            </div>

            <!-- Option C -->
            <div class="option-cell ${correctAns === 'C' ? 'opt-correct' : studentAns === 'C' ? 'opt-incorrect' : ''}">
              <span class="option-label">C</span>
              <span>${formatMathText(q.option_c)}</span>
            </div>

            <!-- Option D -->
            <div class="option-cell ${correctAns === 'D' ? 'opt-correct' : studentAns === 'D' ? 'opt-incorrect' : ''}">
              <span class="option-label">D</span>
              <span>${formatMathText(q.option_d)}</span>
            </div>
          </div>

          ${q.explanation ? `
          <div class="solution-box">
            <strong>Solution / Explanation:</strong>
            ${formatMathText(q.explanation)}
          </div>` : ''}
        </div>

        <div class="result-strip">
          <div>
            ${isCorrect ? `<span class="tag-correct">CORRECT: Option ${correctAns} (Your Answer: Option ${studentAns})</span>` : ''}
            ${isIncorrect ? `<span class="tag-incorrect">INCORRECT: Your Answer Option ${studentAns || '—'} | Correct Answer: Option ${correctAns}</span>` : ''}
            ${isAbsent ? `<span class="tag-absent">NOT ATTEMPTED: Correct Answer Option ${correctAns}</span>` : ''}
          </div>
          <div style="font-size: 10.5px; color: #94a3b8;">Sunrise Classes</div>
        </div>
      </div>
`;
    }
  }

  html += `
    <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
      Sunrise Classes & Academy • Champanagar, Purnia, Bihar - 854201 • Mob: 9973152070
    </div>
  </div>

  <script>
    // Automatically trigger Print dialog once document is loaded
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 600);
    };
  </script>
</body>
</html>`;

  onProgress?.(80, 'Opening print document in browser...');

  // Open in new tab/window for crystal clear browser print-to-PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    onProgress?.(100, 'Ready! Print / Save as PDF dialog opened.');
  } else {
    // If popup blocked, create a temporary downloadable HTML blob
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sunrise_${studentName.replace(/\s+/g, '_')}_Revision_Bank.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onProgress?.(100, 'Popup blocked. HTML file downloaded. Open it and press Ctrl+P (or Cmd+P) to Save as PDF.');
  }
}
