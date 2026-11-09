'use server';

import { custechDb } from '@/lib/db/repository';
import { createDynamicQrPayload, verifyQrPayload } from '@/lib/crypto';
import {
  RotatingQrPayload,
  KioskAttendanceDTO,
  AttendanceSession,
  AttendanceRecord,
} from '@/types';

/**
 * Fetch current state of an attendance session
 */
export async function getSessionDetails(sessionId: string): Promise<AttendanceSession | null> {
  const session = custechDb.getSessionById(sessionId);
  return session || null;
}

/**
 * Generates an updated dynamic QR token with a 20-second validity window
 */
export async function getRotatingQrToken(sessionId: string): Promise<RotatingQrPayload | { error: string }> {
  const session = custechDb.getSessionById(sessionId);
  if (!session) {
    return { error: 'Session not found' };
  }
  if (session.status !== 'ACTIVE') {
    return { error: `Session is currently ${session.status.toLowerCase()}` };
  }

  const offering = custechDb.getOfferingById(session.courseOfferingId);
  const courseCode = offering?.course?.code || 'CUSTECH';

  const payload = createDynamicQrPayload(
    session.id,
    courseCode,
    session.sessionSecretNonce,
    session.qrRotationSeconds
  );

  return payload;
}

/**
 * Handles student submission of a scanned dynamic QR token
 */
export async function submitQrAttendance(
  payload: RotatingQrPayload,
  studentProfileId: string,
  clientEventId?: string
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  // 1. Verify Cryptographic Signature & Window
  const session = custechDb.getSessionById(payload.sessionId);
  if (!session) {
    return { success: false, message: 'Invalid or expired attendance session.' };
  }

  const verification = verifyQrPayload(payload, session.qrRotationSeconds);
  if (!verification.isValid) {
    return { success: false, message: verification.reason || 'Invalid QR token' };
  }

  // 2. Identify Student from profile
  const student = custechDb.getStudentByProfileId(studentProfileId);
  if (!student) {
    return { success: false, message: 'Student profile not found in CUSTECH registry.' };
  }

  // 3. Record Attendance with Strict Deduplication
  try {
    const result = custechDb.recordAttendance({
      sessionId: session.id,
      studentId: student.id,
      method: 'DYNAMIC_QR',
      recordedBy: studentProfileId,
      clientEventId,
    });

    return {
      success: true,
      message: result.message,
      record: result.record,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error recording attendance',
    };
  }
}

/**
 * Handles student submission of 6-digit temporary session code
 */
export async function submitCodeAttendance(
  sessionId: string,
  code: string,
  studentProfileId: string,
  clientEventId?: string,
  telemetry?: { deviceFingerprintHash?: string; userAgent?: string; browser?: string; os?: string }
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  const session = custechDb.getSessionById(sessionId);
  if (!session) {
    return { success: false, message: 'Session not found.' };
  }

  if (session.status !== 'ACTIVE') {
    return { success: false, message: `Session is ${session.status.toLowerCase()}. Code rejected.` };
  }

  if (session.isCodeActive === false) {
    return { success: false, message: 'This attendance code has been deactivated by the lecturer.' };
  }

  const cleanInput = code.trim().toUpperCase();
  if (session.previousCodes && session.previousCodes.map((c) => c.toUpperCase()).includes(cleanInput)) {
    return {
      success: false,
      message: 'This attendance code has been regenerated and is no longer valid. Please check the screen for the updated code.',
    };
  }

  if (session.currentTempCode.toUpperCase() !== cleanInput) {
    return { success: false, message: 'Invalid attendance code. Please check the code on the screen.' };
  }

  const student = custechDb.getStudentByProfileId(studentProfileId);
  if (!student) {
    return { success: false, message: 'Student profile not found.' };
  }

  try {
    const result = custechDb.recordAttendance({
      sessionId: session.id,
      studentId: student.id,
      method: 'TEMP_CODE',
      recordedBy: studentProfileId,
      clientEventId,
      deviceFingerprintHash: telemetry?.deviceFingerprintHash,
      userAgent: telemetry?.userAgent,
      browser: telemetry?.browser,
      os: telemetry?.os,
    });

    return {
      success: true,
      message: result.message,
      record: result.record,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error recording attendance',
    };
  }
}

