import jsPDF from 'jspdf';

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
