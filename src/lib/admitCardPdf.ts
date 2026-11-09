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
}

export interface STSEConfig {
  exam_date?: string;
  venue?: string;
  shifts?: string[];
  instructions?: string[];
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

  // Colors
  const NAVY = [15, 42, 92] as [number, number, number];
  const GOLD = [245, 166, 35] as [number, number, number];
  const DARK_GRAY = [50, 50, 50] as [number, number, number];
  const LIGHT_BG = [248, 250, 252] as [number, number, number];

  // Outer Border
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.2);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  // Inner Golden Accent Border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(9.5, 9.5, pageW - 19, pageH - 19);

  // Top Header Banner (Navy)
  doc.setFillColor(...NAVY);
  doc.rect(10, 10, pageW - 20, 36, 'F');

  // Gold accent strip under banner
  doc.setFillColor(...GOLD);
  doc.rect(10, 43, pageW - 20, 3, 'F');

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('SUNRISE CLASSES & ACADEMY', pageW / 2, 21, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(230, 230, 230);
  doc.text('Champanagar, Purnia, Bihar - 854201  |  Helpline: +91 9973152070', pageW / 2, 28, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...GOLD);
  doc.text('SUNRISE TALENT SEARCH EXAMINATION 2027 (STSE)', pageW / 2, 36, { align: 'center' });

  // Sub-badge: "OFFICIAL ADMIT CARD"
  const badgeY = 52;
  doc.setFillColor(...NAVY);
  doc.roundedRect(pageW / 2 - 40, badgeY - 5, 80, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL ADMIT CARD', pageW / 2, badgeY + 1.5, { align: 'center' });

  // Roll Number Highlight Box (Right Side)
  const rollBoxX = pageW - 75;
  const rollBoxY = 66;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.roundedRect(rollBoxX, rollBoxY, 60, 24, 2, 2, 'FD');

  doc.setTextColor(...DARK_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('EXAM ROLL NUMBER', rollBoxX + 30, rollBoxY + 7, { align: 'center' });

  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(reg.roll_number || 'STSE-2027-001', rollBoxX + 30, rollBoxY + 16, { align: 'center' });

  // Student Details Table (Left Side)
  const studentData = [
    ['Candidate Name:', reg.student_name.toUpperCase()],
    ['Father\'s Name:', reg.father_name.toUpperCase()],
    ['Contact / WhatsApp:', reg.phone || reg.whatsapp || 'N/A'],
    ['Target Class:', reg.class_target || 'Class 10th (Matric 2027)'],
    ['Current School:', reg.school_name || 'N/A'],
    ['Village / Area:', reg.village_area || 'Champanagar / Purnia Area'],
  ];

  autoTable(doc, {
    startY: 65,
    margin: { left: 15, right: 80 },
    theme: 'plain',
    body: studentData,
    styles: {
      fontSize: 9.5,
      cellPadding: 2.2,
      textColor: DARK_GRAY,
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: NAVY, cellWidth: 38 },
      1: { fontStyle: 'bold', textColor: [20, 20, 20] },
    },
  });

  // Examination Details Card (Centered Full Width)
  const examDetailsY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFillColor(...LIGHT_BG);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, examDetailsY, pageW - 30, 36, 2, 2, 'FD');

  // Exam Details Header Strip
  doc.setFillColor(...NAVY);
  doc.rect(15, examDetailsY, pageW - 30, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EXAMINATION VENUE & SCHEDULE', pageW / 2, examDetailsY + 5.5, { align: 'center' });

  // Schedule content
  const examDate = config?.exam_date || reg.exam_date || 'Date will be notified via WhatsApp / Call';
  const shift = reg.shift_preference || 'Shift 1: 09:30 AM - 10:30 AM';
  const venue = config?.venue || 'Sunrise Classes & Academy Campus, Main Market, Champanagar, Purnia (Bihar)';

  doc.setTextColor(...DARK_GRAY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Exam Date:', 20, examDetailsY + 15);
  doc.text('Exam Shift & Timing:', 20, examDetailsY + 22);
  doc.text('Reporting Time:', 20, examDetailsY + 29);
  doc.text('Examination Center:', 105, examDetailsY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...NAVY);
  doc.text(examDate, 55, examDetailsY + 15);
  doc.text(shift, 55, examDetailsY + 22);
  doc.text('30 Minutes before Shift start', 55, examDetailsY + 29);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);
  const venueLines = doc.splitTextToSize(venue, pageW - 145);
  doc.text(venueLines, 105, examDetailsY + 21);

  // Prizes & Incentives Highlight Box
  const prizeY = examDetailsY + 42;
  doc.setFillColor(254, 243, 199); // Soft amber
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.roundedRect(15, prizeY, pageW - 30, 26, 2, 2, 'FD');

  doc.setTextColor(146, 64, 14); // Dark Amber
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('MEGA SCHOLARSHIP AWARDS & PRIZES FOR PARTICIPANTS:', 20, prizeY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text('• Rank 1: Smartwatch + Gold Champion Trophy + 100% Free Tuition for 1 Full Year (Class 10th Batch)', 20, prizeY + 11.5);
  doc.text('• Rank 2 & 3: Digital Sports Watch + Silver Trophy + 75% Fees Waiver  |  Rank 4 to 10: 50% Fees Waiver + Books Kit', 20, prizeY + 16.5);
  doc.text('• Guaranteed Gift: Free Sunrise Exam Pad + 2 OMR Pens + Certificate of Merit to every attending candidate!', 20, prizeY + 21.5);

  // Instructions for Candidates
  const instrY = prizeY + 31;
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('IMPORTANT GUIDELINES FOR CANDIDATES (महत्वपूर्ण निर्देश):', 15, instrY);

  const instructions = [
    '1. Please carry a printed copy of this Admit Card along with an Aadhaar card or School ID.',
    '2. The exam will be 60 Minutes (50 MCQs: Maths 20, Science 20, Mental Ability 10) on an OMR Sheet.',
    '3. Every student will receive a free Sunrise Writing Pad & OMR Pen at the center.',
    '4. Mobile phones, calculators, and any cheating materials are strictly prohibited in the exam hall.',
    '5. Parents/Guardians are requested to attend the 15-Minute Orientation Seminar during the exam.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  let currentY = instrY + 5;
  instructions.forEach((inst) => {
    doc.text(inst, 15, currentY);
    currentY += 4.5;
  });

  // Signature Boxes
  const sigY = pageH - 34;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);

  // Student Signature
  doc.line(25, sigY, 75, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...DARK_GRAY);
  doc.text('Candidate\'s Signature', 50, sigY + 5, { align: 'center' });

  // Center Seal
  doc.setDrawColor(...GOLD);
  doc.roundedRect(pageW / 2 - 20, sigY - 14, 40, 18, 2, 2);
  doc.setTextColor(...GOLD);
  doc.setFontSize(7.5);
  doc.text('SUNRISE ACADEMY', pageW / 2, sigY - 7, { align: 'center' });
  doc.text('OFFICIAL SEAL', pageW / 2, sigY - 2, { align: 'center' });

  // Director Signature
  doc.setDrawColor(180, 180, 180);
  doc.line(pageW - 75, sigY, pageW - 25, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text('Controller of Examination', pageW - 50, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 100);
  doc.text('Sunrise Classes & Academy', pageW - 50, sigY + 9, { align: 'center' });

  // Save / Download PDF
  const filename = `STSE-AdmitCard-${reg.roll_number || '2027'}.pdf`;
  doc.save(filename);
}