/**
 * Handles student submission of Course Code (e.g. CSC 201) + 6-character Code (e.g. 7K4P92)
 */
export async function submitAttendanceByCourseAndCode(
  courseCode: string,
  code: string,
  studentProfileId: string,
  clientEventId?: string,
  telemetry?: { deviceFingerprintHash?: string; userAgent?: string; browser?: string; os?: string }
): Promise<{ success: boolean; message: string; record?: AttendanceRecord; courseTitle?: string }> {
  const cleanCourse = courseCode.trim().toUpperCase().replace(/\s+/g, '');
  const cleanCode = code.trim().toUpperCase();

  if (!cleanCourse) {
    return { success: false, message: 'Please enter a valid course code (e.g. CSC 201).' };
  }
  if (!cleanCode) {
    return { success: false, message: 'Please enter the 6-character session code.' };
  }

  // Find active session for this course or matching temp code
  const allSessions = custechDb.getSessions();
  const activeSessions = allSessions.filter((s) => s.status === 'ACTIVE');

  // Match by course code
  let session = activeSessions.find((s) => {
    const offeringCourseCode = s.courseOffering?.course?.code?.trim().toUpperCase().replace(/\s+/g, '');
    return offeringCourseCode === cleanCourse;
  });

  // If not found by course code directly, check if any active session matches the temp code
  if (!session) {
    session = activeSessions.find(
      (s) => s.currentTempCode?.trim().toUpperCase() === cleanCode
    );
  }

  if (!session) {
    return {
      success: false,
      message: `No active attendance session found for "${courseCode}". Please ask your lecturer to verify that the session is active.`,
    };
  }

  if (session.isCodeActive === false) {
    return {
      success: false,
      message: `The attendance code for ${session.courseOffering?.course?.code || courseCode} has been deactivated by the lecturer.`,
    };
  }

  if (session.previousCodes && session.previousCodes.map((c) => c.toUpperCase()).includes(cleanCode)) {
    return {
      success: false,
      message: 'This attendance code has been regenerated and is no longer valid. Please check the screen for the updated code.',
    };
  }

  if (session.currentTempCode.toUpperCase() !== cleanCode) {
    return {
      success: false,
      message: `Invalid attendance code for ${session.courseOffering?.course?.code || courseCode}. Please check the code on the screen.`,
    };
  }

  const student = custechDb.getStudentByProfileId(studentProfileId);
  if (!student) {
    return { success: false, message: 'Student profile not found in CUSTECH registry.' };
  }

  try {
    const result = custechDb.recordAttendance({
      sessionId: session.id,
      studentId: student.id,
      method: 'TEMP_CODE',
      recordedBy: studentProfileId,
      clientEventId,
      deviceFingerprintHash: telemetry?.deviceFingerprintHash,
      userAgent: telemetry?.userAgent,
      browser: telemetry?.browser,
      os: telemetry?.os,
    });

    return {
      success: true,
      message: result.message,
      record: result.record,
      courseTitle: session.courseOffering?.course?.title,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error recording attendance',
    };
  }
}

/**
 * Handles attendance verification when student scans QR code via native mobile camera URL redirect
 */
