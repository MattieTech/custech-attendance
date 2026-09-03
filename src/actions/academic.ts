'use server';

import { custechDb } from '@/lib/db/repository';

export async function toggleSyllabusStatus(topicId: string, isCompleted: boolean, actorId: string) {
  return custechDb.toggleSyllabusTopic(topicId, isCompleted, actorId);
}

export async function updateSystemSettingsAction(
  settings: {
    minimumAttendanceWarningThreshold?: number;
    examEligibilityThreshold?: number;
    qrRotationSeconds?: number;
    lateThresholdMinutes?: number;
  },
  actorId: string
) {
  return custechDb.updateSystemSettings(settings, actorId);
}
