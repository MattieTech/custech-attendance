'use server';

import { custechDb } from '@/lib/db/repository';
import { UserRole } from '@/types';

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
    email?: string;
    departmentName?: string;
    departmentId?: string;
    facultyId?: string;
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

export async function updateStudentAction(
  studentId: string,
  studentData: {
    firstName?: string;
    lastName?: string;
    matricNumber?: string;
    email?: string;
    departmentName?: string;
    facultyId?: string;
    currentLevel?: 100 | 200 | 300 | 400 | 500;
    isActive?: boolean;
  },
  actorId: string
) {
  try {
    const result = custechDb.updateStudent(studentId, studentData, actorId);
    return { success: true, student: result.student, profile: result.profile };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update student',
    };
  }
}

export async function toggleStudentStatusAction(
  studentId: string,
  isActive: boolean,
  actorId: string
) {
  try {
    const result = custechDb.toggleStudentActiveStatus(studentId, isActive, actorId);
    return { success: true, student: result.student, profile: result.profile };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update student status',
    };
  }
}

export async function assignUserRoleAction(
  userId: string,
  newRole: UserRole,
  actorId: string
) {
  try {
    const profile = custechDb.assignUserRole(userId, newRole, actorId);
    return { success: true, profile };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign role',
    };
  }
}

export async function bulkImportStudentsAction(
  records: Array<{
    firstName: string;
    lastName: string;
    matricNumber: string;
    email?: string;
    departmentName?: string;
    facultyId?: string;
    currentLevel?: 100 | 200 | 300 | 400 | 500;
    pin?: string;
  }>,
  actorId: string
) {
  try {
    const summary = custechDb.bulkRegisterStudents(records, actorId);
    return { success: true, summary };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process bulk import',
    };
  }
}

export async function getAllUsersWithRolesAction() {
  return custechDb.getAllUsersWithRoles();
}

export async function getDepartmentAttendanceStatsAction(departmentId: string = 'dept-csc') {
  return custechDb.getDepartmentAttendanceStats(departmentId);
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

/**
 * Server-side student authentication directly querying the persistent CUSTECH database
 */
export async function loginStudentAction(matricNumber: string, _password?: string) {
  const cleanMatric = matricNumber.trim().toUpperCase();
  if (!cleanMatric) {
    return { success: false, error: 'Please enter your Matriculation Number.' };
  }

  const student = custechDb.getStudentByMatric(cleanMatric);
  if (!student || !student.profile) {
    return {
      success: false,
      error: `Matriculation number "${cleanMatric}" was not found in the CUSTECH academic registry.`,
    };
  }

  if (!student.profile.isActive) {
    return {
      success: false,
      error: 'This student account has been flagged inactive. Please contact the Directorate of Academic Planning.',
    };
  }

  return {
    success: true,
    profile: student.profile,
    student,
  };
}

/**
 * Server-side staff authentication directly querying the persistent CUSTECH database
 */
export async function loginStaffAction(identifier: string, _password?: string) {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Please enter your Staff ID or University Email.' };
  }

  const profile = custechDb
    .getProfiles()
    .find(
      (p) =>
        p.email.toLowerCase() === cleanId ||
        (p.staffId && p.staffId.toLowerCase() === cleanId)
    );

  if (!profile) {
    return {
      success: false,
      error: `Staff account "${identifier}" was not found in the CUSTECH staff directory.`,
    };
  }

  if (!profile.isActive) {
    return {
      success: false,
      error: 'Account inactive. Please contact ICT Support / Registrar.',
    };
  }

  return {
    success: true,
    profile,
  };
}

/**
 * Returns latest snapshot of custom students, profiles, and departments
 * for client-side offline hydration.
 */
export async function getDatabaseSnapshotAction() {
  return {
    profiles: custechDb.getProfiles(),
    students: custechDb.getAllStudentsDetailed(),
    departments: custechDb.getDepartments(),
  };
}
