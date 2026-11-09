import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface STSERegistration {
  id?: string;
  roll_number: string;
  student_name: string;
  father_name: string;
  phone: string;
  whatsapp?: string;
  school_name: string;
  village_area: string;
  class_target?: string;
  shift_preference?: string;
  exam_date?: string;
  status?: string;
  created_at?: string;
  photo_base64?: string; // passport photo
}

export interface STSEConfig {
  exam_date?: string;
  venue?: string;
  shifts?: string[];
  instructions?: string[];
}

// Convert and crop image file to standard 3:4 passport size JPEG base64
export function resizeImageToPassportSize(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        const hRatio = canvas.width / img.width;
        const vRatio = canvas.height / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (canvas.width - img.width * ratio) / 2;
        const centerShiftY = (canvas.height - img.height * ratio) / 2;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShiftX,
          centerShiftY,
          img.width * ratio,
          img.height * ratio
        );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Convert image file to base64 string
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function generateAdmitCardPDF(
  reg: STSERegistration,
  config?: STSEConfig
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // ─── COLOR PALETTE ───────────────────────────────────
  const NAVY     = [15, 42, 92]   as [number, number, number];
  const GOLD     = [200, 140, 20] as [number, number, number]; // deeper gold
  const GOLD_BG  = [253, 246, 220] as [number, number, number];
  const DARK     = [30, 30, 30]   as [number, number, number];
  const MID      = [80, 80, 80]   as [number, number, number];
  const LIGHT    = [245, 247, 250] as [number, number, number];
  const WHITE    = [255, 255, 255] as [number, number, number];
  const RED_DARK = [160, 20, 20]  as [number, number, number];

  // ─── OUTER DOUBLE BORDER ─────────────────────────────
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.5);
  doc.rect(6, 6, pageW - 12, pageH - 12);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(8.5, 8.5, pageW - 17, pageH - 17);

  // ─── HEADER BAND ─────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(9, 9, pageW - 18, 40, 'F');

  // Gold accent line
  doc.setFillColor(...GOLD);
  doc.rect(9, 49, pageW - 18, 2.5, 'F');

  // Institute name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SUNRISE CLASSES & ACADEMY', pageW / 2, 21, { align: 'center' });

  // Address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(200, 215, 240);
  doc.text(
    'Main Market, Champanagar, Purnia (Bihar) — 854330  |  Helpline: +91 99731 52070',
    pageW / 2, 28, { align: 'center' }
  );

  // Exam title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text('SUNRISE TALENT SEARCH EXAMINATION — STSE 2027', pageW / 2, 37, { align: 'center' });

  // Red important bar
  doc.setFillColor(...RED_DARK);
  doc.rect(9, 51.5, pageW - 18, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('ADMIT CARD  /  प्रवेश-पत्र', pageW / 2, 56.5, { align: 'center' });

  // ─── CANDIDATE INFO SECTION ───────────────────────────
  const infoStartY = 64;
  const photoW = 33;
  const photoH = 40;
  const photoX = pageW - 9 - photoW - 6;
  const photoY = infoStartY;

  // Photo box
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.6);
  doc.rect(photoX, photoY, photoW, photoH);

  // Try to draw photo if available
  if (reg.photo_base64) {
    try {
      // Determine format from base64 header
      const fmt = reg.photo_base64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(reg.photo_base64, fmt, photoX, photoY, photoW, photoH);
    } catch (_) {
      // If image fails, draw placeholder text
      doc.setTextColor(...MID);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('Paste Passport', photoX + photoW / 2, photoY + 18, { align: 'center' });
      doc.text('Size Photo', photoX + photoW / 2, photoY + 23, { align: 'center' });
    }
  } else {
    doc.setTextColor(...MID);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Paste Passport', photoX + photoW / 2, photoY + 18, { align: 'center' });
    doc.text('Size Photo', photoX + photoW / 2, photoY + 23, { align: 'center' });
    doc.text('Here', photoX + photoW / 2, photoY + 28, { align: 'center' });
  }

  // Photo caption
  doc.setDrawColor(...NAVY);
  doc.setFillColor(...NAVY);
  doc.rect(photoX, photoY + photoH, photoW, 5, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text("Candidate's Photo", photoX + photoW / 2, photoY + photoH + 3.5, { align: 'center' });

  // ─── ROLL NUMBER BOX ─────────────────────────────────
  const rollX = photoX;
  const rollY = photoY + photoH + 8;
  doc.setFillColor(...GOLD_BG);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.roundedRect(rollX, rollY, photoW, 16, 1.5, 1.5, 'FD');
  doc.setTextColor(...MID);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('ROLL NUMBER', rollX + photoW / 2, rollY + 5, { align: 'center' });
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(reg.roll_number || 'STSE-2027-001', rollX + photoW / 2, rollY + 12, { align: 'center' });

  // ─── CANDIDATE DETAILS TABLE ──────────────────────────
  const tableRightMargin = pageW - photoX + 2;
  const studentData = [
    ['Candidate Name', reg.student_name.toUpperCase()],
    ["Father's Name", reg.father_name.toUpperCase()],
    ['Mobile / Contact', reg.phone || 'N/A'],
    ['Target Class', reg.class_target || 'Class 10th (Matric 2027)'],
    ['School / Vidyalaya', reg.school_name || 'N/A'],
    ['Village / Area', reg.village_area || 'Champanagar'],
    ['Category', 'General (Open Merit)'],
  ];

  autoTable(doc, {
    startY: infoStartY,
    margin: { left: 12, right: tableRightMargin },
    theme: 'grid',
    body: studentData,
    styles: {
      fontSize: 9,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      lineColor: [210, 215, 225],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        textColor: NAVY,
        fillColor: LIGHT,
        cellWidth: 36,
      },
      1: {
        fontStyle: 'bold',
        textColor: DARK,
        fillColor: WHITE,
      },
    },
  });

  // ─── EXAMINATION DETAILS SECTION ──────────────────────
  const examY = Math.max(
    (doc as any).lastAutoTable.finalY + 6,
    photoY + photoH + 32
  );

  // Section header
  doc.setFillColor(...NAVY);
  doc.rect(12, examY, pageW - 24, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EXAMINATION DETAILS / परीक्षा विवरण', pageW / 2, examY + 4.8, { align: 'center' });

  const examDate = config?.exam_date || reg.exam_date || 'Notified via WhatsApp / Call';
  const shift = reg.shift_preference || 'Shift 1: 09:30 AM - 10:30 AM';
  const venue = config?.venue || 'Sunrise Classes & Academy, Main Market, Champanagar, Purnia (Bihar)';

  const examDetails = [
    ['Exam Date / परीक्षा तिथि', examDate, 'Exam Mode / परीक्षा माध्यम', 'Offline (OMR Based)'],
    ['Exam Shift / शिफ्ट', shift, 'Reporting Time / उपस्थिति', '30 min. before shift'],
    ['Duration / अवधि', '60 Minutes (1 Hour)', 'Total Questions', '50 MCQs (No Negative)'],
  ];

  autoTable(doc, {
    startY: examY + 7,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    body: examDetails,
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      lineColor: [210, 215, 225],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT, cellWidth: 44 },
      1: { fontStyle: 'bold', textColor: DARK, fillColor: WHITE, cellWidth: 46 },
      2: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT, cellWidth: 44 },
      3: { fontStyle: 'bold', textColor: DARK, fillColor: WHITE },
    },
  });

  // Venue row
  const venueY = (doc as any).lastAutoTable.finalY;
  autoTable(doc, {
    startY: venueY,
    margin: { left: 12, right: 12 },
    theme: 'grid',
    body: [['Exam Center / परीक्षा केंद्र', venue]],
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
      lineColor: [210, 215, 225],
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: NAVY, fillColor: LIGHT, cellWidth: 44 },
      1: { fontStyle: 'bold', textColor: DARK, fillColor: WHITE },
    },
  });

  // ─── SCHOLARSHIP / PRIZE HIGHLIGHTS ───────────────────
  const prizeSectionY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFillColor(...GOLD_BG);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(12, prizeSectionY, pageW - 24, 25, 'FD');

  doc.setFillColor(...GOLD);
  doc.rect(12, prizeSectionY, pageW - 24, 6, 'F');
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('SCHOLARSHIP & PRIZE DETAILS', pageW / 2, prizeSectionY + 4.2, { align: 'center' });

  const prizeLines = [
    '• Rank 1 (Topper)  :  Smartwatch + Gold Champion Trophy + 100% Free Tuition (Full Year, Class 10th)',
    '• Rank 2 & 3        :  Digital Watch + Silver Trophy + 75% Fees Waiver     |  Rank 4–10 :  Books Kit + 25% Fees Waiver',
    '• All Participants  :  FREE Sunrise Exam Writing Pad + OMR Pens + Official Certificate of Participation',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...DARK);
  prizeLines.forEach((line, i) => {
    doc.text(line, 15, prizeSectionY + 10 + i * 5);
  });

  // ─── INSTRUCTIONS ─────────────────────────────────────
  const instrY = prizeSectionY + 30;
  doc.setFillColor(...NAVY);
  doc.rect(12, instrY, pageW - 24, 6, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INSTRUCTIONS FOR CANDIDATES / महत्वपूर्ण निर्देश', pageW / 2, instrY + 4.2, { align: 'center' });

  const instructions = [
    '1. Carry this Admit Card (printed) + School ID Card / Aadhaar Card on exam day.',
    '2. Mobile phones, calculators, and electronic devices are strictly NOT allowed in the exam hall.',
    '3. Report at the examination center at least 30 minutes before the start of your shift.',
    '4. Each student will receive a free Sunrise Writing Pad & OMR Pen at the exam center.',
    '5. Parents are requested to attend the FREE 15-minute Guidance Seminar held during the exam.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...DARK);
  instructions.forEach((inst, i) => {
    doc.text(inst, 15, instrY + 10 + i * 4.8);
  });

  // ─── SIGNATURE ROW ────────────────────────────────────
  const sigBaseY = pageH - 28;

  // Candidate signature box
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.4);
  doc.rect(14, sigBaseY - 10, 50, 10);
  doc.setFillColor(...LIGHT);
  doc.rect(14, sigBaseY - 10, 50, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  doc.text("Candidate's Signature", 39, sigBaseY + 2, { align: 'center' });

  // Center official seal box
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(pageW / 2 - 22, sigBaseY - 14, 44, 18);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('SUNRISE CLASSES', pageW / 2, sigBaseY - 7.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Official Seal / Stamp', pageW / 2, sigBaseY - 2, { align: 'center' });

  // Controller signature box
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.4);
  doc.rect(pageW - 64, sigBaseY - 10, 50, 10);
  doc.setFillColor(...LIGHT);
  doc.rect(pageW - 64, sigBaseY - 10, 50, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text('Controller of Examinations', pageW - 39, sigBaseY + 2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MID);
  doc.text('Sunrise Classes & Academy', pageW - 39, sigBaseY + 7, { align: 'center' });

  // ─── BOTTOM STRIP ─────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(9, pageH - 13, pageW - 18, 4, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(
    `Roll No: ${reg.roll_number}  |  Generated on: ${new Date().toLocaleDateString('en-IN')}  |  STSE 2027 — Sunrise Classes & Academy, Champanagar`,
    pageW / 2, pageH - 10.5, { align: 'center' }
  );

  // ─── SAVE ─────────────────────────────────────────────
  doc.save(`STSE-AdmitCard-${reg.roll_number || '2027'}.pdf`);
}
