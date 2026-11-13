import { createZip } from '@/lib/zip';
import { AttendanceReportData } from './types';

function escapeXml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colName(n: number): string {
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

export function generateExcelAttendanceReport(data: AttendanceReportData): Buffer {
  // Styles XML:
  // style 0: normal
  // style 1: Title (Bold 16pt, Center)
  // style 2: Subtitle (11pt Bold, Center)
  // style 3: Meta label (Bold, Dark Brown text)
  // style 4: Meta value (Normal)
  // style 5: Table Header (Bold white text, CUSTECH #8D4A27 fill, Center, Thin border)
  // style 6: Table Cell (Normal, Thin border)
  // style 7: Table Cell Center (Normal, Center, Thin border)
  // style 8: Table Cell Bold Center (Bold, Center, Thin border)
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FF8D4A27"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF8D4A27"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8F9FA"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCCCCCC"/></left>
      <right style="thin"><color rgb="FFCCCCCC"/></right>
      <top style="thin"><color rgb="FFCCCCCC"/></top>
      <bottom style="thin"><color rgb="FFCCCCCC"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

  // Build Sheet XML Rows
  let r = 1;
  const rowsXml: string[] = [];
  const merges: string[] = [];

  const addMergedRow = (text: string, styleId: number, height = 24) => {
    rowsXml.push(
      `<row r="${r}" ht="${height}" customHeight="1">` +
        `<c r="A${r}" t="inlineStr" s="${styleId}"><is><t>${escapeXml(text)}</t></is></c>` +
        Array.from({ length: 7 })
          .map((_, i) => `<c r="${colName(i + 1)}${r}" s="${styleId}"/>`)
          .join('') +
      `</row>`
    );
    merges.push(`A${r}:H${r}`);
    r++;
  };

  const addMetaRow = (label1: string, val1: string, label2: string, val2: string) => {
    rowsXml.push(
      `<row r="${r}" ht="20" customHeight="1">` +
        `<c r="A${r}" t="inlineStr" s="3"><is><t>${escapeXml(label1)}</t></is></c>` +
        `<c r="B${r}" t="inlineStr" s="4"><is><t>${escapeXml(val1)}</t></is></c>` +
        `<c r="C${r}" s="4"/>` +
        `<c r="D${r}" s="4"/>` +
        `<c r="E${r}" t="inlineStr" s="3"><is><t>${escapeXml(label2)}</t></is></c>` +
        `<c r="F${r}" t="inlineStr" s="4"><is><t>${escapeXml(val2)}</t></is></c>` +
        `<c r="G${r}" s="4"/>` +
        `<c r="H${r}" s="4"/>` +
      `</row>`
    );
    merges.push(`B${r}:D${r}`);
    merges.push(`F${r}:H${r}`);
    r++;
  };

  // 1. Institution Title
  addMergedRow(data.schoolName.toUpperCase(), 1, 28);
  addMergedRow(data.subHeader, 2, 20);
  addMergedRow(`${data.facultyName} • ${data.departmentName}`, 2, 20);
  addMergedRow('OFFICIAL CLASS ATTENDANCE SESSION REPORT', 1, 24);

  // Blank line
  rowsXml.push(`<row r="${r}" ht="12"/>`);
  r++;

  // Metadata Grid
  addMetaRow('Course Code:', data.courseCode, 'Course Title:', data.courseTitle);
  addMetaRow('Lecturer:', data.lecturerName, 'Session Date:', data.sessionDate);
  addMetaRow('Session Window:', `${data.startTime} - ${data.endTime} (${data.sessionDuration})`, 'Venue:', data.venueName);
  addMetaRow(
    'Total Attendees:',
    `${data.totalAttendees} verified students ${data.totalEnrolled ? `(out of ${data.totalEnrolled} enrolled)` : ''}`,
    'Topic / Remarks:',
    data.topicTitle || 'Regular Lecture'
  );

  // Blank line
  rowsXml.push(`<row r="${r}" ht="14"/>`);
  r++;

  // Table Headers
  const tableHeaders = [
    'S/N',
    'Matriculation Number',
    'Student Full Name',
    'Department',
    'Level',
    'Check-in Time',
    'Verification Method',
    'Attendance Status',
  ];

  rowsXml.push(
    `<row r="${r}" ht="26" customHeight="1">` +
      tableHeaders
        .map((h, i) => `<c r="${colName(i)}${r}" t="inlineStr" s="5"><is><t>${escapeXml(h)}</t></is></c>`)
        .join('') +
    `</row>`
  );
  r++;

  // Table Data Rows
  if (data.records.length === 0) {
    rowsXml.push(
      `<row r="${r}" ht="24" customHeight="1">` +
        `<c r="A${r}" t="inlineStr" s="7"><is><t>No attendance records recorded for this session.</t></is></c>` +
        Array.from({ length: 7 }).map((_, i) => `<c r="${colName(i + 1)}${r}" s="7"/>`).join('') +
      `</row>`
    );
    merges.push(`A${r}:H${r}`);
    r++;
  } else {
    for (const rec of data.records) {
      rowsXml.push(
        `<row r="${r}" ht="20" customHeight="1">` +
          `<c r="A${r}" t="n" s="7"><v>${rec.sn}</v></c>` +
          `<c r="B${r}" t="inlineStr" s="8"><is><t>${escapeXml(rec.matricNumber)}</t></is></c>` +
          `<c r="C${r}" t="inlineStr" s="6"><is><t>${escapeXml(rec.studentName)}</t></is></c>` +
          `<c r="D${r}" t="inlineStr" s="6"><is><t>${escapeXml(rec.department)}</t></is></c>` +
          `<c r="E${r}" t="inlineStr" s="7"><is><t>${escapeXml(rec.level)}</t></is></c>` +
          `<c r="F${r}" t="inlineStr" s="7"><is><t>${escapeXml(rec.checkInTime)}</t></is></c>` +
          `<c r="G${r}" t="inlineStr" s="7"><is><t>${escapeXml(rec.method)}</t></is></c>` +
          `<c r="H${r}" t="inlineStr" s="8"><is><t>${escapeXml(rec.status)}</t></is></c>` +
        `</row>`
      );
      r++;
    }
  }

  // Summary footer
  rowsXml.push(`<row r="${r}" ht="14"/>`);
  r++;
  rowsXml.push(
    `<row r="${r}" ht="20" customHeight="1">` +
      `<c r="A${r}" t="inlineStr" s="4"><is><t>Report Generated on: ${escapeXml(data.generatedAt)} | Confluence University of Science and Technology Digital Attendance System</t></is></c>` +
    `</row>`
  );
  merges.push(`A${r}:H${r}`);

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="22" customWidth="1"/>
    <col min="3" max="3" width="30" customWidth="1"/>
    <col min="4" max="4" width="24" customWidth="1"/>
    <col min="5" max="5" width="10" customWidth="1"/>
    <col min="6" max="6" width="16" customWidth="1"/>
    <col min="7" max="7" width="22" customWidth="1"/>
    <col min="8" max="8" width="18" customWidth="1"/>
  </cols>
  <sheetData>
    ${rowsXml.join('\n    ')}
  </sheetData>
  <mergeCells count="${merges.length}">
    ${merges.map((m) => `<mergeCell ref="${m}"/>`).join('\n    ')}
  </mergeCells>
</worksheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Attendance Records" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  return createZip([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]);
}