export async function submitAttendanceFromUrl(params: {
  sessionId: string;
  courseCode?: string;
  timestampWindow?: number;
  nonce?: string;
  signature?: string;
  code?: string;
  studentProfileId: string;
  clientEventId?: string;
}): Promise<{ success: boolean; message: string; record?: AttendanceRecord; courseTitle?: string }> {
  const session = custechDb.getSessionById(params.sessionId);
  if (!session) {
    return { success: false, message: 'Attendance session not found or has expired.' };
  }

  if (session.status !== 'ACTIVE') {
    return { success: false, message: `This lecture session is currently ${session.status.toLowerCase()}.` };
  }

  const student = custechDb.getStudentByProfileId(params.studentProfileId);
  if (!student) {
    return { success: false, message: 'Student profile not found in CUSTECH registry.' };
  }

  let verified = false;

  // 1. Try cryptographic verification if signature and window are provided
  if (params.signature && params.timestampWindow && params.nonce) {
    const offering = custechDb.getOfferingById(session.courseOfferingId);
    const courseCode = params.courseCode || offering?.course?.code || 'CUSTECH';
    const payload: RotatingQrPayload = {
      sessionId: session.id,
      courseCode,
      timestampWindow: Number(params.timestampWindow),
      nonce: params.nonce,
      signature: params.signature,
    };

    const verification = verifyQrPayload(payload, session.qrRotationSeconds || 20, 4); // allow 4 windows for mobile redirect
    if (verification.isValid) {
      verified = true;
    }
  }

  // 2. Fallback to temp code match if signature check failed or wasn't provided
  if (!verified && params.code) {
    if (session.currentTempCode.toUpperCase() === params.code.trim().toUpperCase()) {
      verified = true;
    }
  }

  // If session is active and opened directly via valid QR link, we accept verification
  if (!verified) {
    return {
      success: false,
      message: 'QR code link has expired. Please scan the current code on screen or enter the 6-character code.',
    };
  }

  try {
    const result = custechDb.recordAttendance({
      sessionId: session.id,
      studentId: student.id,
      method: 'DYNAMIC_QR',
      recordedBy: params.studentProfileId,
      clientEventId: params.clientEventId,
    });

    const offering = custechDb.getOfferingById(session.courseOfferingId);
    return {
      success: true,
      message: result.message,
      record: result.record,
      courseTitle: offering?.course?.title,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error recording attendance',
    };
  }
}

/**
 * Handles Kiosk Assisted Attendance (Matric Number + 4-digit PIN)
 */
export async function submitKioskAttendance(
  dto: KioskAttendanceDTO
): Promise<{ success: boolean; message: string; record?: AttendanceRecord; studentName?: string }> {
  return await custechDb.verifyAndRecordKiosk({
    sessionId: dto.sessionId,
    matricNumber: dto.matricNumber,
    attendancePin: dto.attendancePin,
    assistedReason: dto.assistedReason || 'Other approved reason',
    operatorProfileId: dto.operatorProfileId || 'SYSTEM',
    clientEventId: dto.clientEventId,
  });
}

/**
 * Synchronizes a batch of offline attendance events from IndexedDB with idempotency
 */
export async function syncOfflineBatch(
  batch: KioskAttendanceDTO[]
): Promise<{ processed: number; duplicates: number; failures: number; details: string[] }> {
  let processed = 0;
  let duplicates = 0;
  let failures = 0;
  const details: string[] = [];

  for (const item of batch) {
    const res = await custechDb.verifyAndRecordKiosk({
      sessionId: item.sessionId,
      matricNumber: item.matricNumber,
      attendancePin: item.attendancePin,
      assistedReason: item.assistedReason || 'No internet / mobile data',
      operatorProfileId: item.operatorProfileId || 'OFFLINE_SYNC',
      clientEventId: item.clientEventId,
    });
    if (res.success) {
      if (res.message.includes('already')) {
        duplicates++;
      } else {
        processed++;
      }
      details.push(`${item.matricNumber}: ${res.message}`);
    } else {
      failures++;
      details.push(`${item.matricNumber}: Failed - ${res.message}`);
    }
  }

  return { processed, duplicates, failures, details };
}

/**
 * Session Lifecycle Controls
 */
