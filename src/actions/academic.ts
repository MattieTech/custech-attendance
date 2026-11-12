'use server';

import { custechDb } from '@/lib/db/repository';
import { verifyAttendancePin } from '@/lib/crypto';
import {
  clearServerSessionCookie,
  getServerSession,
  isFacultyAdminRole,
  requireServerSession,
  setServerSessionCookie,
} from '@/lib/auth/server-session';
import { UserRole, Course, CourseOffering, Department } from '@/types';

async function requireSuperAdmin() {
  const actor = await requireServerSession();
  if (actor.activeRole !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized: Super Administrator privileges are required for this action.');
  }
  return actor;
}

async function requireStaffOrAdmin() {
  const actor = await requireServerSession();
  const allowed: UserRole[] = [
    'SUPER_ADMIN',
    'PRINCIPAL_OFFICER',
    'DEAN',
    'FACULTY_REP',
    'ASST_FACULTY_REP',
    'HOD',
    'LECTURER',
  ];
  if (!allowed.includes(actor.activeRole)) {
    throw new Error('Unauthorized: Staff or Administrator privileges required.');
  }
  return actor;
}

async function requireCourseManagementAuth(targetDepartmentId?: string) {
  const actor = await requireServerSession();
  const { activeRole, user } = actor;

  if (activeRole === 'SUPER_ADMIN' || activeRole === 'PRINCIPAL_OFFICER') {
    return actor;
  }

  if (isFacultyAdminRole(activeRole)) {
    if (targetDepartmentId && user.facultyId) {
      const normalizedDeptId =
        targetDepartmentId === 'dept-se' ? 'dept-sen' : targetDepartmentId;
      const dept = custechDb
        .getDepartments()
        .find((d) => d.id === normalizedDeptId || d.id === targetDepartmentId);
      if (dept && dept.facultyId !== user.facultyId) {
        throw new Error(
          'Unauthorized: Faculty Administrators can only manage courses belonging to their own faculty.'
        );
      }
    }
    return actor;
  }

  if (activeRole === 'HOD') {
    if (targetDepartmentId && user.departmentId) {
      const normalizedDeptId =
        targetDepartmentId === 'dept-se' ? 'dept-sen' : targetDepartmentId;
      if (normalizedDeptId !== user.departmentId && targetDepartmentId !== user.departmentId) {
        throw new Error(
          'Unauthorized: Heads of Department can only manage courses within their own department.'
        );
      }
    }
    return actor;
  }

  throw new Error('Unauthorized: You do not have permission to manage courses.');
}

export async function getAuthenticatedSessionAction() {
  const serverSession = await getServerSession();
  if (!serverSession) return null;
  return {
    user: serverSession.user,
    activeRole: serverSession.payload.activeRole,
    loginTime: new Date(serverSession.payload.iat * 1000).toISOString(),
    authSource: serverSession.payload.authSource,
  };
}

