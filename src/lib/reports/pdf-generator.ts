import { AttendanceReportData } from './types';

function escapePdfText(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

interface PageStream {
  content: string[];
}

export function generatePdfAttendanceReport(data: AttendanceReportData): Buffer {
  const pageWidth = 595.28; // A4 width in pt
  const pageHeight = 841.89; // A4 height in pt
  const margin = 36; // 0.5 inch margins
  const contentWidth = pageWidth - margin * 2;

  const pages: PageStream[] = [];
  let currentPage: PageStream = { content: [] };
  let currentY = pageHeight - margin;

  const startNewPage = () => {
    currentPage = { content: [] };
    pages.push(currentPage);
    currentY = pageHeight - margin;

    // Header bar on each page
    // CUSTECH Brown top accent bar (rgb 141, 74, 39 -> 0.553, 0.290, 0.153)
    currentPage.content.push(
      `0.553 0.290 0.153 rg 0 833.89 ${pageWidth} 8 re f`,
      `0.85 0.70 0.55 rg 0 830.89 ${pageWidth} 3 re f`
    );
  };

  startNewPage();

  // 1. INSTITUTION LOGO & HEADER
  // University Header Box
  currentPage.content.push(
    `0.98 0.96 0.94 rg ${margin} ${currentY - 65} ${contentWidth} 65 re f`,
    `0.85 0.75 0.65 RG 0.75 w ${margin} ${currentY - 65} ${contentWidth} 65 re s`,
    // Text: CUSTECH
    `0.553 0.290 0.153 rg`,
    `BT /F2 13 Tf 1 0 0 1 ${margin + 12} ${currentY - 18} Tm (${escapePdfText(
      data.schoolName.toUpperCase()
    )}) Tj ET`,
    `0.25 0.25 0.25 rg`,
    `BT /F1 8.5 Tf 1 0 0 1 ${margin + 12} ${currentY - 30} Tm (${escapePdfText(
      data.subHeader
    )}) Tj ET`,
    `0.35 0.20 0.12 rg`,
    `BT /F2 9.5 Tf 1 0 0 1 ${margin + 12} ${currentY - 44} Tm (${escapePdfText(
      `${data.facultyName}  |  ${data.departmentName}`
    )}) Tj ET`,
    `0.15 0.15 0.15 rg`,
    `BT /F2 10.5 Tf 1 0 0 1 ${margin + 12} ${currentY - 58} Tm (OFFICIAL ATTENDANCE SESSION REPORT) Tj ET`
  );
  currentY -= 75;

  // 2. SESSION METADATA CARD
  const metaHeight = 76;
  currentPage.content.push(
    `0.96 0.97 0.98 rg ${margin} ${currentY - metaHeight} ${contentWidth} ${metaHeight} re f`,
    `0.80 0.85 0.90 RG 0.75 w ${margin} ${currentY - metaHeight} ${contentWidth} ${metaHeight} re s`
  );

  const col1X = margin + 10;
  const col2X = margin + 270;
  let metaY = currentY - 15;

  const drawMetaField = (x: number, y: number, label: string, value: string) => {
    currentPage.content.push(
      `0.45 0.45 0.45 rg BT /F2 7.5 Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(
        label
      )}) Tj ET`,
      `0.10 0.10 0.10 rg BT /F1 8.5 Tf 1 0 0 1 ${x + 65} ${y} Tm (${escapePdfText(
        value
      )}) Tj ET`
    );
  };

  drawMetaField(col1X, metaY, 'Course Code:', `${data.courseCode} - ${data.courseTitle}`);
  drawMetaField(col2X, metaY, 'Date of Session:', data.sessionDate);
  metaY -= 14;

  drawMetaField(col1X, metaY, 'Lecturer in Charge:', data.lecturerName);
  drawMetaField(col2X, metaY, 'Session Window:', `${data.startTime} - ${data.endTime} (${data.sessionDuration})`);
  metaY -= 14;

  drawMetaField(col1X, metaY, 'Lecture Venue:', data.venueName);
  drawMetaField(col2X, metaY, 'Session Status:', `${data.sessionStatus} (Closed & Sealed)`);
  metaY -= 14;

  drawMetaField(
    col1X,
    metaY,
    'Topic / Module:',
    data.topicTitle ? data.topicTitle : 'Regular Scheduled Course Session'
  );
  drawMetaField(
    col2X,
    metaY,
    'Attendance Total:',
    `${data.totalAttendees} verified student${data.totalAttendees === 1 ? '' : 's'}${
      data.totalEnrolled ? ` (${data.attendancePercentage || ''} of ${data.totalEnrolled} enrolled)` : ''
    }`
  );

  currentY -= metaHeight + 12;

  // 3. TABLE DEFINITIONS
  const columns = [
    { title: 'S/N', width: 28, align: 'center' },
    { title: 'Matriculation No', width: 95, align: 'left' },
    { title: 'Student Full Name', width: 145, align: 'left' },
    { title: 'Department', width: 105, align: 'left' },
    { title: 'Level', width: 35, align: 'center' },
    { title: 'Time', width: 55, align: 'center' },
    { title: 'Status', width: 60, align: 'center' },
  ];

  const drawTableHeader = () => {
    const headerHeight = 18;
    currentPage.content.push(
      // Background header
      `0.553 0.290 0.153 rg ${margin} ${currentY - headerHeight} ${contentWidth} ${headerHeight} re f`,
      `0.45 0.20 0.10 RG 0.5 w ${margin} ${currentY - headerHeight} ${contentWidth} ${headerHeight} re s`
    );

    let curX = margin;
    for (const col of columns) {
      currentPage.content.push(
        `1.0 1.0 1.0 rg BT /F2 8 Tf 1 0 0 1 ${
          col.align === 'center' ? curX + col.width / 2 - 12 : curX + 4
        } ${currentY - 12} Tm (${escapePdfText(col.title)}) Tj ET`
      );
      curX += col.width;
    }
    currentY -= headerHeight;
  };

  drawTableHeader();

  // 4. TABLE ROWS
  const rowHeight = 16;
  if (data.records.length === 0) {
    currentPage.content.push(
      `0.96 0.96 0.96 rg ${margin} ${currentY - 24} ${contentWidth} 24 re f`,
      `0.85 0.85 0.85 RG 0.5 w ${margin} ${currentY - 24} ${contentWidth} 24 re s`,
      `0.45 0.45 0.45 rg BT /F1 9 Tf 1 0 0 1 ${margin + 130} ${currentY - 15} Tm (No students marked attendance for this session.) Tj ET`
    );
    currentY -= 30;
  } else {
    for (let i = 0; i < data.records.length; i++) {
      const rec = data.records[i];

      // Check if row fits on page; leave 95pt for signature block if on last page
      if (currentY - rowHeight < margin + 60) {
        // Draw page footer before breaking
        currentPage.content.push(
          `0.50 0.50 0.50 rg BT /F1 7.5 Tf 1 0 0 1 ${margin} 24 Tm (CUSTECH Biometric Attendance Record • Page ${pages.length} • Generated: ${escapePdfText(
            data.generatedAt
          )}) Tj ET`
        );
        startNewPage();
        // Continuation Header
        currentPage.content.push(
          `0.553 0.290 0.153 rg BT /F2 8.5 Tf 1 0 0 1 ${margin} ${currentY - 12} Tm (${escapePdfText(
            `${data.courseCode} Attendance Report (Continued)`
          )}) Tj ET`
        );
        currentY -= 20;
        drawTableHeader();
      }

      const isEven = i % 2 === 0;
      const rowBg = isEven ? '1.0 1.0 1.0' : '0.975 0.975 0.975';

      currentPage.content.push(
        `${rowBg} rg ${margin} ${currentY - rowHeight} ${contentWidth} ${rowHeight} re f`,
        `0.88 0.88 0.88 RG 0.4 w ${margin} ${currentY - rowHeight} ${contentWidth} ${rowHeight} re s`
      );

      let curX = margin;
      // S/N
      currentPage.content.push(
        `0.25 0.25 0.25 rg BT /F1 7.5 Tf 1 0 0 1 ${curX + 8} ${currentY - 11.5} Tm (${rec.sn}) Tj ET`
      );
      curX += columns[0].width;

      // Matric No
      currentPage.content.push(
        `0.10 0.10 0.10 rg BT /F2 7.5 Tf 1 0 0 1 ${curX + 4} ${currentY - 11.5} Tm (${escapePdfText(
          rec.matricNumber
        )}) Tj ET`
      );
      curX += columns[1].width;

      // Student Name
      currentPage.content.push(
        `0.15 0.15 0.15 rg BT /F1 7.5 Tf 1 0 0 1 ${curX + 4} ${currentY - 11.5} Tm (${escapePdfText(
          rec.studentName.slice(0, 28)
        )}) Tj ET`
      );
      curX += columns[2].width;

      // Department
      currentPage.content.push(
        `0.30 0.30 0.30 rg BT /F1 7 Tf 1 0 0 1 ${curX + 4} ${currentY - 11.5} Tm (${escapePdfText(
          rec.department.slice(0, 22)
        )}) Tj ET`
      );
      curX += columns[3].width;

      // Level
      currentPage.content.push(
        `0.25 0.25 0.25 rg BT /F1 7 Tf 1 0 0 1 ${curX + 8} ${currentY - 11.5} Tm (${escapePdfText(
          rec.level
        )}) Tj ET`
      );
      curX += columns[4].width;

      // Time
      currentPage.content.push(
        `0.20 0.20 0.20 rg BT /F3 7 Tf 1 0 0 1 ${curX + 4} ${currentY - 11.5} Tm (${escapePdfText(
          rec.checkInTime
        )}) Tj ET`
      );
      curX += columns[5].width;

      // Status
      currentPage.content.push(
        `0.05 0.50 0.25 rg BT /F2 7 Tf 1 0 0 1 ${curX + 8} ${currentY - 11.5} Tm (VERIFIED) Tj ET`
      );

      currentY -= rowHeight;
    }
  }

  // 5. SIGNATURE & ENDORSEMENT BLOCK
  if (currentY - 75 < margin + 30) {
    // Break page for clean signature block
    currentPage.content.push(
      `0.50 0.50 0.50 rg BT /F1 7.5 Tf 1 0 0 1 ${margin} 24 Tm (CUSTECH Biometric Attendance Record • Page ${pages.length} • Generated: ${escapePdfText(
        data.generatedAt
      )}) Tj ET`
    );
    startNewPage();
  }

  currentY -= 16;
  currentPage.content.push(
    `0.35 0.35 0.35 rg BT /F1 7.5 Tf 1 0 0 1 ${margin} ${currentY} Tm (I hereby certify that the attendance records above reflect all students verified present during this academic session.) Tj ET`
  );
  currentY -= 35;

  // Signatures: Lecturer and HOD
  const sig1X = margin + 10;
  const sig2X = margin + 300;

  currentPage.content.push(
    `0.60 0.60 0.60 RG 0.75 w ${sig1X} ${currentY} m ${sig1X + 180} ${currentY} l S`,
    `0.15 0.15 0.15 rg BT /F2 8 Tf 1 0 0 1 ${sig1X} ${currentY - 10} Tm (Course Lecturer: ${escapePdfText(
      data.lecturerName
    )}) Tj ET`,
    `0.45 0.45 0.45 rg BT /F1 7 Tf 1 0 0 1 ${sig1X} ${currentY - 20} Tm (Signature & Date) Tj ET`,

    `0.60 0.60 0.60 RG 0.75 w ${sig2X} ${currentY} m ${sig2X + 180} ${currentY} l S`,
    `0.15 0.15 0.15 rg BT /F2 8 Tf 1 0 0 1 ${sig2X} ${currentY - 10} Tm (Head of Department / Director of Academic Planning) Tj ET`,
    `0.45 0.45 0.45 rg BT /F1 7 Tf 1 0 0 1 ${sig2X} ${currentY - 20} Tm (Official Stamp & Endorsement) Tj ET`
  );

  // Footer on last page
  const totalPages = pages.length;
  for (let pIdx = 0; pIdx < totalPages; pIdx++) {
    pages[pIdx].content.push(
      `0.50 0.50 0.50 rg BT /F1 7.5 Tf 1 0 0 1 ${margin} 24 Tm (Confluence University of Science & Technology, Osara • Digital Attendance Archive • Page ${
        pIdx + 1
      } of ${totalPages}) Tj ET`,
      `0.50 0.50 0.50 rg BT /F1 7.5 Tf 1 0 0 1 ${pageWidth - margin - 150} 24 Tm (Generated: ${escapePdfText(
        data.generatedAt
      )}) Tj ET`
    );
  }

  // BUILD VALID PDF-1.4 OBJECT STRUCTURE
  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  // 1: Catalog
  // 2: Pages root
  // 3: Font Helvetica
  // 4: Font Helvetica-Bold
  // 5: Font Courier
  // 6: Font Courier-Bold
  // 7..: Page objects and Content streams

  const fontHelveticaId = 3;
  const fontHelveticaBoldId = 4;
  const fontCourierId = 5;
  const fontCourierBoldId = 6;

  const pageObjectIds: number[] = [];

  // Pre-allocate page and stream IDs
  let nextObjId = 7;
  for (let i = 0; i < pages.length; i++) {
    const pageId = nextObjId++;
    const streamId = nextObjId++;
    pageObjectIds.push(pageId);
  }

  // Object 1: Catalog
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

  // Object 2: Pages
  const pageKids = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageKids}] /Count ${pages.length} /MediaBox [0 0 ${pageWidth} ${pageHeight}] >>\nendobj\n`
  );

  // Object 3-6: Fonts
  objects.push(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`);
  objects.push(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`);
  objects.push(`5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>\nendobj\n`);
  objects.push(`6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`);

  // Render Pages and Streams
  for (let i = 0; i < pages.length; i++) {
    const pageId = pageObjectIds[i];
    const streamId = pageId + 1;
    const streamContent = pages[i].content.join('\n');
    const streamLength = Buffer.byteLength(streamContent, 'utf8');

    // Page object
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontHelveticaId} 0 R /F2 ${fontHelveticaBoldId} 0 R /F3 ${fontCourierId} 0 R /F4 ${fontCourierBoldId} 0 R >> >> >>\nendobj\n`
    );

    // Stream object
    objects.push(
      `${streamId} 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`
    );
  }

  // Assemble PDF with exact byte offsets for xref table
  let pdf = `%PDF-1.4\n%âãÏÓ\n`;
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += objects[i];
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += `0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${offsets[i].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}