export async function startAttendanceSession(courseOfferingId: string, lecturerId: string) {
  return custechDb.startSession(courseOfferingId, lecturerId);
}

export async function pauseSession(sessionId: string, actorId: string) {
  return custechDb.pauseSession(sessionId, actorId);
}

export async function resumeSession(sessionId: string, actorId: string) {
  return custechDb.resumeSession(sessionId, actorId);
}

export async function closeSession(sessionId: string, actorId: string) {
  return custechDb.closeSession(sessionId, actorId);
}

export async function submitAttendanceCorrection(
  sessionId: string,
  studentId: string,
  reason: string
) {
  return custechDb.submitCorrection({ sessionId, studentId, reason });
}

export async function reviewAttendanceCorrection(
  correctionId: string,
  reviewerId: string,
  status: 'APPROVED' | 'REJECTED',
  notes?: string
) {
  return custechDb.resolveCorrection({ correctionId, reviewerId, status, reviewNotes: notes });
}

/**
 * ==========================================
 * ADVANCED SESSION & CODE LIFECYCLE CONTROLS
 * ==========================================
 */
export async function startNewLectureSessionAction(params: {
  courseOfferingId: string;
  lecturerId: string;
  classroomId?: string;
  venue?: string;
  weekNumber?: number;
  topicTitle?: string;
  durationMinutes?: number;
  forceNew?: boolean;
}) {
  try {
    const session = custechDb.startSession(params);
    return { success: true, session };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to start lecture session',
    };
  }
}

export async function regenerateSessionCodeAction(
  sessionId: string,
  actorId: string
): Promise<{ success: boolean; newCode?: string; expiresAt?: string; error?: string }> {
  try {
    const result = custechDb.regenerateSessionCode(sessionId, actorId);
    return { success: true, newCode: result.newCode, expiresAt: result.expiresAt };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to regenerate code',
    };
  }
}

export async function deactivateSessionCodeAction(sessionId: string, actorId: string) {
  try {
    custechDb.deactivateSessionCode(sessionId, actorId);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to deactivate code',
    };
  }
}

export async function reactivateSessionCodeAction(sessionId: string, actorId: string) {
  try {
    custechDb.reactivateSessionCode(sessionId, actorId);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reactivate code',
    };
  }
}

export async function getOfferingSessionsAction(offeringId: string) {
  return custechDb.getSessionsForOffering(offeringId);
}

export async function getLecturerSessionsAction(lecturerId: string) {
  return custechDb.getSessionsForLecturer(lecturerId);
}

/**
 * ==========================================
 * PHASE 7: STUDENT MATRICULATION NUMBER VERIFICATION & ATTENDANCE SUBMISSION
 * ==========================================
 */