export async function switchActiveRoleAction(newRole: UserRole) {
  try {
    const serverSession = await getServerSession();
    if (!serverSession) {
      return { success: false, error: 'No active authenticated session found.' };
    }

    if (!serverSession.payload.assignedRoles.includes(newRole)) {
      return {
        success: false,
        error: `User does not possess the permissions for role: ${newRole}.`,
      };
    }

    await setServerSessionCookie({
      userId: serverSession.user.id,
      activeRole: newRole,
      assignedRoles: serverSession.payload.assignedRoles,
      authSource: serverSession.payload.authSource,
    });

    return {
      success: true,
      session: {
        user: serverSession.user,
        activeRole: newRole,
        loginTime: new Date(serverSession.payload.iat * 1000).toISOString(),
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to switch role.',
    };
  }
}

export async function logoutAction() {
  await clearServerSessionCookie();
  return { success: true };
}

export async function impersonateStudentForAdminTestAction(studentProfileId: string) {
  try {
    await requireSuperAdmin();
    const profile = custechDb.getProfileById(studentProfileId);
    if (!profile) {
      return { success: false, error: 'Student profile not found.' };
    }
    const studentRoles = profile.assignedRoles.filter(
      (r) =>
        r === 'STUDENT' ||
        r === 'COURSE_REP' ||
        r === 'ASSISTANT_COURSE_REP' ||
        r === 'DEPARTMENT_REP'
    );
    const safeRoles: UserRole[] = studentRoles.length > 0 ? studentRoles : ['STUDENT'];

    await setServerSessionCookie({
      userId: profile.id,
      activeRole: 'STUDENT',
      assignedRoles: safeRoles,
      authSource: 'PORTAL_LOGIN',
    });

    return {
      success: true,
      session: {
        user: { ...profile, assignedRoles: safeRoles, primaryRole: 'STUDENT' as UserRole },
        activeRole: 'STUDENT' as UserRole,
        loginTime: new Date().toISOString(),
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unauthorized test login.',
    };
  }
}

export async function ensureCourseSyllabusAction(courseId: string) {
  await requireStaffOrAdmin();
  return custechDb.ensureSyllabusForCourse(courseId);
}

export async function addSyllabusTopicAction(
  params: {
    courseId: string;
    weekNumber: number;
    topicTitle: string;
    learningObjectives?: string;
  },
  _actorId?: string
) {
  try {
    const actor = await requireStaffOrAdmin();
    if (actor.activeRole === 'LECTURER') {
      const offerings = custechDb.getLecturerOfferings(actor.user.id);
      const ownsCourse = offerings.some((o) => o.courseId === params.courseId);
      if (!ownsCourse) {
        return { success: false, error: 'You can only manage syllabus topics for your assigned courses.' };
      }
    }
    const topic = custechDb.addSyllabusTopic(params, actor.user.id);
    return { success: true, topic };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add syllabus topic',
    };
  }
}

export async function toggleSyllabusStatus(topicId: string, isCompleted: boolean, _actorId?: string) {
  const actor = await requireStaffOrAdmin();
  if (actor.activeRole === 'LECTURER') {
    const offerings = custechDb.getLecturerOfferings(actor.user.id);
    const allowedCourseIds = new Set(offerings.map((o) => o.courseId));
    const matchingTopic = Array.from(allowedCourseIds)
      .flatMap((cid) => custechDb.getSyllabusForCourse(cid))
      .find((t) => t.id === topicId);
    if (!matchingTopic) {
      throw new Error('Unauthorized: You can only update syllabus progress for your assigned courses.');
    }
  }
  return custechDb.toggleSyllabusTopic(topicId, isCompleted, actor.user.id);
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
  _actorId?: string
) {
  const actor = await requireSuperAdmin();
  return custechDb.updateSystemSettings(settings, actor.user.id);
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const result = custechDb.registerStudent({
      ...studentData,
      actorId: actor.user.id,
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const result = custechDb.updateStudent(studentId, studentData, actor.user.id);
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const result = custechDb.toggleStudentActiveStatus(studentId, isActive, actor.user.id);
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const profile = custechDb.assignUserRole(userId, newRole, actor.user.id);
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const summary = custechDb.bulkRegisterStudents(records, actor.user.id);
    return { success: true, summary };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to process bulk import',
    };
  }
}

export async function getAllUsersWithRolesAction() {
  await requireStaffOrAdmin();
  return custechDb.getAllUsersWithRoles();
}

export async function getDepartmentAttendanceStatsAction(departmentId: string = 'dept-csc') {
  await requireStaffOrAdmin();
  return custechDb.getDepartmentAttendanceStats(departmentId);
}

export async function deleteStudentAction(studentId: string, _actorId?: string) {
  try {
    const actor = await requireSuperAdmin();
    const ok = custechDb.deleteStudent(studentId, actor.user.id);
    return { success: ok };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete student',
    };
  }
}

export async function resetStudentPinAction(studentId: string, newPin: string, _actorId?: string) {
  try {
    const actor = await requireSuperAdmin();
    const ok = custechDb.resetStudentPin(studentId, newPin, actor.user.id);
    return { success: ok };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reset PIN',
    };
  }
}

export async function getAllStudentsDetailedAction() {
  await requireStaffOrAdmin();
  return custechDb.getAllStudentsDetailed().map((s) => ({
    ...s,
    attendancePinHash: '',
  }));
}

/**
 * Server-side student authentication directly querying the persistent CUSTECH database
 */
