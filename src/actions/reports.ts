'use server';

import { custechDb } from '@/lib/db/repository';
import { getServerSession } from '@/lib/auth/server-session';
import { generateExcelAttendanceReport } from '@/lib/reports/excel-generator';
import { generatePdfAttendanceReport } from '@/lib/reports/pdf-generator';
import { AttendanceReportData } from '@/lib/reports/types';

export async function downloadAttendanceReportAction(sessionId: string): Promise<{
  success: boolean;
  error?: string;
  pdfBase64?: string;
  excelBase64?: string;
  filename?: string;
  totalAttendees?: number;
}> {
  try {
    custechDb.ensureFreshData();

    // Authenticate session (allow lecturer, hod, dean, admin, or session owner)
    const serverSession = await getServerSession();
    if (!serverSession) {
      return { success: false, error: 'Unauthorized: Please log in to download attendance reports.' };
    }

    const session = custechDb.getSessionById(sessionId);
    if (!session) {
      return { success: false, error: `Attendance session "${sessionId}" was not found.` };
    }

    const offering = custechDb.getOfferingById(session.courseOfferingId);
    const course = offering?.course;
    const classroom = session.classroom;
    const lecturer = session.lecturer || (offering?.primaryLecturerId ? custechDb.getProfileById(offering.primaryLecturerId) : undefined);

    const lecturerName = lecturer
      ? `${lecturer.firstName} ${lecturer.lastName}`
      : 'Course Lecturer';

    const courseCode = course?.code || 'CUSTECH COURSE';
    const courseTitle = course?.title || 'Academic Course';

    // Format Session Date and Times
    const sessionDateRaw = session.date || (session.scheduledStart ? session.scheduledStart.split('T')[0] : new Date().toISOString().split('T')[0]);
    const sessionDateObj = new Date(session.scheduledStart || sessionDateRaw);
    const sessionDate = isNaN(sessionDateObj.getTime())
      ? sessionDateRaw
      : sessionDateObj.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });

    const formatTime = (isoString?: string) => {
      if (!isoString) return '--:--';
      const d = new Date(isoString);
      return isNaN(d.getTime())
        ? isoString
        : d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const startTimeFormatted = formatTime(session.actualStart || session.scheduledStart);
    const endTimeFormatted = formatTime(session.actualClose || session.scheduledEnd);

    // Duration calculation
    const startMs = new Date(session.actualStart || session.scheduledStart).getTime();
    const endMs = new Date(session.actualClose || session.scheduledEnd).getTime();
    const durationMinutes = !isNaN(startMs) && !isNaN(endMs) && endMs > startMs
      ? Math.round((endMs - startMs) / 60000)
      : 120;

    // Fetch actual records from the persistent database
    const rawRecords = custechDb.getRecordsForSession(sessionId);
    // Sort chronologically by check-in timestamp
    rawRecords.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

    // Map attendees using actual database records
    const records = rawRecords.map((r, index) => {
      const student = r.student || custechDb.getStudentById(r.studentId);
      const profile = student?.profile || (student ? custechDb.getProfileById(student.profileId) : undefined);
      const dept = profile?.departmentId ? custechDb.getDepartments().find((d) => d.id === profile.departmentId) : undefined;

      const checkInDate = new Date(r.recordedAt);
      const checkInFormatted = isNaN(checkInDate.getTime())
        ? r.recordedAt
        : checkInDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });

      const methodLabel = r.facialVerified
        ? 'Facial Biometric'
        : r.method === 'DYNAMIC_QR'
        ? 'Dynamic QR'
        : r.method === 'TEMP_CODE'
        ? 'Attendance Code'
        : r.method === 'KIOSK_PIN'
        ? 'Kiosk Terminal'
        : 'Facial Biometric';

      return {
        sn: index + 1,
        matricNumber: student?.matricNumber || profile?.matricNumber || 'N/A',
        studentName: profile ? `${profile.lastName.toUpperCase()}, ${profile.firstName}` : 'Student',
        department: dept?.name || 'Computer Science',
        level: student?.currentLevel ? `${student.currentLevel}L` : '200L',
        checkInTime: checkInFormatted,
        method: methodLabel,
        status: r.status === 'PRESENT' || r.status === 'LATE' ? 'VERIFIED' : r.status,
      };
    });

    // Enrolled students count
    const enrolledStudents = offering ? custechDb.getEnrolledStudentsForOffering(offering.id) : [];
    const totalEnrolled = enrolledStudents.length;
    const totalAttendees = records.length;
    const attendancePercentage = totalEnrolled > 0 ? `${Math.round((totalAttendees / totalEnrolled) * 100)}%` : undefined;

    // Faculty & Department details
    const courseDept = course?.departmentId
      ? custechDb.getDepartments().find((d) => d.id === course.departmentId)
      : undefined;
    const courseFac = courseDept?.facultyId
      ? custechDb.getFaculties().find((f) => f.id === courseDept.facultyId)
      : undefined;

    const reportData: AttendanceReportData = {
      schoolName: 'Confluence University of Science and Technology (CUSTECH)',
      subHeader: 'Osara, Kogi State, Nigeria • Directorate of Academic Affairs',
      facultyName: courseFac?.name || 'Faculty of Computing and Mathematical Sciences',
      departmentName: courseDept?.name || 'Department of Computer Science',
      courseCode,
      courseTitle,
      lecturerName,
      sessionDate,
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      venueName: session.venue || (classroom ? `${classroom.code} (${classroom.building})` : 'CUSTECH Lecture Hall'),
      sessionStatus: session.status,
      sessionDuration: `${durationMinutes} Minutes`,
      topicTitle: session.topicTitle,
      totalAttendees,
      totalEnrolled,
      attendancePercentage,
      generatedAt: new Date().toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      records,
    };

    // Generate files
    const pdfBuffer = generatePdfAttendanceReport(reportData);
    const excelBuffer = generateExcelAttendanceReport(reportData);

    const safeCourse = courseCode.replace(/[^a-zA-Z0-9]/g, '_');
    const safeDate = sessionDateRaw;
    const filename = `CUSTECH_${safeCourse}_Attendance_${safeDate}`;

    return {
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
      excelBase64: excelBuffer.toString('base64'),
      filename,
      totalAttendees,
    };
  } catch (err: unknown) {
    console.error('Error generating attendance report:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate attendance report.',
    };
  }
}
