import jsPDF from 'jspdf';
import { drawWatermark, drawPDFFooter } from './pdfUtils';
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

const INSTITUTE = 'SUNRISE CLASSES & ACADEMY';
const ADDRESS = 'Champanagar, Purnia, Bihar - 854201 | Mob: 9973152070';
const NAVY: [number, number, number] = [15, 42, 92];
const GOLD: [number, number, number] = [245, 166, 35];
const GREEN: [number, number, number] = [22, 163, 74];
const RED: [number, number, number] = [220, 38, 38];
const GRAY: [number, number, number] = [100, 116, 139];
const LIGHT_BG: [number, number, number] = [248, 250, 252];

export async function generateRevisionBankPDF(options: PDFExportOptions): Promise<void> {
  const {
    studentName,
    className,
    studentPin,
    title = 'STUDENT REVISION & QUESTION BANK',
    subtitle,
    filterLabel = 'All Questions',
    items,
    onProgress,
  } = options;

  if (!items || items.length === 0) {
    throw new Error('No questions to export');
  }

  onProgress?.(5, 'Preparing document...');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const footerMargin = 16;

  // Helper to draw branded header on new pages
  const drawPageHeader = (pageNum: number) => {
    // Top bar
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 14, 'F');
    doc.setFillColor(...GOLD);
    doc.rect(0, 13, pageW, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(INSTITUTE, margin, 9);

    doc.setTextColor(210, 230, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${title} • ${className}`, pageW - margin, 9, { align: 'right' });
  };

  // ── First Page Cover / Header Banner ───────────────────────────────────
  // Large Navy Banner on Page 1
  const bannerH = 34;
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, bannerH, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(0, bannerH - 2, pageW, 2, 'F');

  // Try loading logo
  try {
    const logoRes = await fetch('/sunrise-logo.png');
    if (logoRes.ok) {
      const blob = await logoRes.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      doc.addImage(base64, 'PNG', margin, 5, 24, 24);
    }
  } catch (_) {
    // fallback cleanly without logo
  }

  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(INSTITUTE, pageW / 2 + 10, 11, { align: 'center' });

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(ADDRESS, pageW / 2 + 10, 18, { align: 'center' });

  doc.setTextColor(190, 225, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, pageW / 2 + 10, 26, { align: 'center' });

  let y = bannerH + 6;

  // ── Student Info & Filter Summary Card ─────────────────────────────────
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentW, 24, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  // Col 1: Student info
  doc.setFont('helvetica', 'bold');
  doc.text(`Student: `, margin + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${studentName} (${className})`, margin + 20, y + 6);

  if (studentPin) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Roll/PIN: `, margin + 4, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.text(`${studentPin}`, margin + 20, y + 12);
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`Printed On: `, margin + 4, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text(`${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, margin + 20, y + 18);

  // Col 2: Summary stats
  const totalQ = items.length;
  const correctQ = items.filter(i => i.status === 'correct').length;
  const incorrectQ = items.filter(i => i.status === 'incorrect').length;
  const absentQ = items.filter(i => i.status === 'absent').length;

  const col2X = margin + contentW / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text(`Filter Scope: `, col2X, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${filterLabel}`, col2X + 22, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.text(`Total Sawaal: `, col2X, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalQ} Questions`, col2X + 22, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(`Summary: `, col2X, y + 18);
  doc.setTextColor(...GREEN);
  doc.text(`✓ ${correctQ} Sahi`, col2X + 18, y + 18);
  doc.setTextColor(...RED);
  doc.text(`✗ ${incorrectQ} Galat`, col2X + 38, y + 18);
  doc.setTextColor(...GRAY);
  doc.text(`⚠️ ${absentQ} Absent`, col2X + 58, y + 18);

  y += 30;

  // ── Render Questions ───────────────────────────────────────────────────
  let currentTestTitle = '';

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const q = item.question;
    const test = item.test;

    // Report progress periodically
    if (idx % 15 === 0 || idx === items.length - 1) {
      const pct = Math.round(10 + (idx / items.length) * 85);
      onProgress?.(pct, `Formatting Question ${idx + 1} of ${items.length}...`);
      // Allow UI thread to breathe
      await new Promise(r => setTimeout(r, 2));
    }

    // Check if test changed, draw section header
    const isNewTest = test.title !== currentTestTitle;
    if (isNewTest) {
      currentTestTitle = test.title;

      // Check space for test banner (needs ~14mm)
      if (y + 16 > pageH - footerMargin) {
        doc.addPage();
        drawPageHeader(doc.getNumberOfPages());
        y = 20;
      }

      doc.setFillColor(239, 246, 255);
      doc.setDrawColor(191, 219, 254);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentW, 8, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text(`📚 TEST: ${test.title} • [${test.subject || className}]`, margin + 4, y + 5.5);

      y += 12;
    }

    // Prepare Question Card Content
    const qNumberText = `Q${idx + 1}.`;
    const qLines = doc.splitTextToSize(q.question_text || '', contentW - 18);
    const qHeight = qLines.length * 4.2;

    // Options lines
    const optA = `(A) ${q.option_a || '—'}`;
    const optB = `(B) ${q.option_b || '—'}`;
    const optC = `(C) ${q.option_c || '—'}`;
    const optD = `(D) ${q.option_d || '—'}`;

    const halfW = (contentW - 12) / 2;
    const optALines = doc.splitTextToSize(optA, halfW);
    const optBLines = doc.splitTextToSize(optB, halfW);
    const optCLines = doc.splitTextToSize(optC, halfW);
    const optDLines = doc.splitTextToSize(optD, halfW);

    const row1H = Math.max(optALines.length, optBLines.length) * 3.8 + 2;
    const row2H = Math.max(optCLines.length, optDLines.length) * 3.8 + 2;

    // Explanation height
    let expLines: string[] = [];
    let expHeight = 0;
    if (q.explanation) {
      expLines = doc.splitTextToSize(`Solution: ${q.explanation}`, contentW - 12);
      expHeight = expLines.length * 3.6 + 6;
    }

    // Status bar height
    const statusH = 7;

    // Total required height for this question card
    const cardH = 8 + qHeight + row1H + row2H + statusH + expHeight + 4;

    // Check if card fits on current page
    if (y + cardH > pageH - footerMargin) {
      doc.addPage();
      drawPageHeader(doc.getNumberOfPages());
      y = 20;
    }

    // Draw Question Card Border
    doc.setFillColor(255, 255, 255);
    let cardBorderColor: [number, number, number] = [226, 232, 240];
    if (item.status === 'correct') cardBorderColor = [187, 247, 208];
    else if (item.status === 'incorrect') cardBorderColor = [254, 202, 202];
    else if (item.status === 'absent') cardBorderColor = [254, 240, 138];

    doc.setDrawColor(...cardBorderColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentW, cardH, 2, 2, 'FD');

    // Draw Q number badge
    doc.setFillColor(...NAVY);
    doc.roundedRect(margin + 3, y + 3, 11, 5.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(qNumberText, margin + 8.5, y + 7, { align: 'center' });

    // Question Text
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(qLines, margin + 17, y + 7);

    let innerY = y + 8 + qHeight;

    // Options Row 1 (A & B)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    // Helper for option styling
    const renderOption = (optKey: 'A' | 'B' | 'C' | 'D', textLines: string[], x: number, currY: number, width: number) => {
      const isCorrectOpt = q.correct_option?.trim().toUpperCase() === optKey;
      const isStudentOpt = item.studentAnswer?.trim().toUpperCase() === optKey;

      if (isCorrectOpt) {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.3);
        doc.roundedRect(x - 1, currY - 3, width, textLines.length * 3.8 + 2, 1, 1, 'FD');
        doc.setTextColor(21, 128, 61);
        doc.setFont('helvetica', 'bold');
      } else if (isStudentOpt && !isCorrectOpt) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        doc.roundedRect(x - 1, currY - 3, width, textLines.length * 3.8 + 2, 1, 1, 'FD');
        doc.setTextColor(185, 28, 28);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
      }

      doc.text(textLines, x + 2, currY);
    };

    renderOption('A', optALines, margin + 4, innerY, halfW);
    renderOption('B', optBLines, margin + 8 + halfW, innerY, halfW);

    innerY += row1H;

    // Options Row 2 (C & D)
    renderOption('C', optCLines, margin + 4, innerY, halfW);
    renderOption('D', optDLines, margin + 8 + halfW, innerY, halfW);

    innerY += row2H;

    // Status strip at bottom of card
    doc.setFillColor(248, 250, 252);
    doc.rect(margin + 0.4, innerY, contentW - 0.8, statusH, 'F');
    doc.setFontSize(7.5);

    if (item.status === 'correct') {
      doc.setTextColor(...GREEN);
      doc.setFont('helvetica', 'bold');
      doc.text(`✓ SAHI JAWAB: Option ${q.correct_option} (Aapka Jawab: Option ${item.studentAnswer})`, margin + 4, innerY + 4.5);
    } else if (item.status === 'incorrect') {
      doc.setTextColor(...RED);
      doc.setFont('helvetica', 'bold');
      doc.text(`✗ GALAT JAWAB: Aapka Jawab Option ${item.studentAnswer || '—'}  |  Sahi Jawab: Option ${q.correct_option}`, margin + 4, innerY + 4.5);
    } else if (item.status === 'absent') {
      doc.setTextColor(180, 83, 9);
      doc.setFont('helvetica', 'bold');
      doc.text(`⚠️ ABSENT TEST: Sahi Jawab Option ${q.correct_option}`, margin + 4, innerY + 4.5);
    } else {
      doc.setTextColor(...GRAY);
      doc.setFont('helvetica', 'bold');
      doc.text(`Answer Key: Option ${q.correct_option}`, margin + 4, innerY + 4.5);
    }

    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Marks: ${q.marks || 1}`, margin + contentW - 4, innerY + 4.5, { align: 'right' });

    innerY += statusH;

    // Explanation Box (if any)
    if (q.explanation) {
      doc.setFillColor(240, 249, 255);
      doc.setDrawColor(186, 230, 253);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin + 3, innerY + 1, contentW - 6, expHeight - 2, 1, 1, 'FD');

      doc.setFontSize(7);
      doc.setTextColor(3, 105, 161);
      doc.setFont('helvetica', 'normal');
      doc.text(expLines, margin + 5, innerY + 4.5);

      innerY += expHeight;
    }

    y += cardH + 4;
  }

  // Draw Watermark & Branded Footers on all pages
  onProgress?.(96, 'Applying watermarks and footers...');
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawWatermark(doc);
  }
  drawPDFFooter(doc);

  onProgress?.(100, 'Downloading PDF...');

  // Build clean filename
  const cleanStudent = studentName.replace(/\s+/g, '_');
  const cleanFilter = filterLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Sunrise_${cleanStudent}_${className.replace(/\s+/g, '')}_${cleanFilter}.pdf`;

  doc.save(filename);
}
