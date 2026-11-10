'use server';

import { custechDb } from '@/lib/db/repository';

export async function getStudentFaceStatusAction(studentIdOrProfileId: string) {
  return custechDb.getFaceProfileStatus(studentIdOrProfileId);
}

export async function getEnrolledFaceStudentIdsAction(): Promise<string[]> {
  return custechDb.getEnrolledFaceStudentIds();
}

export async function getBiometricPolicyAction() {
  const settings = custechDb.getSystemSettings();
  return {
    requireFacialVerification: settings.requireFacialVerification !== false,
    facialMatchThreshold: settings.facialMatchThreshold ?? 0.50,
  };
}

export async function enrollStudentFaceAction(params: {
  studentIdOrProfileId: string;
  descriptor: number[];
  sampleCount?: number;
  actorProfileId: string;
  thumbnailDataUrl?: string;
  attendancePin?: string;
  requirePinVerification?: boolean;
}) {
  return custechDb.enrollStudentFace(params);
}

export async function resetStudentFaceAction(studentId: string, actorId: string) {
  const reset = custechDb.resetStudentFace(studentId, actorId);
  if (!reset) {
    return { success: false, error: 'No enrolled Face ID found for this student.' };
  }
  return { success: true };
}
