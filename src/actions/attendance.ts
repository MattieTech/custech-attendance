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
  clientEventId?: string
): Promise<{ success: boolean; message: string; record?: AttendanceRecord }> {
  const session = custechDb.getSessionById(sessionId);
  if (!session) {
    return { success: false, message: 'Session not found.' };
  }

  if (session.status !== 'ACTIVE') {
    return { success: false, message: `Session is ${session.status.toLowerCase()}. Code rejected.` };
  }

  const cleanInput = code.trim().toUpperCase();
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
 * Handles Kiosk Assisted Attendance (Matric Number + 4-digit PIN)
 */
export async function submitKioskAttendance(
  dto: KioskAttendanceDTO
): Promise<{ success: boolean; message: string; record?: AttendanceRecord; studentName?: string }> {
  return await custechDb.verifyAndRecordKiosk({
    sessionId: dto.sessionId,
    matricNumber: dto.matricNumber,
    attendancePin: dto.attendancePin,
    assistedReason: dto.assistedReason,
    operatorProfileId: dto.operatorProfileId,
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
    const res = await custechDb.verifyAndRecordKiosk(item);
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