export async function loginStudentAction(
  matricNumber: string,
  password?: string,
  isQuickDemoLogin?: boolean
) {
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

  // Verify PIN/password when provided
  if (!isQuickDemoLogin && password && password.trim().length > 0) {
    const pinOk = await verifyAttendancePin(password.trim(), student.attendancePinHash);
    if (!pinOk) {
      return {
        success: false,
        error: 'Invalid Access Password / 4-digit Attendance PIN.',
      };
    }
  }

  const activeRole = student.profile.primaryRole || 'STUDENT';
  await setServerSessionCookie({
    userId: student.profile.id,
    activeRole,
    assignedRoles: student.profile.assignedRoles,
    authSource: 'PORTAL_LOGIN',
  });

  return {
    success: true,
    profile: student.profile,
    student: { ...student, attendancePinHash: '' },
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

  if (
    profile.primaryRole === 'STUDENT' &&
    !profile.assignedRoles.some((r) => r !== 'STUDENT' && r !== 'COURSE_REP' && r !== 'ASSISTANT_COURSE_REP' && r !== 'DEPARTMENT_REP')
  ) {
    return {
      success: false,
      error: 'Students must sign in via the Student Portal tab.',
    };
  }

  if (!profile.isActive) {
    return {
      success: false,
      error: 'Account inactive. Please contact ICT Support / Registrar.',
    };
  }

  await setServerSessionCookie({
    userId: profile.id,
    activeRole: profile.primaryRole,
    assignedRoles: profile.assignedRoles,
    authSource: 'PORTAL_LOGIN',
  });

  return {
    success: true,
    profile,
  };
}

/**
 * Returns latest role-scoped authoritative snapshot of the CUSTECH database
 * for client-side hydration and offline caching.
 */
export async function getDatabaseSnapshotAction() {
  const serverSession = await getServerSession();
  return custechDb.getScopedSnapshot(
    serverSession
      ? { user: serverSession.user, activeRole: serverSession.payload.activeRole }
      : null
  );
}

/**
 * ==========================================
 * COURSE MANAGEMENT SERVER ACTIONS
 * ==========================================
 */
export async function getAcademicTermsAction() {
  return {
    sessions: custechDb.getAcademicSessions(),
    semesters: custechDb.getSemesters(),
    currentSession: custechDb.getCurrentAcademicSession(),
    currentSemester: custechDb.getCurrentSemester(),
  };
}

export async function getCoursesDetailedAction(facultyId?: string) {
  const all = custechDb.getCoursesWithDetails();
  if (!facultyId) return all;
  return all.filter((c) => c.facultyId === facultyId);
}

export async function createCourseAction(
  courseData: {
    code: string;
    title: string;
    creditUnits: number;
    departmentId: string;
    level: 100 | 200 | 300 | 400 | 500;
    semesterType?: 'FIRST' | 'SECOND';
    academicSessionId?: string;
    primaryLecturerId?: string;
    description?: string;
    scheduleDay?: number;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    scheduleVenue?: string;
    autoEnrollStudents?: boolean;
  },
  _actorId?: string
) {
  try {
    const actor = await requireCourseManagementAuth(courseData.departmentId);
    const course = custechDb.createCourse(courseData, actor.user.id);
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
    semesterType: 'FIRST' | 'SECOND';
    academicSessionId: string;
    description?: string;
    isActive: boolean;
    primaryLecturerId: string;
    scheduleDay?: number;
    scheduleStartTime?: string;
    scheduleEndTime?: string;
    scheduleVenue?: string;
  }>,
  _actorId?: string
) {
  try {
    const existing = custechDb.getCourses().find((c) => c.id === courseId);
    const actor = await requireCourseManagementAuth(
      courseData.departmentId || existing?.departmentId
    );
    const course = custechDb.updateCourse(courseId, courseData, actor.user.id);
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
  _actorId?: string
) {
  try {
    const existing = custechDb.getCourses().find((c) => c.id === courseId);
    const actor = await requireCourseManagementAuth(existing?.departmentId);
    const course = custechDb.toggleCourseActive(courseId, isActive, actor.user.id);
    return { success: true, course };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update course status',
    };
  }
}

export async function deleteCourseAction(courseId: string, _actorId?: string) {
  try {
    const existing = custechDb.getCourses().find((c) => c.id === courseId);
    const actor = await requireCourseManagementAuth(existing?.departmentId);
    custechDb.deleteCourse(courseId, actor.user.id);
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete course',
    };
  }
}

export async function syncCourseEnrollmentsAction(courseId: string) {
  try {
    const existing = custechDb.getCourses().find((c) => c.id === courseId);
    const actor = await requireCourseManagementAuth(existing?.departmentId);
    const newlyEnrolled = custechDb.syncEligibleStudentsForCourse(courseId, actor.user.id);
    custechDb.savePersistentData();
    return { success: true, newlyEnrolled };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to sync enrollments',
    };
  }
}