export async function submitStudentAttendanceWithMatric(params: {
  matricNumber: string;
  sessionId?: string;
  courseCode?: string;
  code?: string;
  method?: 'DYNAMIC_QR' | 'TEMP_CODE' | 'DIRECT_URL';
  deviceFingerprintHash?: string;
  userAgent?: string;
  browser?: string;
  os?: string;
  clientEventId?: string;
}): Promise<{
  success: boolean;
  message: string;
  isDuplicate?: boolean;
  student?: {
    matricNumber: string;
    fullName: string;
    departmentName: string;
    level: number;
  };
  course?: {
    code: string;
    title: string;
    venue: string;
    lecturerName: string;
    weekNumber?: number;
  };
  record?: AttendanceRecord;
}> {
  const cleanMatric = params.matricNumber.trim().toUpperCase();
  if (!cleanMatric) {
    return { success: false, message: 'Please enter a valid matriculation number.' };
  }

  // 1. Verify Matriculation Number against official student database
  const verification = custechDb.verifyStudentMatric(cleanMatric);
  if (!verification.found || !verification.student) {
    return {
      success: false,
      message: verification.error || `Matriculation number "${cleanMatric}" not recognized.`,
    };
  }

  const student = verification.student;

  // 2. Identify target session
  let targetSession: AttendanceSession | undefined;

  if (params.sessionId) {
    targetSession = custechDb.getSessionById(params.sessionId);
  } else if (params.courseCode) {
    const cleanCourse = params.courseCode.trim().toUpperCase().replace(/\s+/g, '');
    const activeSessions = custechDb.getSessions().filter((s) => s.status === 'ACTIVE');
    targetSession = activeSessions.find(
      (s) => s.courseOffering?.course?.code?.trim().toUpperCase().replace(/\s+/g, '') === cleanCourse
    );
  } else if (params.code) {
    const cleanCode = params.code.trim().toUpperCase();
    const activeSessions = custechDb.getSessions().filter((s) => s.status === 'ACTIVE');
    targetSession = activeSessions.find(
      (s) => s.currentTempCode?.trim().toUpperCase() === cleanCode
    );
  }

  if (!targetSession) {
    return {
      success: false,
      message: `No active lecture session found for the requested course. Please ensure the lecturer has started attendance.`,
      student: {
        matricNumber: student.matricNumber,
        fullName: student.fullName,
        departmentName: student.departmentName,
        level: student.level,
      },
    };
  }

  if (targetSession.status !== 'ACTIVE') {
    return {
      success: false,
      message: `The lecture attendance session is currently ${targetSession.status.toLowerCase()}. Submissions are not accepted.`,
    };
  }

  // 3. Verify Code if provided
  if (params.code) {
    const cleanCode = params.code.trim().toUpperCase();
    if (targetSession.isCodeActive === false) {
      return {
        success: false,
        message: 'The attendance code has been deactivated by the lecturer.',
      };
    }
    if (targetSession.previousCodes && targetSession.previousCodes.map((c) => c.toUpperCase()).includes(cleanCode)) {
      return {
        success: false,
        message: 'This attendance code has been regenerated and is no longer valid. Please check the screen for the updated code.',
      };
    }
    if (targetSession.currentTempCode.toUpperCase() !== cleanCode) {
      return {
        success: false,
        message: 'Invalid attendance code. Please check the code currently displayed on the projector screen.',
      };
    }
  }

  // 4. Record attendance with device telemetry and deduplication
  const offering = custechDb.getOfferingById(targetSession.courseOfferingId);
  const course = offering?.course;
  const lecturer = offering?.primaryLecturer;

  try {
    const result = custechDb.recordAttendance({
      sessionId: targetSession.id,
      studentId: student.id,
      method: params.method === 'DYNAMIC_QR' ? 'DYNAMIC_QR' : 'TEMP_CODE',
      recordedBy: student.profileId,
      clientEventId: params.clientEventId,
      deviceFingerprintHash: params.deviceFingerprintHash,
      userAgent: params.userAgent,
      browser: params.browser,
      os: params.os,
    });

    return {
      success: !result.isDuplicate,
      isDuplicate: result.isDuplicate,
      message: result.message,
      student: {
        matricNumber: student.matricNumber,
        fullName: student.fullName,
        departmentName: student.departmentName,
        level: student.level,
      },
      course: {
        code: course?.code || 'COURSE',
        title: course?.title || 'Lecture Session',
        venue: targetSession.venue || 'Lecture Hall',
        lecturerName: lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : 'Course Lecturer',
        weekNumber: targetSession.weekNumber,
      },
      record: result.record,
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Error recording attendance.',
      student: {
        matricNumber: student.matricNumber,
        fullName: student.fullName,
        departmentName: student.departmentName,
        level: student.level,
      },
      course: {
        code: course?.code || 'COURSE',
        title: course?.title || 'Lecture Session',
        venue: targetSession.venue || 'Lecture Hall',
        lecturerName: lecturer ? `${lecturer.firstName} ${lecturer.lastName}` : 'Course Lecturer',
        weekNumber: targetSession.weekNumber,
      },
    };
  }
}
