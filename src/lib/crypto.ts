import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { RotatingQrPayload } from '@/types';

const GLOBAL_SESSION_SALT = process.env.ATTENDANCE_SECRET || 'custech-attendance-secret-salt-2026';

/**
 * Generates an ambiguous-free 6-character alphanumeric code
 * (omits 0, O, 1, I to prevent human transcription errors in classrooms)
 */
export function generateTemporaryCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Computes HMAC-SHA256 signature for a dynamic rotating QR payload
 */
export function signQrPayload(
  sessionId: string,
  courseCode: string,
  timestampWindow: number,
  nonce: string
): string {
  const data = `${sessionId}:${courseCode}:${timestampWindow}:${nonce}`;
  return crypto.createHmac('sha256', GLOBAL_SESSION_SALT).update(data).digest('hex');
}

/**
 * Generates the full dynamic QR payload for the given session.
 * Default window is 90 seconds.
 */
export function createDynamicQrPayload(
  sessionId: string,
  courseCode: string,
  sessionNonce: string,
  rotationSeconds: number = 90
): RotatingQrPayload {
  const currentWindow = Math.floor(Date.now() / 1000 / rotationSeconds);
  const signature = signQrPayload(sessionId, courseCode, currentWindow, sessionNonce);

  return {
    sessionId,
    courseCode,
    timestampWindow: currentWindow,
    nonce: sessionNonce,
    signature,
  };
}

/**
 * Validates whether a submitted QR token signature is genuine and within the valid time window.
 * Allows a grace margin of ±1 window (to account for student camera delay / clock drift).
 */
export function verifyQrPayload(
  payload: RotatingQrPayload,
  rotationSeconds: number = 90,
  allowedWindowMargin: number = 3
): { isValid: boolean; reason?: string } {
  const currentWindow = Math.floor(Date.now() / 1000 / rotationSeconds);

  // Check if window is within margin (default ±3 windows to allow for camera click and browser navigation)
  const windowDiff = Math.abs(currentWindow - payload.timestampWindow);
  if (windowDiff > allowedWindowMargin) {
    return { isValid: false, reason: 'QR code expired. Please scan the newly rotated code on screen.' };
  }

  const expectedSignature = signQrPayload(
    payload.sessionId,
    payload.courseCode,
    payload.timestampWindow,
    payload.nonce
  );

  if (expectedSignature !== payload.signature) {
    return { isValid: false, reason: 'Invalid or forged attendance token.' };
  }

  return { isValid: true };
}

/**
 * Hash student's 4-digit confidential attendance PIN
 */
export async function hashAttendancePin(pin: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pin, salt);
}

/**
 * Verify student's 4-digit PIN against stored hash
 */
export async function verifyAttendancePin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Generates a unique client event ID for offline idempotency
 */
export function generateClientEventId(sessionId: string, matric: string): string {
  return `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}_${matric.replace(/[^a-zA-Z0-9]/g, '')}`;
}
