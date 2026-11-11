'use server';

import { custechDb } from '@/lib/db/repository';
import { requireServerSession } from '@/lib/auth/server-session';

export async function getStudentFaceStatusAction(studentIdOrProfileId: string) {
  return custechDb.getFaceProfileStatus(studentIdOrProfileId);
}

export async function getEnrolledFaceStudentIdsAction(): Promise<string[]> {
  const actor = await requireServerSession();
  if (
    actor.activeRole === 'STUDENT' ||
    actor.activeRole === 'NON_ACADEMIC_STAFF'
  ) {
    throw new Error('Unauthorized: Staff or Administrator privileges required.');
  }
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
  // Either authenticated user enrolling themselves / admin, OR PIN-verified enrollment on /attend
  if (!params.requirePinVerification) {
    const actor = await requireServerSession();
    const stu =
      custechDb.getStudentById(params.studentIdOrProfileId) ||
      custechDb.getStudentByProfileId(params.studentIdOrProfileId);
    if (
      actor.activeRole !== 'SUPER_ADMIN' &&
      stu &&
      stu.profileId !== actor.user.id
    ) {
      return {
        success: false,
        message: 'Unauthorized: You can only enroll Face ID for your own account.',
      };
    }
  }
  return custechDb.enrollStudentFace(params);
}

export async function resetStudentFaceAction(studentId: string, _actorId?: string) {
  const actor = await requireServerSession();
  if (actor.activeRole !== 'SUPER_ADMIN') {
    return { success: false, error: 'Unauthorized: Only Super Administrators can reset Face IDs.' };
  }
  const reset = custechDb.resetStudentFace(studentId, actor.user.id);
  if (!reset) {
    return { success: false, error: 'No enrolled Face ID found for this student.' };
  }
  return { success: true };
}
