import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const INSTITUTE = 'SUNRISE CLASSES & ACADEMY';
const ADDRESS = 'Champanagar, Purnia, Bihar - 854201';
const MOBILE = 'Mob: 9973152070';
const ACCENT = [245, 166, 35] as [number, number, number];
const DARK = [15, 42, 92] as [number, number, number];

/**
 * Draws a premium header on the current jsPDF page.
 * Returns the Y position immediately after the header.
 */
export async function drawPDFHeader(
  doc: jsPDF,
  subtitle: string,
  description?: string
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth();
  const isA5 = pageW < 160;

  // Dark navy banner
  const bannerH = isA5 ? 35 : 42;
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, bannerH, 'F');

  // Gold accent strip at bottom of banner
  doc.setFillColor(...ACCENT);
  doc.rect(0, bannerH - 3, pageW, 3, 'F');

  // Logo (fetch from public folder)
  try {
    const logoRes = await fetch('/sunrise-logo.png');
    const blob = await logoRes.blob();
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    const logoSize = isA5 ? 20 : 28;
    const logoY = isA5 ? 6 : 5;
    doc.addImage(base64, 'PNG', 8, logoY, logoSize, logoSize);
  } catch (_) {
    // logo failed silently
  }

  // Institute name (Gold)
  doc.setTextColor(...ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isA5 ? 14 : 18);
  doc.text(INSTITUTE, pageW / 2 + (isA5 ? 10 : 0), isA5 ? 12 : 14, { align: 'center' });

  // Address (White)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isA5 ? 7 : 8.5);
  doc.text(`${ADDRESS}  |  ${MOBILE}`, pageW / 2 + (isA5 ? 10 : 0), isA5 ? 19 : 22, { align: 'center' });

  // Subtitle (light blue)
  doc.setTextColor(190, 210, 255);
  doc.setFontSize(isA5 ? 8.5 : 9.5);
  doc.setFont('helvetica', 'bold');
  doc.text(subtitle, pageW / 2 + (isA5 ? 10 : 0), isA5 ? 27 : 31, { align: 'center' });

  // Optional description line below banner
  let y = bannerH + 8;
  if (description) {
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(description, 14, y);
    y += 8;
  }

  return y;
}

/**
 * Draws a security watermark / stamp on the document to prevent easy duplication.
 */
export function drawWatermark(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  
  doc.saveGraphicsState();
  doc.setGState(new doc.GState({ opacity: 0.1 }));
  doc.setTextColor(15, 42, 92);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(40);
  
  // Rotate and print watermark in the center
  doc.text('SUNRISE CLASSES', pageW / 2, pageH / 2 + 10, {
    align: 'center',
    angle: 45
  });
  doc.restoreGraphicsState();
}

export function drawOfficialStamp(doc: jsPDF, yPos: number): void {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setTextColor(200, 40, 40); // Red ink
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('AUTHORIZED SIGNATORY', pageW - 14, yPos, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Sunrise Classes & Academy', pageW - 14, yPos + 4, { align: 'right' });
  
  // Draw a bounding box resembling a stamp
  doc.setDrawColor(200, 40, 40);
  doc.setLineWidth(0.5);
  doc.roundedRect(pageW - 65, yPos - 6, 55, 14, 2, 2, 'S');
}

/**
 * Draws branded footer on EVERY page of the document.
 */
export function drawPDFFooter(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(10, pageH - 10, pageW - 10, pageH - 10);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`${INSTITUTE}  |  ${ADDRESS}`, 14, pageH - 5);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 5, { align: 'right' });
  }
}

/**
 * Generates and downloads a rich PDF Rank Card for a specific student,
 * including test results, attendance, homework, and a performance graph.
 */
