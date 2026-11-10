'use server';

import { custechDb } from '@/lib/db/repository';
import { UserRole, Course, CourseOffering, Department } from '@/types';

export async function toggleSyllabusStatus(topicId: string, isCompleted: boolean, actorId: string) {
  return custechDb.toggleSyllabusTopic(topicId, isCompleted, actorId);
}

export async function updateSystemSettingsAction(
  settings: {
    minimumAttendanceWarningThreshold?: number;
    examEligibilityThreshold?: number;
    qrRotationSeconds?: number;
    lateThresholdMinutes?: number;
    requireFacialVerification?: boolean;
    facialMatchThreshold?: number;
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
 * Returns latest authoritative snapshot of the CUSTECH database
 * for client-side hydration and offline caching.
 */
export async function getDatabaseSnapshotAction() {
  return custechDb.getFullSnapshot();
}

/**
 * ==========================================
 * COURSE MANAGEMENT SERVER ACTIONS
 * ==========================================
 */
export async function getCoursesDetailedAction() {
  return custechDb.getCoursesWithDetails();
}

export async function createCourseAction(
  courseData: {
    code: string;
    title: string;
    creditUnits: number;
    departmentId: string;
    level: 100 | 200 | 300 | 400 | 500;
    description?: string;
  },
  actorId: string
) {
  try {
    const course = custechDb.createCourse(courseData, actorId);
    return { success: true, course };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create course',
    };
  }
}

export async function updateCourseAction(
  courseId: string,
  courseData: Partial<{
    code: string;
    title: string;
    creditUnits: number;
    departmentId: string;
    level: 100 | 200 | 300 | 400 | 500;
    description?: string;
    isActive: boolean;
    primaryLecturerId: string;
  }>,
  actorId: string
) {
  try {
    const course = custechDb.updateCourse(courseId, courseData, actorId);
    return { success: true, course };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update course',
    };
  }
}

export async function toggleCourseAction(
  courseId: string,
  isActive: boolean,
  actorId: string
) {
  try {
    const course = custechDb.toggleCourseActive(courseId, isActive, actorId);
    return { success: true, course };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update course status',
    };
  }
}

export async function deleteCourseAction(courseId: string, actorId: string) {
  try {
    custechDb.deleteCourse(courseId, actorId);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete course',
    };
  }
}

export async function bulkImportCoursesAction(
  records: Array<{
    code: string;
    title: string;
    creditUnits: number;
    departmentName?: string;
    departmentId?: string;
    level?: 100 | 200 | 300 | 400 | 500;
    description?: string;
    lecturerEmailOrName?: string;
  }>,
  actorId: string
) {
  try {
    const summary = custechDb.bulkImportCourses(records, actorId);
    return { success: true, summary };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to import courses',
    };
  }
}

/**
 * ==========================================
 * LECTURER DIRECTORY & ASSIGNMENTS
 * ==========================================
 */
export async function getLecturersAction() {
  return custechDb.getLecturers();
}

export async function createLecturerAction(
  lecturerData: {
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    facultyId?: string;
    staffId?: string;
  },
  actorId: string
) {
  try {
    const lecturer = custechDb.createLecturer(lecturerData, actorId);
    return { success: true, lecturer };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create lecturer',
    };
  }
}

export async function updateLecturerAction(
  lecturerId: string,
  lecturerData: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    departmentId: string;
    isActive: boolean;
    staffId: string;
  }>,
  actorId: string
) {
  try {
    const lecturer = custechDb.updateLecturer(lecturerId, lecturerData, actorId);
    return { success: true, lecturer };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update lecturer',
    };
  }
}

export async function toggleLecturerActiveAction(
  lecturerId: string,
  isActive: boolean,
  actorId: string
) {
  try {
    const lecturer = custechDb.toggleLecturerActive(lecturerId, isActive, actorId);
    return { success: true, lecturer };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update lecturer status',
    };
  }
}

export async function assignLecturerToCourseAction(
  courseOfferingId: string,
  lecturerId: string,
  actorId: string
) {
  try {
    const offering = custechDb.assignLecturerToCourseOffering(courseOfferingId, lecturerId, actorId);
    return { success: true, offering };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign lecturer to course',
    };
  }
}

/**
 * ==========================================
 * TIMETABLE MANAGEMENT
 * ==========================================
 */
export async function getTimetablesDetailedAction() {
  return custechDb.getTimetablesWithDetails();
}

export async function createTimetableAction(
  timetableData: {
    courseOfferingId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    classroomId?: string;
    venue?: string;
    isRecurring?: boolean;
  },
  actorId: string
) {
  try {
    const entry = custechDb.createTimetableEntry(timetableData, actorId);
    return { success: true, entry };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create timetable entry',
    };
  }
}

export async function updateTimetableAction(
  timetableId: string,
  timetableData: Partial<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    classroomId?: string;
    venue?: string;
    isRecurring?: boolean;
  }>,
  actorId: string
) {
  try {
    const entry = custechDb.updateTimetableEntry(timetableId, timetableData, actorId);
    return { success: true, entry };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update timetable entry',
    };
  }
}

export async function deleteTimetableAction(timetableId: string, actorId: string) {
  try {
    custechDb.deleteTimetableEntry(timetableId, actorId);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete timetable entry',
    };
  }
}

/**
 * ==========================================
 * STUDENT MATRICULATION NUMBER VERIFICATION (PHASE 7)
 * ==========================================
 */
export async function verifyMatriculationNumberAction(matricNumber: string) {
  return custechDb.verifyStudentMatric(matricNumber);
}

/**
 * ==========================================
 * INVESTIGATE DEVICE COLLISION ALERTS (PHASE 8.5)
 * ==========================================
 */
export async function investigateDeviceAlertAction(
  alertId: string,
  reviewerId: string,
  action: 'CLEARED' | 'FLAGGED_FRAUD',
  reviewNotes?: string
) {
  try {
    const alert = custechDb.investigateDeviceAlert(alertId, reviewerId, action, reviewNotes);
    return { success: true, alert };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to review alert',
    };
  }
}

export async function getDeviceCollisionAlertsAction(sessionId?: string) {
  return custechDb.getDeviceCollisionAlerts(sessionId);
}

export async function getAllSessionsDetailedAction() {
  return custechDb.getSessions();
}

export async function getSessionRecordsAction(sessionId: string) {
  return custechDb.getRecordsForSession(sessionId);
}

export async function getCourseOfferingsAction() {
  return custechDb.getCourseOfferings();
}

export async function getFacultiesAndDepartmentsAction() {
  return {
    faculties: custechDb.getFaculties(),
    departments: custechDb.getDepartments(),
  };
}

export async function ensureDepartmentAction(data: { name: string; facultyId?: string; code?: string }): Promise<{
  success: boolean;
  department?: Department;
  error?: string;
}> {
  try {
    const department = custechDb.ensureDepartment(data);
    return { success: true, department };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create department',
    };
  }
}

export async function assignCourseManuallyAction(
  params: {
    lecturerId: string;
    courseCode: string;
    courseTitle?: string;
    creditUnits?: number;
    departmentId?: string;
    departmentName?: string;
    facultyId?: string;
    level?: 100 | 200 | 300 | 400 | 500;
  },
  actorId: string
): Promise<{
  success: boolean;
  course?: Course;
  offering?: CourseOffering;
  createdNewCourse?: boolean;
  error?: string;
}> {
  try {
    const result = custechDb.assignCourseManuallyToLecturer(params, actorId);
    return { success: true, ...result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to manually assign course',
    };
  }
}


