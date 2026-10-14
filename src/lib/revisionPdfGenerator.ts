import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

// Format math equations with proper superscripts
function formatMathText(text?: string | null): string {
  if (!text) return '';
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/\^2\b/g, '<sup>2</sup>');
  formatted = formatted.replace(/\^3\b/g, '<sup>3</sup>');
  formatted = formatted.replace(/\^([0-9a-zA-Z+-]+)/g, '<sup>$1</sup>');
  formatted = formatted.replace(/\n/g, '<br/>');
  return formatted;
}

// Pre-load sunrise logo as Base64 to prevent any CORS/network delays during canvas render
async function getLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/sunrise-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generates and directly downloads a high-definition PDF file to the user's phone or computer.
 * - Zero print pop-up ("Save as PDF" dialog avoided).
 * - 100% crystal clear Hindi & Sanskrit font rendering (Google Fonts Noto Sans Devanagari).
 * - Strict subject-wise hierarchy (Math -> Sanskrit -> Hindi -> Science -> SST -> Others).
 * - Page-by-page rendering to maintain low memory usage on mobile devices.
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

  onProgress?.(5, 'Preparing document layout...');

  // Sort items strictly by user's subject priority
  const sortedItems = sortItemsBySubjectHierarchy(items);

  // Pre-load logo
  const logoBase64 = await getLogoBase64();

  // Create an offscreen staging container with fixed A4 width (794px)
  const stage = document.createElement('div');
  stage.id = 'pdf-render-stage';
  stage.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: #ffffff;
    font-family: 'Noto Sans Devanagari', 'Poppins', 'Inter', -apple-system, sans-serif;
    color: #0f172a;
    box-sizing: border-box;
    z-index: -9999;
  `;
  document.body.appendChild(stage);

  // Constants for standard A4 page at 96 DPI
  const PAGE_WIDTH_PX = 794;
  const PAGE_HEIGHT_PX = 1123;
  const P1_MAX_CONTENT_H = 885;  // Space available on Page 1 after main header & student card
  const P2_MAX_CONTENT_H = 1010; // Space available on Page 2+ after slim header

  // Summary counts
  const totalQ = sortedItems.length;
  const correctQ = sortedItems.filter(i => i.status === 'correct').length;
  const incorrectQ = sortedItems.filter(i => i.status === 'incorrect').length;
  const absentQ = sortedItems.filter(i => i.status === 'absent' || i.status === 'unattempted').length;

  interface PlannedPage {
    pageNumber: number;
    element: HTMLDivElement;
    contentContainer: HTMLDivElement;
    footerEl: HTMLDivElement;
  }

  const pages: PlannedPage[] = [];

  // Helper to create a new blank A4 page container
  const createPage = (isFirstPage: boolean): PlannedPage => {
    const pageNum = pages.length + 1;
    const pageEl = document.createElement('div');
    pageEl.className = 'pdf-page';
    pageEl.style.cssText = `
      width: ${PAGE_WIDTH_PX}px;
      height: ${PAGE_HEIGHT_PX}px;
      position: relative;
      background: #ffffff;
      box-sizing: border-box;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      margin-bottom: 20px;
    `;

    // Watermark
    const watermark = document.createElement('div');
    watermark.style.cssText = `
      position: absolute;
      top: 52%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 64px;
      font-weight: 800;
      color: #0f2a5c;
      opacity: 0.05;
      pointer-events: none;
      white-space: nowrap;
      letter-spacing: 6px;
      user-select: none;
      z-index: 0;
    `;
    watermark.innerText = 'SUNRISE CLASSES';
    pageEl.appendChild(watermark);

    // Header
    const headerWrapper = document.createElement('div');
    headerWrapper.style.cssText = 'position: relative; z-index: 1; flex-shrink: 0;';

    if (isFirstPage) {
      // Large Page 1 Banner
      const logoHtml = logoBase64 
        ? `<img src="${logoBase64}" style="width: 52px; height: 52px; object-fit: contain; border-radius: 8px; background: #ffffff; padding: 2px;" alt="Logo" />`
        : `<div style="width: 48px; height: 48px; border-radius: 8px; background: #f5a623; color: #0f2a5c; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 20px;">SC</div>`;

      headerWrapper.innerHTML = `
        <div style="background: #0f2a5c; padding: 14px 20px 12px 20px; display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 14px;">
            ${logoHtml}
            <div>
              <div style="font-size: 19px; font-weight: 800; color: #f5a623; letter-spacing: 0.5px; line-height: 1.2;">
                ${INSTITUTE}
              </div>
              <div style="font-size: 10px; color: #e2e8f0; margin-top: 3px;">
                ${ADDRESS}
              </div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="display: inline-block; background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; color: #ffffff;">
              CLASS ${className.toUpperCase()}
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #93c5fd; margin-top: 4px;">
              ${escapeHtml(title)}
            </div>
          </div>
        </div>
        <div style="height: 3px; background: linear-gradient(90deg, #f5a623, #fbbf24);"></div>

        <!-- Student & Test Summary Card -->
        <div style="margin: 10px 18px 6px 18px; padding: 10px 14px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">
              Student: <span style="color: #1e3a8a;">${escapeHtml(studentName)}</span>
              ${studentPin ? `<span style="font-size: 11px; color: #64748b; font-weight: 500; margin-left: 8px;">(Roll/PIN: ${escapeHtml(studentPin)})</span>` : ''}
            </div>
            <div style="color: #475569; margin-top: 3px;">
              Scope: <strong>${escapeHtml(filterLabel)}</strong> • Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <div style="background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; text-align: center;">
              <div style="font-size: 9px; color: #64748b; font-weight: 600;">TOTAL</div>
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${totalQ}</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #86efac; padding: 4px 10px; border-radius: 4px; text-align: center;">
              <div style="font-size: 9px; color: #16a34a; font-weight: 700;">SAHI</div>
              <div style="font-size: 13px; font-weight: 800; color: #15803d;">${correctQ}</div>
            </div>
            <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 4px 10px; border-radius: 4px; text-align: center;">
              <div style="font-size: 9px; color: #dc2626; font-weight: 700;">GALAT</div>
              <div style="font-size: 13px; font-weight: 800; color: #b91c1c;">${incorrectQ}</div>
            </div>
            <div style="background: #fefce8; border: 1px solid #fde047; padding: 4px 10px; border-radius: 4px; text-align: center;">
              <div style="font-size: 9px; color: #ca8a04; font-weight: 700;">ABSENT</div>
              <div style="font-size: 13px; font-weight: 800; color: #a16207;">${absentQ}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Slim Header for Page 2+
      headerWrapper.innerHTML = `
        <div style="background: #0f2a5c; padding: 8px 18px; display: flex; align-items: center; justify-content: space-between;">
          <div style="font-size: 11px; font-weight: 800; color: #f5a623; letter-spacing: 0.5px;">
            ${INSTITUTE}
          </div>
          <div style="font-size: 10px; color: #e2e8f0; font-weight: 600;">
            ${escapeHtml(title)} • Class ${className}
          </div>
        </div>
        <div style="height: 2px; background: #f5a623;"></div>
      `;
    }

    pageEl.appendChild(headerWrapper);

    // Content container where questions will be inserted
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      position: relative;
      z-index: 1;
      flex: 1;
      padding: 6px 18px 34px 18px;
      box-sizing: border-box;
    `;
    pageEl.appendChild(contentContainer);

    // Footer container
    const footerEl = document.createElement('div');
    footerEl.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 28px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 18px;
      font-size: 9.5px;
      color: #64748b;
      z-index: 2;
    `;
    footerEl.innerHTML = `
      <div>SUNRISE CLASSES & ACADEMY • Champanagar, Purnia</div>
      <div class="page-num-placeholder">Page ${pageNum}</div>
    `;
    pageEl.appendChild(footerEl);

    stage.appendChild(pageEl);

    const plannedPage = {
      pageNumber: pageNum,
      element: pageEl,
      contentContainer,
      footerEl
    };
    pages.push(plannedPage);
    return plannedPage;
  };

  // Helper to create subject banner element
  const createSubjectBanner = (subjectLabel: string, testTitle?: string): HTMLDivElement => {
    const banner = document.createElement('div');
    banner.style.cssText = `
      margin: 8px 0 6px 0;
      padding: 6px 12px;
      background: linear-gradient(90deg, #1e3a8a, #2563eb);
      color: #ffffff;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    `;
    banner.innerHTML = `
      <div style="font-size: 11.5px; font-weight: 800; letter-spacing: 0.3px; display: flex; align-items: center; gap: 6px;">
        <span style="display: inline-block; width: 6px; height: 6px; background: #f5a623; border-radius: 50%;"></span>
        ${escapeHtml(subjectLabel.toUpperCase())}
      </div>
      ${testTitle ? `<div style="font-size: 9.5px; opacity: 0.9; font-weight: 500;">Test: ${escapeHtml(testTitle)}</div>` : ''}
    `;
    return banner;
  };

  // Helper to create question card element
  const createQuestionCard = (item: RevisionQuestionItem, displayIdx: number): HTMLDivElement => {
    const q = item.question;
    const isCorrect = item.status === 'correct';
    const isIncorrect = item.status === 'incorrect';
    const isAbsent = item.status === 'absent' || item.status === 'unattempted';

    const card = document.createElement('div');
    card.style.cssText = `
      margin-bottom: 7px;
      padding: 7px 10px;
      background: #ffffff;
      border: 1px solid ${isCorrect ? '#86efac' : isIncorrect ? '#fca5a5' : '#cbd5e1'};
      border-radius: 5px;
      box-sizing: border-box;
    `;

    // Render option items
    const renderOptionHtml = (key: 'A' | 'B' | 'C' | 'D', text?: string | null) => {
      const isCorrectOption = q.correct_option?.trim().toUpperCase() === key;
      const isStudentOption = item.studentAnswer?.trim().toUpperCase() === key;

      let borderCol = '#e2e8f0';
      let bgCol = '#f8fafc';
      let textCol = '#334155';
      let tagBadge = '';

      if (isCorrectOption) {
        borderCol = '#16a34a';
        bgCol = '#f0fdf4';
        textCol = '#15803d';
        tagBadge = `<span style="background: #16a34a; color: #fff; font-size: 7.5px; padding: 1px 4px; border-radius: 3px; font-weight: 700; margin-left: 4px;">SAHI</span>`;
      } else if (isStudentOption && !isCorrectOption) {
        borderCol = '#dc2626';
        bgCol = '#fef2f2';
        textCol = '#b91c1c';
        tagBadge = `<span style="background: #dc2626; color: #fff; font-size: 7.5px; padding: 1px 4px; border-radius: 3px; font-weight: 700; margin-left: 4px;">AAPKA</span>`;
      }

      return `
        <div style="flex: 1; min-width: 45%; padding: 4px 6px; background: ${bgCol}; border: 1px solid ${borderCol}; border-radius: 4px; font-size: 10px; color: ${textCol}; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <strong>(${key})</strong> ${formatMathText(text || '—')}
          </div>
          ${tagBadge}
        </div>
      `;
    };

    // Status bar text
    let statusText = '';
    if (isCorrect) {
      statusText = `<span style="color: #15803d; font-weight: 700;">SAHI JAWAB: Option ${q.correct_option} (Aapka Jawab: Option ${item.studentAnswer})</span>`;
    } else if (isIncorrect) {
      statusText = `<span style="color: #b91c1c; font-weight: 700;">GALAT JAWAB: Aapka Jawab Option ${item.studentAnswer || '—'}  |  Sahi Jawab: Option ${q.correct_option}</span>`;
    } else {
      statusText = `<span style="color: #a16207; font-weight: 700;">ABSENT / UNATTEMPTED: Sahi Jawab Option ${q.correct_option}</span>`;
    }

    card.innerHTML = `
      <div style="display: flex; gap: 8px; align-items: flex-start;">
        <span style="background: #0f2a5c; color: #ffffff; font-size: 9.5px; font-weight: 800; padding: 2px 6px; border-radius: 3px; flex-shrink: 0; margin-top: 1px;">
          Q${displayIdx}.
        </span>
        <div style="font-size: 11px; font-weight: 700; color: #0f172a; line-height: 1.35; flex: 1;">
          ${formatMathText(q.question_text)}
        </div>
      </div>

      <!-- Options 2x2 Grid -->
      <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; gap: 6px;">
          ${renderOptionHtml('A', q.option_a)}
          ${renderOptionHtml('B', q.option_b)}
        </div>
        <div style="display: flex; gap: 6px;">
          ${renderOptionHtml('C', q.option_c)}
          ${renderOptionHtml('D', q.option_d)}
        </div>
      </div>

      <!-- Status Bar -->
      <div style="margin-top: 5px; padding-top: 4px; border-top: 1px dashed #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 9px;">
        <div>${statusText}</div>
        <div style="color: #64748b; font-weight: 600;">Marks: ${q.marks || 1}</div>
      </div>

      <!-- Explanation Box (if any) -->
      ${q.explanation ? `
        <div style="margin-top: 4px; padding: 4px 6px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 3px; font-size: 9px; color: #0369a1; line-height: 1.3;">
          <strong>Solution:</strong> ${formatMathText(q.explanation)}
        </div>
      ` : ''}
    `;

    return card;
  };

  // ── Layout Phase: Place questions dynamically into A4 pages ─────────────────
  let currentPage = createPage(true);
  let currentSubjectKey = '';

  for (let idx = 0; idx < sortedItems.length; idx++) {
    const item = sortedItems[idx];
    const cat = getSubjectCategory(item.test.subject || '');
    const isFirstPage = currentPage.pageNumber === 1;
    const maxHeight = isFirstPage ? P1_MAX_CONTENT_H : P2_MAX_CONTENT_H;

    // Check if new subject started
    let subjectBanner: HTMLDivElement | null = null;
    if (cat.key !== currentSubjectKey) {
      currentSubjectKey = cat.key;
      subjectBanner = createSubjectBanner(cat.label, item.test.title);
    }

    const card = createQuestionCard(item, idx + 1);

    // Tentatively append banner and card to test height
    if (subjectBanner) {
      currentPage.contentContainer.appendChild(subjectBanner);
    }
    currentPage.contentContainer.appendChild(card);

    // If height exceeds max allowed and page already has previous elements, push to new page
    if (currentPage.contentContainer.offsetHeight > maxHeight && currentPage.contentContainer.children.length > (subjectBanner ? 2 : 1)) {
      // Remove from current page
      currentPage.contentContainer.removeChild(card);
      if (subjectBanner) {
        currentPage.contentContainer.removeChild(subjectBanner);
      }

      // Create next page
      currentPage = createPage(false);

      // Add to new page
      if (subjectBanner) {
        currentPage.contentContainer.appendChild(subjectBanner);
      }
      currentPage.contentContainer.appendChild(card);
    }
  }

  // Update total page numbers in footers
  const totalPages = pages.length;
  pages.forEach(p => {
    const numEl = p.footerEl.querySelector('.page-num-placeholder');
    if (numEl) {
      numEl.textContent = `Page ${p.pageNumber} of ${totalPages}`;
    }
  });

  onProgress?.(15, `Prepared ${totalPages} pages. Generating PDF file...`);

  // ── Render Phase: Convert each page element to canvas and build PDF ─────────
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  for (let pIdx = 0; pIdx < pages.length; pIdx++) {
    const p = pages[pIdx];
    const pct = Math.round(15 + (pIdx / pages.length) * 80);
    onProgress?.(pct, `Processing Page ${pIdx + 1} of ${totalPages}...`);

    // Render using html2canvas with scale 1.5 for ultra-sharp text and fast performance
    const canvas = await html2canvas(p.element, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: PAGE_WIDTH_PX,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    if (pIdx > 0) {
      doc.addPage();
    }
    // A4 dimensions in mm: 210 x 297
    doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    // Free memory by detaching page element
    p.element.remove();
  }

  // Clean up offscreen stage
  stage.remove();

  onProgress?.(98, 'Directly downloading PDF file to device...');

  // Build clean, safe filename
  const cleanStudent = studentName.replace(/\s+/g, '_');
  const cleanFilter = filterLabel.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Sunrise_${cleanStudent}_${className.replace(/\s+/g, '')}_${cleanFilter}.pdf`;

  // Direct download to phone / computer
  doc.save(filename);

  onProgress?.(100, 'Download complete!');
}