export async function generateStudentRankCardPDF(
  studentName: string,
  className: string,
  month: string,
  testResults: {testDate: string, subject: string, totalMarks: number, obtainedMarks: number, rank: number}[],
  attendance: { percentage: number, history: {date: string, status: string}[] } | null,
  homework: { completedPages: number, targetPages: number } | null
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pageW = doc.internal.pageSize.getWidth();
  
  // Header
  let y = await drawPDFHeader(doc, `STUDENT MONTHLY RANK CARD - ${month.toUpperCase()}`);
  drawWatermark(doc);
  
  // Student Info Box
  doc.setFillColor(245, 248, 255);
  doc.setDrawColor(200, 215, 240);
  doc.roundedRect(10, y, pageW - 20, 22, 3, 3, 'FD');
  
  doc.setFontSize(14);
  doc.setTextColor(15, 42, 92);
  doc.setFont('helvetica', 'bold');
  doc.text(studentName.toUpperCase(), 15, y + 8);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`Class: ${className}   |   Session: ${month}`, 15, y + 16);
  
  y += 28;
  
  // Test Results Table
  doc.setFontSize(12);
  doc.setTextColor(15, 42, 92);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Performance', 10, y);
  y += 4;
  
  const tableData = testResults.map((r, i) => [
    i + 1,
    new Date(r.testDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    r.subject,
    `${r.obtainedMarks} / ${r.totalMarks}`,
    r.rank > 0 ? `#${r.rank}` : '-'
  ]);
  
  if (tableData.length === 0) {
    tableData.push(['-', '-', 'No tests taken this month', '-', '-']);
  }
  
  autoTable(doc, {
    startY: y,
    head: [['#', 'Date', 'Subject', 'Marks', 'Rank']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 42, 92], fontSize: 9, cellPadding: 2 },
    bodyStyles: { fontSize: 9, cellPadding: 2 },
    alternateRowStyles: { fillColor: [250, 252, 255] },
    margin: { left: 10, right: 10 }
  });
  
  y = (doc as any).lastAutoTable.finalY + 10;
  
  // Attendance & Homework Box
  doc.setFontSize(12);
  doc.setTextColor(15, 42, 92);
  doc.setFont('helvetica', 'bold');
  doc.text('Monthly Overview', 10, y);
  y += 4;
  
  autoTable(doc, {
    startY: y,
    head: [['Category', 'Details', 'Remarks']],
    body: [
      [
        'Attendance', 
        attendance ? `${attendance.percentage}% Present` : 'No Data',
        attendance ? (attendance.percentage >= 75 ? 'Excellent' : attendance.percentage >= 50 ? 'Good' : 'Needs Improvement') : '-'
      ],
      [
        'Homework',
        homework && homework.targetPages > 0 ? `${homework.completedPages} of ${homework.targetPages} Pages` : 'No Target Set',
        homework && homework.targetPages > 0 ? `${Math.round((homework.completedPages/homework.targetPages)*100)}% Completed` : '-'
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 166, 35], textColor: [255, 255, 255], fontSize: 9, cellPadding: 2 },
    bodyStyles: { fontSize: 9, cellPadding: 2 },
    margin: { left: 10, right: 10 }
  });
  
  y = (doc as any).lastAutoTable.finalY + 12;
  
  // Calendar-style Attendance Grid
  if (attendance && attendance.history.length > 0) {
    if (y + 55 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 15;
      drawWatermark(doc);
    }

    doc.setFontSize(10);
    doc.setTextColor(15, 42, 92);
    doc.setFont('helvetica', 'bold');
    doc.text('Attendance Calendar', 10, y);
    y += 5;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const cellW = (pageW - 20) / 7;
    const cellH = 8;

    // Draw day headers
    days.forEach((day, i) => {
      doc.setFillColor(15, 42, 92);
      doc.rect(10 + i * cellW, y, cellW, cellH, 'F');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(day, 10 + i * cellW + cellW / 2, y + 5.5, { align: 'center' });
    });
    y += cellH;

    // Build a map of date → status
    const statusMap: Record<string, string> = {};
    attendance.history.forEach(h => { statusMap[h.date] = h.status; });

    // Get first and last day of the month
    const firstRecord = attendance.history[0].date;
    const monthDate = new Date(firstRecord + 'T00:00:00');
    const year = monthDate.getFullYear();
    const month0 = monthDate.getMonth();
    const daysInMonth = new Date(year, month0 + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month0, 1).getDay(); // 0=Sun

    // Draw calendar cells
    let col = firstDayOfWeek;
    let rowY = y;

    // Empty cells before month starts
    for (let e = 0; e < firstDayOfWeek; e++) {
      doc.setFillColor(245, 245, 245);
      doc.rect(10 + e * cellW, rowY, cellW, cellH, 'F');
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.rect(10 + e * cellW, rowY, cellW, cellH, 'S');
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = statusMap[dateStr];
      const isSun = col === 0;

      // Cell background
      if (status === 'present') {
        doc.setFillColor(220, 252, 231); // light green
      } else if (status === 'absent') {
        doc.setFillColor(254, 226, 226); // light red
      } else if (status === 'holiday' || isSun) {
        doc.setFillColor(254, 249, 195); // light yellow
      } else {
        doc.setFillColor(248, 248, 248); // no record
      }

      doc.rect(10 + col * cellW, rowY, cellW, cellH, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(10 + col * cellW, rowY, cellW, cellH, 'S');

      // Day number
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      if (status === 'present') doc.setTextColor(21, 128, 61);
      else if (status === 'absent') doc.setTextColor(185, 28, 28);
      else if (status === 'holiday' || isSun) doc.setTextColor(161, 120, 0);
      else doc.setTextColor(150, 150, 150);

      doc.text(String(day), 10 + col * cellW + cellW / 2, rowY + 3.5, { align: 'center' });

      // Status letter below day number
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      const letter = status === 'present' ? 'P' : status === 'absent' ? 'A' : status === 'holiday' ? 'H' : isSun ? 'H' : '';
      if (letter) {
        doc.text(letter, 10 + col * cellW + cellW / 2, rowY + 6.8, { align: 'center' });
      }

      col++;
      if (col === 7) {
        col = 0;
        rowY += cellH;
        // Check page overflow
        if (rowY + cellH > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          rowY = 15;
          drawWatermark(doc);
        }
      }
    }

    // Fill remaining cells in last row
    if (col > 0) {
      for (let e = col; e < 7; e++) {
        doc.setFillColor(245, 245, 245);
        doc.rect(10 + e * cellW, rowY, cellW, cellH, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.rect(10 + e * cellW, rowY, cellW, cellH, 'S');
      }
      rowY += cellH;
    }

    // Legend
    rowY += 3;
    const legendItems = [
      { color: [220, 252, 231] as [number,number,number], text: 'P = Present', tc: [21, 128, 61] as [number,number,number] },
      { color: [254, 226, 226] as [number,number,number], text: 'A = Absent', tc: [185, 28, 28] as [number,number,number] },
      { color: [254, 249, 195] as [number,number,number], text: 'H = Holiday/Sunday', tc: [161, 120, 0] as [number,number,number] },
    ];
    let lx = 10;
    legendItems.forEach(item => {
      doc.setFillColor(...item.color);
      doc.setDrawColor(200, 200, 200);
      doc.rect(lx, rowY, 5, 4, 'FD');
      doc.setFontSize(6.5);
      doc.setTextColor(...item.tc);
      doc.setFont('helvetica', 'bold');
      doc.text(item.text, lx + 6, rowY + 3.2);
      lx += 47;
    });

    y = rowY + 10;
  }

  
  // Simple Bar Graph
  if (testResults.length > 0) {
    // Check if we need to add a new page for the graph
    if (y + 50 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 15;
      drawWatermark(doc);
    }
    
    doc.setFontSize(12);
    doc.setTextColor(15, 42, 92);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance Graph (Percentage)', 10, y);
    y += 6;
    
    const chartX = 15;
    const chartY = y;
    const chartW = pageW - 30;
    const chartH = 35;
    
    // Draw axes
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(chartX, chartY, chartX, chartY + chartH); // Y axis
    doc.line(chartX, chartY + chartH, chartX + chartW, chartY + chartH); // X axis
    
    const maxBars = 10;
    const barsToShow = testResults.slice(0, maxBars);
    const barWidth = Math.min(12, (chartW - 10) / barsToShow.length - 2);
    const spacing = (chartW - 10 - (barWidth * barsToShow.length)) / (barsToShow.length + 1);
    
    barsToShow.forEach((tr, idx) => {
      const pct = Math.min(100, Math.max(0, (tr.obtainedMarks / tr.totalMarks) * 100));
      const bH = (pct / 100) * (chartH - 2);
      const bX = chartX + spacing + (idx * (barWidth + spacing));
      const bY = chartY + chartH - bH;
      
      // Draw bar
      doc.setFillColor(15, 42, 92);
      if (pct < 40) doc.setFillColor(220, 50, 50); // Red for low marks
      else if (pct >= 80) doc.setFillColor(40, 160, 80); // Green for excellent
      
      doc.rect(bX, bY, barWidth, bH, 'F');
      
      // X-axis label
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      let label = tr.subject.substring(0, 6);
      doc.text(label, bX + barWidth/2, chartY + chartH + 3, { align: 'center' });
      
      // Percentage on top of bar
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 42, 92);
      doc.text(`${Math.round(pct)}%`, bX + barWidth/2, bY - 1, { align: 'center' });
    });
    
    y += chartH + 8;
  }
  
  drawOfficialStamp(doc, doc.internal.pageSize.getHeight() - 30);
  drawPDFFooter(doc);
  
  const fileName = `RankCard_${studentName.replace(/\s+/g, '_')}_${month.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}
