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

export async function registerStudentAction(
  studentData: {
    firstName: string;
    lastName: string;
    matricNumber: string;
    email: string;
    departmentId?: string;
    currentLevel?: 100 | 200 | 300 | 400 | 500;
    pin?: string;
    enrollInCourses?: boolean;
  },
  actorId: string
) {
  try {
    const result = custechDb.registerStudent({
      ...studentData,
      actorId,
    });
    return { success: true, student: result.student, profile: result.profile };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to register student',
    };
  }
}

export async function deleteStudentAction(studentId: string, actorId: string) {
  try {
    const ok = custechDb.deleteStudent(studentId, actorId);
    return { success: ok };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete student',
    };
  }
}

export async function resetStudentPinAction(studentId: string, newPin: string, actorId: string) {
  try {
    const ok = custechDb.resetStudentPin(studentId, newPin, actorId);
    return { success: ok };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reset PIN',
    };
  }
}

export async function getAllStudentsDetailedAction() {
  return custechDb.getAllStudentsDetailed();
}