export async function registerCoursesForDepartmentAction(params: {
  departmentId: string;
  level: 100 | 200 | 300 | 400 | 500 | 'ALL';
  courseIds: string[];
  mode?: 'ADD' | 'SYNC_EXACT';
}) {
  try {
    const actor = await requireCourseManagementAuth(params.departmentId);
    const result = custechDb.registerCoursesForDepartmentCohort({
      departmentId: params.departmentId,
      level: params.level,
      courseIds: params.courseIds,
      mode: params.mode || 'ADD',
      actorId: actor.user.id,
    });
    return { success: true, result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to register department courses',
    };
  }
}

export async function setStudentCourseRegistrationsAction(params: {
  studentId: string;
  courseIds: string[];
}) {
  try {
    const student = custechDb.getStudentById(params.studentId);
    const profile = student ? custechDb.getProfileById(student.profileId) : undefined;
    const actor = await requireCourseManagementAuth(profile?.departmentId);
    const result = custechDb.setStudentCourseRegistrations(
      params.studentId,
      params.courseIds,
      actor.user.id
    );
    return { success: true, result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update student course registrations',
    };
  }
}

export async function getAvailableCoursesForRegistrationAction() {
  try {
    await requireServerSession();
    return {
      success: true,
      courses: custechDb
        .getCoursesWithDetails()
        .filter((c) => c.isActive !== false)
        .map((c) => ({
          id: c.id,
          code: c.code,
          title: c.title,
          creditUnits: c.creditUnits,
          departmentId: c.departmentId,
          departmentName: c.departmentName,
          facultyId: c.facultyId,
          level: c.level,
          semesterType: c.semesterType,
          assignedLecturers: c.assignedLecturers,
        })),
    };
  } catch (err: unknown) {
    return {
      success: false,
      courses: [],
      error: err instanceof Error ? err.message : 'Unauthorized',
    };
  }
}

export async function submitStudentCourseRegistrationAction(params: {
  courseIds: string[];
  studentNote?: string;
}) {
  try {
    const actor = await requireServerSession();
    const student = custechDb.getStudentByProfileId(actor.user.id);
    if (!student) {
      return {
        success: false,
        error: 'Only registered students can submit a student course registration.',
      };
    }

    const request = custechDb.submitStudentCourseRegistration({
      studentId: student.id,
      courseIds: params.courseIds,
      studentNote: params.studentNote,
      actorId: actor.user.id,
    });
    return { success: true, request };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit course registration',
    };
  }
}

export async function reviewStudentCourseRegistrationAction(params: {
  requestId: string;
  decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
  reviewerComment?: string;
}) {
  try {
    const actor = await requireServerSession();
    const allowedRoles: UserRole[] = [
      'SUPER_ADMIN',
      'PRINCIPAL_OFFICER',
      'DEAN',
      'FACULTY_REP',
      'ASST_FACULTY_REP',
      'HOD',
    ];
    if (!allowedRoles.includes(actor.activeRole)) {
      throw new Error('Unauthorized: HOD, Faculty Admin, or Super Admin privileges are required to review course registrations.');
    }

    const existingReq = custechDb
      .getCourseRegistrationRequests()
      .find((r) => r.id === params.requestId);
    if (!existingReq) {
      throw new Error('Course registration request not found.');
    }

    if (actor.activeRole === 'HOD' && actor.user.departmentId) {
      const actorDept = actor.user.departmentId === 'dept-se' ? 'dept-sen' : actor.user.departmentId;
      if (existingReq.departmentId !== actorDept) {
        throw new Error('Unauthorized: HODs can only review course registrations for students in their own department.');
      }
    }

    if (isFacultyAdminRole(actor.activeRole) && actor.user.facultyId) {
      const dept = custechDb.getDepartments().find((d) => d.id === existingReq.departmentId);
      if (dept && dept.facultyId !== actor.user.facultyId) {
        throw new Error('Unauthorized: Faculty Admins can only review registrations within their assigned faculty.');
      }
    }

    const request = custechDb.reviewStudentCourseRegistration({
      requestId: params.requestId,
      decision: params.decision,
      reviewerComment: params.reviewerComment,
      reviewerId: actor.user.id,
    });
    return { success: true, request };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to review course registration',
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
    semesterType?: 'FIRST' | 'SECOND';
    description?: string;
    lecturerEmailOrName?: string;
  }>,
  _actorId?: string
) {
  try {
    const actor = await requireCourseManagementAuth();
    const restrictedFacultyId =
      isFacultyAdminRole(actor.activeRole) && actor.activeRole !== 'PRINCIPAL_OFFICER'
        ? actor.user.facultyId
        : undefined;
    const summary = custechDb.bulkImportCourses(records, actor.user.id, restrictedFacultyId);
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const lecturer = custechDb.createLecturer(lecturerData, actor.user.id);
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const lecturer = custechDb.updateLecturer(lecturerId, lecturerData, actor.user.id);
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
  _actorId?: string
) {
  try {
    const actor = await requireSuperAdmin();
    const lecturer = custechDb.toggleLecturerActive(lecturerId, isActive, actor.user.id);
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
  _actorId?: string
) {
  try {
    const offeringObj = custechDb.getOfferingById(courseOfferingId);
    const actor = await requireCourseManagementAuth(offeringObj?.course?.departmentId);
    const offering = custechDb.assignLecturerToCourseOffering(
      courseOfferingId,
      lecturerId,
      actor.user.id
    );
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
  _actorId?: string
) {
  try {
    const off = custechDb.getOfferingById(timetableData.courseOfferingId);
    const actor = await requireCourseManagementAuth(off?.course?.departmentId);
    const entry = custechDb.createTimetableEntry(timetableData, actor.user.id);
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
  _actorId?: string
) {
  try {
    const actor = await requireCourseManagementAuth();
    const entry = custechDb.updateTimetableEntry(timetableId, timetableData, actor.user.id);
    return { success: true, entry };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update timetable entry',
    };
  }
}

export async function deleteTimetableAction(timetableId: string, _actorId?: string) {
  try {
    const actor = await requireCourseManagementAuth();
    custechDb.deleteTimetableEntry(timetableId, actor.user.id);
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
export async function verifyMatriculationNumberAction(
  matricNumber: string,
  context?: { sessionId?: string; courseCode?: string }
) {
  const res = custechDb.verifyStudentMatric(matricNumber);
  if (!res.found || !res.student) {
    return res;
  }

  let eligibility:
    | {
        eligible: boolean;
        reason?: string;
        courseCode?: string;
        courseTitle?: string;
        sessionStatus?: string;
      }
    | undefined;

  if (context?.sessionId || context?.courseCode) {
    const check = custechDb.getCourseEligibilityForStudent(res.student.id, context);
    eligibility = {
      eligible: check.eligible,
      reason: check.reason,
      courseCode: check.course?.code,
      courseTitle: check.course?.title,
      sessionStatus: check.sessionStatus,
    };
  }

  return {
    ...res,
    eligibility,
  };
}

/**
 * ==========================================
 * INVESTIGATE DEVICE COLLISION ALERTS (PHASE 8.5)
 * ==========================================
 */
export async function investigateDeviceAlertAction(
  alertId: string,
  _reviewerId: string,
  action: 'CLEARED' | 'FLAGGED_FRAUD',
  reviewNotes?: string
) {
  try {
    const actor = await requireStaffOrAdmin();
    const alert = custechDb.investigateDeviceAlert(alertId, actor.user.id, action, reviewNotes);
    return { success: true, alert };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to review alert',
    };
  }
}

export async function getDeviceCollisionAlertsAction(sessionId?: string) {
  await requireStaffOrAdmin();
  return custechDb.getDeviceCollisionAlerts(sessionId);
}

export async function getAllSessionsDetailedAction() {
  await requireStaffOrAdmin();
  return custechDb.getSessions().map((s) => ({ ...s, sessionSecretNonce: '' }));
}

export async function getSessionRecordsAction(sessionId: string) {
  await requireStaffOrAdmin();
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

export async function ensureDepartmentAction(data: {
  name: string;
  facultyId?: string;
  code?: string;
}): Promise<{
  success: boolean;
  department?: Department;
  error?: string;
}> {
  try {
    await requireCourseManagementAuth();
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
  _actorId?: string
): Promise<{
  success: boolean;
  course?: Course;
  offering?: CourseOffering;
  createdNewCourse?: boolean;
  error?: string;
}> {
  try {
    const actor = await requireCourseManagementAuth(params.departmentId);
    const result = custechDb.assignCourseManuallyToLecturer(params, actor.user.id);
    return { success: true, ...result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to manually assign course',
    };
  }
}
