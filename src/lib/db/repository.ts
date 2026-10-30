import {
  AttendanceSession,
  AttendanceRecord,
  AttendanceCorrection,
  Student,
  UserProfile,
  CourseOffering,
  Course,
  AuditLog,
  UserRole,
  SystemSettings,
  StaffAttendance,
  SyllabusTopic,
  CourseMaterial,
  TimetableEntry,
  Classroom,
  Department,
  Faculty,
  Enrollment,
  AttendanceStatus,
  AttendanceMethod,
  AssistedReason,
  MedicalWaiver,
  DeviceCollisionAlert,
  AppNotification,
  ExamDocket,
  ExamDocketCourse,
} from '@/types';
import {
  initialProfiles,
  initialFaculties,
  initialDepartments,
  initialPrograms,
  initialAcademicSessions,
  initialSemesters,
  initialStudents,
  initialStaff,
  initialClassrooms,
  initialCourses,
  initialCourseOfferings,
  initialTimetable,
  initialEnrollments,
  initialCourseReps,
  initialSessions,
  initialAttendanceRecords,
  initialCorrections,
  initialSyllabusTopics,
  initialMaterials,
  initialStaffAttendance,
  initialSystemSettings,
  initialAuditLogs,
  initialMedicalWaivers,
  initialDeviceCollisionAlerts,
  initialNotifications,
} from './initial-data';
import { generateTemporaryCode, verifyAttendancePin } from '../crypto';
import bcrypt from 'bcryptjs';

class CustechDatabase {
  private profiles = [...initialProfiles];
  private faculties = [...initialFaculties];
  private departments = [...initialDepartments];
  private programs = [...initialPrograms];
  private academicSessions = [...initialAcademicSessions];
  private semesters = [...initialSemesters];
  private students = [...initialStudents];
  private staff = [...initialStaff];
  private classrooms = [...initialClassrooms];
  private courses = [...initialCourses];
  private courseOfferings = [...initialCourseOfferings];
  private timetables = [...initialTimetable];
  private enrollments = [...initialEnrollments];
  private courseReps = [...initialCourseReps];
  private sessions = [...initialSessions];
  private attendanceRecords = [...initialAttendanceRecords];
  private corrections = [...initialCorrections];
  private syllabusTopics = [...initialSyllabusTopics];
  private materials = [...initialMaterials];
  private staffAttendance = [...initialStaffAttendance];
  private systemSettings: SystemSettings = { ...initialSystemSettings };
  private auditLogs = [...initialAuditLogs];
  private medicalWaivers = [...initialMedicalWaivers];
  private deviceCollisionAlerts = [...initialDeviceCollisionAlerts];
  private notifications = [...initialNotifications];

  constructor() {
    this.loadPersistentData();
  }

  // ==========================================
  // LOCAL & FILESYSTEM DATA PERSISTENCE
  // ==========================================
  private getStorageFilePath(): string | null {
    if (typeof window !== 'undefined') return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require('path');
      return path.join(process.cwd(), 'src', 'data', 'custech_store.json');
    } catch {
      return null;
    }
  }

  private loadPersistentData(): void {
    // 1. Client-side browser persistence
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('custech_persisted_store_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.customProfiles)) {
            parsed.customProfiles.forEach((p: UserProfile) => {
              if (!this.profiles.some((ep) => ep.id === p.id)) this.profiles.unshift(p);
            });
          }
          if (Array.isArray(parsed.customStudents)) {
            parsed.customStudents.forEach((s: Student) => {
              if (!this.students.some((es) => es.id === s.id)) this.students.unshift(s);
            });
          }
          if (Array.isArray(parsed.customEnrollments)) {
            parsed.customEnrollments.forEach((e: Enrollment) => {
              if (!this.enrollments.some((ee) => ee.id === e.id)) this.enrollments.push(e);
            });
          }
          if (Array.isArray(parsed.customDepartments)) {
            parsed.customDepartments.forEach((d: Department) => {
              if (!this.departments.some((ed) => ed.id === d.id)) this.departments.push(d);
            });
          }
          if (parsed.systemSettings) {
            this.systemSettings = { ...this.systemSettings, ...parsed.systemSettings };
          }
        }
      } catch (err) {
        console.warn('Failed to load localStorage custech_store:', err);
      }
      return;
    }

    // 2. Server-side Node.js filesystem persistence
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const storeFile = this.getStorageFilePath();
      if (storeFile && fs.existsSync(storeFile)) {
        const fileContent = fs.readFileSync(storeFile, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed.customProfiles)) {
          parsed.customProfiles.forEach((p: UserProfile) => {
            if (!this.profiles.some((ep) => ep.id === p.id)) this.profiles.unshift(p);
          });
        }
        if (Array.isArray(parsed.customStudents)) {
          parsed.customStudents.forEach((s: Student) => {
            if (!this.students.some((es) => es.id === s.id)) this.students.unshift(s);
          });
        }
        if (Array.isArray(parsed.customEnrollments)) {
          parsed.customEnrollments.forEach((e: Enrollment) => {
            if (!this.enrollments.some((ee) => ee.id === e.id)) this.enrollments.push(e);
          });
        }
        if (Array.isArray(parsed.customDepartments)) {
          parsed.customDepartments.forEach((d: Department) => {
            if (!this.departments.some((ed) => ed.id === d.id)) this.departments.push(d);
          });
        }
        if (parsed.systemSettings) {
          this.systemSettings = { ...this.systemSettings, ...parsed.systemSettings };
        }
        if (Array.isArray(parsed.auditLogs)) {
          parsed.auditLogs.forEach((a: AuditLog) => {
            if (!this.auditLogs.some((ea) => ea.id === a.id)) this.auditLogs.unshift(a);
          });
        }
      }
    } catch (err) {
      console.warn('Failed to load filesystem custech_store:', err);
    }
  }

  savePersistentData(): void {
    const initialProfileIds = new Set(initialProfiles.map((p) => p.id));
    const initialStudentIds = new Set(initialStudents.map((s) => s.id));
    const initialEnrollmentIds = new Set(initialEnrollments.map((e) => e.id));
    const initialDeptIds = new Set(initialDepartments.map((d) => d.id));

    const customProfiles = this.profiles.filter((p) => !initialProfileIds.has(p.id));
    const customStudents = this.students.filter((s) => !initialStudentIds.has(s.id));
    const customEnrollments = this.enrollments.filter((e) => !initialEnrollmentIds.has(e.id));
    const customDepartments = this.departments.filter((d) => !initialDeptIds.has(d.id));

    const payload = {
      customProfiles,
      customStudents,
      customEnrollments,
      customDepartments,
      systemSettings: this.systemSettings,
      auditLogs: this.auditLogs.slice(0, 100),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('custech_persisted_store_v1', JSON.stringify(payload));
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const storeFile = this.getStorageFilePath();
      if (storeFile) {
        fs.writeFileSync(storeFile, JSON.stringify(payload, null, 2), 'utf8');
      }
    } catch (err) {
      console.warn('Could not save to filesystem:', err);
    }
  }

  // ==========================================
  // PROFILES & ROLES
  // ==========================================
  getProfiles(): UserProfile[] {
    return [...this.profiles];
  }

  getProfileById(id: string): UserProfile | undefined {
    return this.profiles.find((p) => p.id === id);
  }

  getProfileByEmail(email: string): UserProfile | undefined {
    return this.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  }

  // ==========================================
  // STUDENTS & REPS
  // ==========================================
  getStudentByProfileId(profileId: string): (Student & { profile?: UserProfile }) | undefined {
    const student = this.students.find((s) => s.profileId === profileId);
    if (!student) return undefined;
    const profile = this.getProfileById(student.profileId);
    return { ...student, profile };
  }

  getStudentByMatric(matric: string): (Student & { profile?: UserProfile }) | undefined {
    const normalized = matric.trim().toUpperCase();
    const student = this.students.find((s) => s.matricNumber.toUpperCase() === normalized);
    if (!student) return undefined;
    const profile = this.getProfileById(student.profileId);
    return { ...student, profile };
  }

  getStudentById(id: string): (Student & { profile?: UserProfile }) | undefined {
    const student = this.students.find((s) => s.id === id);
    if (!student) return undefined;
    const profile = this.getProfileById(student.profileId);
    return { ...student, profile };
  }

  isCourseRepresentative(studentId: string, courseOfferingId: string): boolean {
    return this.courseReps.some(
      (r) => r.studentId === studentId && r.courseOfferingId === courseOfferingId && r.canOperateKiosk
    );
  }

  isStudentEnrolled(studentId: string, courseOfferingId: string): boolean {
    return this.enrollments.some(
      (e) => e.studentId === studentId && e.courseOfferingId === courseOfferingId && e.isActive
    );
  }

  registerStudent(params: {
    firstName: string;
    lastName: string;
    matricNumber: string;
    email?: string;
    departmentName?: string;
    departmentId?: string;
    programId?: string;
    currentLevel?: 100 | 200 | 300 | 400 | 500;
    pin?: string;
    enrollInCourses?: boolean;
    actorId?: string;
  }): { student: Student; profile: UserProfile } {
    const cleanMatric = params.matricNumber.trim().toUpperCase();
    const cleanEmail = params.email?.trim()
      ? params.email.trim().toLowerCase()
      : `${cleanMatric.toLowerCase()}@student.custech.edu.ng`;

    // Prevent duplicate matriculation number
    if (this.students.some((s) => s.matricNumber.toUpperCase() === cleanMatric)) {
      throw new Error(`Matriculation number "${cleanMatric}" is already registered in the CUSTECH academic database.`);
    }

    // Prevent duplicate email only if explicitly provided
    if (params.email?.trim() && this.profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
      throw new Error(`Email "${cleanEmail}" is already registered.`);
    }

    const timestamp = Date.now();
    const profileId = `user-stu-${timestamp}`;
    const studentId = `stu-${timestamp}`;
    const pin = params.pin || '1234';
    const pinHash = bcrypt.hashSync(pin, 10);

    // Dynamic typed department handling (supports any department in CUSTECH!)
    const typedDept = (params.departmentName || params.departmentId || 'Computer Science').trim();
    let dept = this.departments.find(
      (d) =>
        d.id.toLowerCase() === typedDept.toLowerCase() ||
        d.name.toLowerCase() === typedDept.toLowerCase() ||
        d.code.toLowerCase() === typedDept.toLowerCase()
    );

    if (!dept) {
      const code = typedDept
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || 'DEPT';
      dept = {
        id: `dept-${typedDept.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        facultyId: 'fac-comp',
        code,
        name: typedDept,
      };
      this.departments.push(dept);
    }

    const deptId = dept.id;
    const facultyId = dept.facultyId || 'fac-comp';
    const level = params.currentLevel || 200;

    const newProfile: UserProfile = {
      id: profileId,
      email: cleanEmail,
      firstName: params.firstName.trim(),
      lastName: params.lastName.trim(),
      matricNumber: cleanMatric,
      primaryRole: 'STUDENT',
      assignedRoles: ['STUDENT'],
      departmentId: deptId,
      facultyId: facultyId,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const newStudent: Student = {
      id: studentId,
      profileId: profileId,
      matricNumber: cleanMatric,
      programId: params.programId || 'prog-csc',
      currentLevel: level,
      attendancePinHash: pinHash,
      profile: newProfile,
    };

    this.profiles.unshift(newProfile);
    this.students.unshift(newStudent);

    // Auto-enroll in active courses for their level/department (or default offerings like CSC 201)
    if (params.enrollInCourses !== false) {
      const activeOfferings = this.courseOfferings.filter((co) => {
        const c = this.courses.find((course) => course.id === co.courseId);
        return c && (c.departmentId === deptId || c.level === level);
      });

      const targetOfferings = activeOfferings.length > 0 ? activeOfferings : this.courseOfferings;
      targetOfferings.forEach((off) => {
        if (!this.enrollments.some((e) => e.studentId === studentId && e.courseOfferingId === off.id)) {
          this.enrollments.push({
            id: `enr_${timestamp}_${off.id}`,
            studentId,
            courseOfferingId: off.id,
            isActive: true,
          });
        }
      });
    }

    this.logAudit({
      actorId: params.actorId || 'user-admin',
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_REGISTERED_STUDENT',
      entityType: 'students',
      entityId: studentId,
      details: {
        matricNumber: cleanMatric,
        fullName: `${params.firstName} ${params.lastName}`,
        departmentId: deptId,
        level,
      },
    });

    this.savePersistentData();

    return { student: newStudent, profile: newProfile };
  }

  deleteStudent(studentId: string, actorId: string): boolean {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) return false;

    this.students = this.students.filter((s) => s.id !== studentId);
    this.profiles = this.profiles.filter((p) => p.id !== student.profileId);
    this.enrollments = this.enrollments.filter((e) => e.studentId !== studentId);

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_DELETED_STUDENT',
      entityType: 'students',
      entityId: studentId,
      details: { matricNumber: student.matricNumber },
    });

    this.savePersistentData();
    return true;
  }

  resetStudentPin(studentId: string, newPin: string, actorId: string): boolean {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) return false;

    student.attendancePinHash = bcrypt.hashSync(newPin, 10);

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_RESET_STUDENT_PIN',
      entityType: 'students',
      entityId: studentId,
      details: { matricNumber: student.matricNumber },
    });

    this.savePersistentData();
    return true;
  }

  getAllStudentsDetailed(): (Student & {
    profile?: UserProfile;
    enrolledCoursesCount: number;
    departmentName: string;
    facultyName: string;
  })[] {
    return this.students.map((s) => {
      const profile = this.getProfileById(s.profileId);
      const enrolledCount = this.enrollments.filter((e) => e.studentId === s.id && e.isActive).length;
      const dept = this.departments.find((d) => d.id === profile?.departmentId);
      const fac = this.faculties.find((f) => f.id === dept?.facultyId);

      return {
        ...s,
        profile,
        enrolledCoursesCount: enrolledCount,
        departmentName: dept?.name || 'Computer Science',
        facultyName: fac?.name || 'Faculty of Computing',
      };
    });
  }

  getEnrolledStudentsForOffering(courseOfferingId: string): (Student & { profile?: UserProfile })[] {
    const enrolledIds = this.enrollments
      .filter((e) => e.courseOfferingId === courseOfferingId && e.isActive)
      .map((e) => e.studentId);
    return this.students
      .filter((s) => enrolledIds.includes(s.id))
      .map((s) => ({ ...s, profile: this.getProfileById(s.profileId) }));
  }

  // ==========================================
  // COURSES, TIMETABLES & OFFERINGS
  // ==========================================
  getCourses(): Course[] {
    return [...this.courses];
  }

  getCourseOfferings(): (CourseOffering & { course?: Course; primaryLecturer?: UserProfile })[] {
    return this.courseOfferings.map((co) => ({
      ...co,
      course: this.courses.find((c) => c.id === co.courseId),
      primaryLecturer: this.getProfileById(co.primaryLecturerId),
    }));
  }

  getOfferingById(id: string): (CourseOffering & { course?: Course; primaryLecturer?: UserProfile }) | undefined {
    const co = this.courseOfferings.find((o) => o.id === id);
    if (!co) return undefined;
    return {
      ...co,
      course: this.courses.find((c) => c.id === co.courseId),
      primaryLecturer: this.getProfileById(co.primaryLecturerId),
    };
  }

  getLecturerOfferings(lecturerProfileId: string) {
    return this.getCourseOfferings().filter((co) => co.primaryLecturerId === lecturerProfileId);
  }

  getStudentOfferings(studentId: string) {
    const enrolledOfferingIds = this.enrollments
      .filter((e) => e.studentId === studentId && e.isActive)
      .map((e) => e.courseOfferingId);
    return this.getCourseOfferings().filter((co) => enrolledOfferingIds.includes(co.id));
  }

  getTimetableEntries(): (TimetableEntry & {
    courseOffering?: CourseOffering & { course?: Course; primaryLecturer?: UserProfile };
    classroom?: Classroom;
  })[] {
    return this.timetables.map((tt) => ({
      ...tt,
      courseOffering: this.getOfferingById(tt.courseOfferingId),
      classroom: this.classrooms.find((c) => c.id === tt.classroomId),
    }));
  }

  // ==========================================
  // ATTENDANCE SESSIONS
  // ==========================================
  getSessions(): (AttendanceSession & {
    courseOffering?: CourseOffering & { course?: Course };
    classroom?: Classroom;
    lecturer?: UserProfile;
  })[] {
    return this.sessions.map((s) => {
      const offering = this.getOfferingById(s.courseOfferingId);
      return {
        ...s,
        courseOffering: offering,
        classroom: this.classrooms.find((c) => c.id === s.classroomId),
        lecturer: this.getProfileById(s.lecturerId),
      };
    });
  }

  getSessionById(id: string): (AttendanceSession & {
    courseOffering?: CourseOffering & { course?: Course };
    classroom?: Classroom;
    lecturer?: UserProfile;
  }) | undefined {
    const s = this.sessions.find((sess) => sess.id === id);
    if (!s) return undefined;
    const offering = this.getOfferingById(s.courseOfferingId);
    return {
      ...s,
      courseOffering: offering,
      classroom: this.classrooms.find((c) => c.id === s.classroomId),
      lecturer: this.getProfileById(s.lecturerId),
    };
  }

  getActiveSessionForCourse(courseOfferingId: string): AttendanceSession | undefined {
    return this.sessions.find(
      (s) => s.courseOfferingId === courseOfferingId && s.status === 'ACTIVE'
    );
  }

  startSession(
    courseOfferingId: string,
    lecturerId: string,
    classroomId?: string
  ): AttendanceSession {
    const existingActive = this.getActiveSessionForCourse(courseOfferingId);
    if (existingActive) {
      return existingActive;
    }

    const newSession: AttendanceSession = {
      id: `sess_${Date.now()}`,
      courseOfferingId,
      lecturerId,
      classroomId: classroomId || 'room-lh101',
      date: new Date().toISOString().split('T')[0],
      scheduledStart: new Date().toISOString(),
      scheduledEnd: new Date(Date.now() + 2 * 3600000).toISOString(),
      actualStart: new Date().toISOString(),
      status: 'ACTIVE',
      currentTempCode: generateTemporaryCode(),
      tempCodeExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      qrRotationSeconds: this.systemSettings.qrRotationSeconds,
      lateThresholdMinutes: this.systemSettings.lateThresholdMinutes,
      sessionSecretNonce: `nonce_${Date.now()}`,
    };

    this.sessions.unshift(newSession);

    this.logAudit({
      actorId: lecturerId,
      actorRole: 'LECTURER',
      action: 'START_ATTENDANCE_SESSION',
      entityType: 'attendance_sessions',
      entityId: newSession.id,
      details: { courseOfferingId, date: newSession.date },
    });

    return newSession;
  }

  pauseSession(sessionId: string, actorId: string): AttendanceSession {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.status = 'PAUSED';

    this.logAudit({
      actorId,
      action: 'PAUSE_ATTENDANCE_SESSION',
      entityType: 'attendance_sessions',
      entityId: sessionId,
    });

    return session;
  }

  resumeSession(sessionId: string, actorId: string): AttendanceSession {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.status = 'ACTIVE';

    this.logAudit({
      actorId,
      action: 'RESUME_ATTENDANCE_SESSION',
      entityType: 'attendance_sessions',
      entityId: sessionId,
    });

    return session;
  }

  closeSession(sessionId: string, actorId: string): AttendanceSession {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.status = 'CLOSED';
    session.actualClose = new Date().toISOString();

    this.logAudit({
      actorId,
      action: 'CLOSE_ATTENDANCE_SESSION',
      entityType: 'attendance_sessions',
      entityId: sessionId,
    });

    return session;
  }

  rotateSessionTempCode(sessionId: string): string {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.currentTempCode = generateTemporaryCode();
    session.tempCodeExpiresAt = new Date(Date.now() + 300000).toISOString(); // 5m
    return session.currentTempCode;
  }

  // ==========================================
  // ATTENDANCE RECORDS & SUBMISSION (WITH STRICT DEDUPLICATION)
  // ==========================================
  getRecordsForSession(sessionId: string): (AttendanceRecord & { student?: Student & { profile?: UserProfile } })[] {
    return this.attendanceRecords
      .filter((r) => r.sessionId === sessionId)
      .map((r) => ({
        ...r,
        student: this.getStudentById(r.studentId),
      }));
  }

  getRecordsForStudent(studentId: string): AttendanceRecord[] {
    return this.attendanceRecords.filter((r) => r.studentId === studentId);
  }

  /**
   * Records attendance with strict database-level unique constraint emulation:
   * UNIQUE(session_id, student_id)
   * Also checks clientEventId for idempotent offline sync.
   */
  recordAttendance(params: {
    sessionId: string;
    studentId: string;
    method: AttendanceMethod;
    recordedBy: string;
    clientEventId?: string;
    assistedReason?: AssistedReason;
    deviceFingerprintHash?: string;
    latitude?: number;
    longitude?: number;
  }): { record: AttendanceRecord; isDuplicate: boolean; message: string } {
    const session = this.sessions.find((s) => s.id === params.sessionId);
    if (!session) {
      throw new Error('Attendance session not found');
    }
    if (session.status !== 'ACTIVE') {
      throw new Error(`Attendance session is ${session.status.toLowerCase()}. Submissions are rejected.`);
    }

    // Check enrollment
    if (!this.isStudentEnrolled(params.studentId, session.courseOfferingId)) {
      throw new Error('Student is not enrolled in this course offering.');
    }

    // 1. Check idempotency via clientEventId
    if (params.clientEventId) {
      const existingEvent = this.attendanceRecords.find(
        (r) => r.clientEventId === params.clientEventId
      );
      if (existingEvent) {
        return {
          record: existingEvent,
          isDuplicate: true,
          message: 'Attendance already synchronized with this event ID.',
        };
      }
    }

    // 2. Strict unique constraint: UNIQUE(session_id, student_id)
    const existingRecord = this.attendanceRecords.find(
      (r) => r.sessionId === params.sessionId && r.studentId === params.studentId
    );
    if (existingRecord) {
      return {
        record: existingRecord,
        isDuplicate: true,
        message: 'Attendance already recorded for this session.',
      };
    }

    // Determine status (PRESENT vs LATE)
    const now = Date.now();
    const sessionStart = session.actualStart ? new Date(session.actualStart).getTime() : now;
    const minutesSinceStart = (now - sessionStart) / (1000 * 60);
    const status: AttendanceStatus =
      minutesSinceStart > session.lateThresholdMinutes ? 'LATE' : 'PRESENT';

    // Option B: Anti-Fraud Device Collision / Proxy Ring Telemetry
    let isFlaggedSuspicious = false;
    let flagReason: string | undefined = undefined;

    if (params.deviceFingerprintHash) {
      const collisionRecords = this.attendanceRecords.filter(
        (r) =>
          r.sessionId === params.sessionId &&
          r.deviceFingerprintHash === params.deviceFingerprintHash &&
          r.studentId !== params.studentId
      );

      if (collisionRecords.length > 0) {
        isFlaggedSuspicious = true;
        flagReason = 'Device Collision: Multiple student accounts submitting from same device';

        const currentStudent = this.getStudentById(params.studentId);
        const studentMatric = currentStudent?.matricNumber || params.studentId;

        const existingAlert = this.deviceCollisionAlerts.find(
          (a) =>
            a.sessionId === params.sessionId &&
            a.deviceFingerprintHash === params.deviceFingerprintHash
        );

        if (existingAlert) {
          if (!existingAlert.matchedMatricNumbers.includes(studentMatric)) {
            existingAlert.matchedMatricNumbers.push(studentMatric);
          }
          existingAlert.attemptCount++;
        } else {
          const matchedMatrics = collisionRecords
            .map((cr) => this.getStudentById(cr.studentId)?.matricNumber || cr.studentId)
            .concat(studentMatric);

          this.deviceCollisionAlerts.unshift({
            id: `alert_col_${Date.now()}`,
            sessionId: params.sessionId,
            deviceFingerprintHash: params.deviceFingerprintHash,
            matchedMatricNumbers: Array.from(new Set(matchedMatrics)),
            sessionCode: 'CSC 201',
            attemptCount: collisionRecords.length + 1,
            isReviewed: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    const newRecord: AttendanceRecord = {
      id: `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sessionId: params.sessionId,
      studentId: params.studentId,
      status,
      method: params.method,
      recordedBy: params.recordedBy,
      clientEventId: params.clientEventId,
      assistedReason: params.assistedReason,
      deviceFingerprintHash: params.deviceFingerprintHash,
      latitude: params.latitude,
      longitude: params.longitude,
      isFlaggedSuspicious,
      flagReason,
      recordedAt: new Date().toISOString(),
    };

    this.attendanceRecords.push(newRecord);

    this.logAudit({
      actorId: params.recordedBy,
      action: 'ATTENDANCE_RECORDED',
      entityType: 'attendance_records',
      entityId: newRecord.id,
      details: {
        studentId: params.studentId,
        sessionId: params.sessionId,
        status,
        method: params.method,
      },
    });

    return {
      record: newRecord,
      isDuplicate: false,
      message: `Attendance successfully recorded as ${status}.`,
    };
  }

  // ==========================================
  // KIOSK PIN VERIFICATION
  // ==========================================
  async verifyAndRecordKiosk(params: {
    sessionId: string;
    matricNumber: string;
    attendancePin: string;
    assistedReason: AssistedReason;
    operatorProfileId: string;
    clientEventId?: string;
  }): Promise<{ success: boolean; message: string; record?: AttendanceRecord; studentName?: string }> {
    const student = this.getStudentByMatric(params.matricNumber);
    if (!student) {
      return { success: false, message: 'Matriculation number not recognized in CUSTECH registry.' };
    }

    // Verify 4-digit PIN against hash
    const isPinValid = await verifyAttendancePin(params.attendancePin, student.attendancePinHash);
    if (!isPinValid) {
      // Log suspicious failed PIN attempt
      this.logAudit({
        actorId: params.operatorProfileId,
        action: 'FAILED_KIOSK_PIN_ATTEMPT',
        entityType: 'students',
        entityId: student.id,
        details: { matricNumber: params.matricNumber },
      });
      return { success: false, message: 'Invalid 4-digit Attendance PIN.' };
    }

    try {
      const { record, isDuplicate, message } = this.recordAttendance({
        sessionId: params.sessionId,
        studentId: student.id,
        method: 'KIOSK_PIN',
        recordedBy: params.operatorProfileId,
        clientEventId: params.clientEventId,
        assistedReason: params.assistedReason,
      });

      const studentName = student.profile
        ? `${student.profile.firstName} ${student.profile.lastName}`
        : params.matricNumber;

      return {
        success: true,
        message: isDuplicate ? message : `Welcome, ${studentName}! Attendance logged (${record.status}).`,
        record,
        studentName,
      };
    } catch (err: unknown) {
      return { success: false, message: err instanceof Error ? err.message : 'Error recording attendance.' };
    }
  }

  // ==========================================
  // ATTENDANCE CORRECTIONS & AUDIT
  // ==========================================
  getCorrections(): (AttendanceCorrection & {
    student?: Student & { profile?: UserProfile };
    session?: AttendanceSession & { courseOffering?: CourseOffering & { course?: Course } };
  })[] {
    return this.corrections.map((c) => ({
      ...c,
      student: this.getStudentById(c.studentId),
      session: this.getSessionById(c.sessionId),
    }));
  }

  submitCorrection(params: {
    sessionId: string;
    studentId: string;
    reason: string;
    supportingDocUrl?: string;
  }): AttendanceCorrection {
    const existing = this.corrections.find(
      (c) => c.sessionId === params.sessionId && c.studentId === params.studentId
    );
    if (existing) {
      throw new Error('A correction request has already been submitted for this session.');
    }

    const newCorrection: AttendanceCorrection = {
      id: `cor_${Date.now()}`,
      sessionId: params.sessionId,
      studentId: params.studentId,
      reason: params.reason,
      supportingDocUrl: params.supportingDocUrl,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.corrections.unshift(newCorrection);

    this.logAudit({
      actorId: params.studentId,
      action: 'SUBMIT_CORRECTION_REQUEST',
      entityType: 'attendance_corrections',
      entityId: newCorrection.id,
      details: { sessionId: params.sessionId, reason: params.reason },
    });

    return newCorrection;
  }

  resolveCorrection(params: {
    correctionId: string;
    reviewerId: string;
    status: 'APPROVED' | 'REJECTED';
    reviewNotes?: string;
  }): AttendanceCorrection {
    const correction = this.corrections.find((c) => c.id === params.correctionId);
    if (!correction) throw new Error('Correction not found');

    correction.status = params.status;
    correction.reviewedBy = params.reviewerId;
    correction.reviewNotes = params.reviewNotes;
    correction.reviewedAt = new Date().toISOString();

    if (params.status === 'APPROVED') {
      // Find or create attendance record with method ADMIN_ADJUSTMENT
      const existing = this.attendanceRecords.find(
        (r) => r.sessionId === correction.sessionId && r.studentId === correction.studentId
      );
      if (existing) {
        existing.status = 'PRESENT';
        existing.method = 'ADMIN_ADJUSTMENT';
      } else {
        this.attendanceRecords.push({
          id: `rec_adj_${Date.now()}`,
          sessionId: correction.sessionId,
          studentId: correction.studentId,
          status: 'PRESENT',
          method: 'ADMIN_ADJUSTMENT',
          recordedBy: params.reviewerId,
          isFlaggedSuspicious: false,
          recordedAt: new Date().toISOString(),
        });
      }
    }

    this.logAudit({
      actorId: params.reviewerId,
      action: `CORRECTION_${params.status}`,
      entityType: 'attendance_corrections',
      entityId: correction.id,
      details: { notes: params.reviewNotes },
    });

    return correction;
  }

  // ==========================================
  // SYLLABUS & MATERIALS
  // ==========================================
  getSyllabusForCourse(courseId: string): SyllabusTopic[] {
    return this.syllabusTopics.filter((s) => s.courseId === courseId);
  }

  toggleSyllabusTopic(topicId: string, isCompleted: boolean, actorId: string): SyllabusTopic {
    const topic = this.syllabusTopics.find((t) => t.id === topicId);
    if (!topic) throw new Error('Topic not found');
    topic.isCompleted = isCompleted;

    this.logAudit({
      actorId,
      action: 'UPDATE_SYLLABUS_PROGRESS',
      entityType: 'syllabus_topics',
      entityId: topicId,
      details: { isCompleted },
    });

    return topic;
  }

  getMaterialsForOffering(courseOfferingId: string): CourseMaterial[] {
    return this.materials.filter((m) => m.courseOfferingId === courseOfferingId);
  }

  // ==========================================
  // STAFF PRESENCE & LEAVE
  // ==========================================
  getStaffAttendanceList(): StaffAttendance[] {
    return [...this.staffAttendance];
  }

  staffCheckIn(staffId: string, lat?: number, lng?: number): StaffAttendance {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.staffAttendance.find((sa) => sa.staffId === staffId && sa.date === today);
    if (existing && existing.checkIn) {
      return existing;
    }

    const checkInTime = new Date().toISOString();
    const record: StaffAttendance = {
      id: `sa_${Date.now()}`,
      staffId,
      date: today,
      checkIn: checkInTime,
      status: 'PRESENT',
      latitude: lat,
      longitude: lng,
    };

    this.staffAttendance.unshift(record);

    this.logAudit({
      actorId: staffId,
      action: 'STAFF_CHECK_IN',
      entityType: 'staff_attendance',
      entityId: record.id,
      details: { date: today, time: checkInTime },
    });

    return record;
  }

  staffCheckOut(staffId: string): StaffAttendance {
    const today = new Date().toISOString().split('T')[0];
    const record = this.staffAttendance.find((sa) => sa.staffId === staffId && sa.date === today);
    if (!record) {
      throw new Error('Cannot check out without checking in first.');
    }

    record.checkOut = new Date().toISOString();
    if (record.checkIn) {
      const minutes = Math.round(
        (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / 60000
      );
      record.workingMinutes = minutes;
    }

    this.logAudit({
      actorId: staffId,
      action: 'STAFF_CHECK_OUT',
      entityType: 'staff_attendance',
      entityId: record.id,
      details: { workingMinutes: record.workingMinutes },
    });

    return record;
  }

  // ==========================================
  // AUDIT & SETTINGS
  // ==========================================
  logAudit(params: {
    actorId?: string;
    actorName?: string;
    actorRole?: UserRole;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, unknown>;
  }): AuditLog {
    let actorName = params.actorName;
    let actorRole = params.actorRole;

    if (params.actorId && (!actorName || !actorRole)) {
      const p = this.getProfileById(params.actorId);
      if (p) {
        actorName = `${p.firstName} ${p.lastName}`;
        actorRole = p.primaryRole;
      }
    }

    const entry: AuditLog = {
      id: `audit_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      actorId: params.actorId,
      actorName: actorName || 'System',
      actorRole: actorRole || 'SUPER_ADMIN',
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      createdAt: new Date().toISOString(),
    };

    this.auditLogs.unshift(entry);
    return entry;
  }

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  getSystemSettings(): SystemSettings {
    return { ...this.systemSettings };
  }

  updateSystemSettings(settings: Partial<SystemSettings>, actorId: string): SystemSettings {
    this.systemSettings = { ...this.systemSettings, ...settings };
    this.logAudit({
      actorId,
      action: 'UPDATE_SYSTEM_SETTINGS',
      entityType: 'system_settings',
      details: settings,
    });
    return this.systemSettings;
  }

  // ==========================================
  // OPTION B: ANTI-FRAUD & DEVICE COLLISION ALERTS
  // ==========================================
  getDeviceCollisionAlerts(sessionId?: string): DeviceCollisionAlert[] {
    if (sessionId) {
      return this.deviceCollisionAlerts.filter((a) => a.sessionId === sessionId);
    }
    return [...this.deviceCollisionAlerts];
  }

  resolveDeviceCollisionAlert(
    alertId: string,
    reviewerId: string,
    action: 'CLEARED' | 'FLAGGED_DISCIPLINARY'
  ): DeviceCollisionAlert {
    const alert = this.deviceCollisionAlerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    alert.isReviewed = true;
    alert.reviewedBy = reviewerId;
    alert.actionTaken = action;

    this.logAudit({
      actorId: reviewerId,
      action: `DEVICE_ALERT_${action}`,
      entityType: 'device_collision_alerts',
      entityId: alert.id,
      details: { matchedMatrics: alert.matchedMatricNumbers, action },
    });

    return alert;
  }

  // ==========================================
  // OPTION C: CENTRALIZED UNIVERSITY CLINIC MEDICAL WAIVERS
  // ==========================================
  getMedicalWaivers(): (MedicalWaiver & { student?: Student & { profile?: UserProfile } })[] {
    return this.medicalWaivers.map((w) => ({
      ...w,
      student: this.getStudentById(w.studentId),
    }));
  }

  submitMedicalWaiver(params: {
    studentId: string;
    startDate: string;
    endDate: string;
    hospitalName: string;
    diagnosisSummary: string;
    doctorName: string;
    doctorLicenseNo: string;
    approvedBy: string;
  }): MedicalWaiver {
    const newWaiver: MedicalWaiver = {
      id: `waiver_${Date.now()}`,
      studentId: params.studentId,
      startDate: params.startDate,
      endDate: params.endDate,
      hospitalName: params.hospitalName,
      diagnosisSummary: params.diagnosisSummary,
      doctorName: params.doctorName,
      doctorLicenseNo: params.doctorLicenseNo,
      approvedBy: params.approvedBy,
      status: 'APPROVED', // Clinic direct issue
      createdAt: new Date().toISOString(),
    };

    this.medicalWaivers.unshift(newWaiver);

    // Automatically mark all attendance sessions in date range as EXCUSED across ALL enrolled courses
    const student = this.getStudentById(params.studentId);
    const start = new Date(params.startDate).getTime();
    const end = new Date(params.endDate).getTime();

    this.sessions.forEach((sess) => {
      const sessDate = new Date(sess.date).getTime();
      if (sessDate >= start && sessDate <= end) {
        const existingRecord = this.attendanceRecords.find(
          (r) => r.sessionId === sess.id && r.studentId === params.studentId
        );
        if (existingRecord) {
          existingRecord.status = 'EXCUSED';
          existingRecord.method = 'ADMIN_ADJUSTMENT';
        } else {
          // If absent during hospital admission, convert to excused
          this.attendanceRecords.push({
            id: `rec_exc_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            sessionId: sess.id,
            studentId: params.studentId,
            status: 'EXCUSED',
            method: 'ADMIN_ADJUSTMENT',
            recordedBy: params.approvedBy,
            isFlaggedSuspicious: false,
            recordedAt: new Date().toISOString(),
          });
        }
      }
    });

    // Notify student
    if (student?.profileId) {
      this.sendAppNotification({
        userId: student.profileId,
        title: 'Official Medical Waiver Approved',
        message: `Your medical waiver from ${params.startDate} to ${params.endDate} has been applied. Missed classes marked as EXCUSED.`,
        type: 'WAIVER',
        isRead: false,
        link: '/student',
      });
    }

    this.logAudit({
      actorId: params.approvedBy,
      action: 'APPROVE_MEDICAL_WAIVER',
      entityType: 'medical_waivers',
      entityId: newWaiver.id,
      details: { studentId: params.studentId, startDate: params.startDate, endDate: params.endDate },
    });

    return newWaiver;
  }

  // ==========================================
  // OPTION D: IN-APP NOTIFICATIONS & FORECAST CALCULATOR
  // ==========================================
  getNotificationsForUser(userId: string): AppNotification[] {
    return this.notifications.filter((n) => n.userId === userId);
  }

  markNotificationAsRead(notificationId: string): void {
    const n = this.notifications.find((notif) => notif.id === notificationId);
    if (n) n.isRead = true;
  }

  sendAppNotification(
    notification: Omit<AppNotification, 'id' | 'createdAt'>
  ): AppNotification {
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ...notification,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(newNotif);
    return newNotif;
  }

  calculateAttendanceForecast(params: {
    currentAttended: number;
    currentAbsent: number;
    remainingLectures: number;
    projectedAttended: number;
  }): {
    projectedTotalSessions: number;
    projectedTotalAttended: number;
    projectedPercentage: number;
    isEligible: boolean;
    deficit: number;
  } {
    const projectedTotalAttended = params.currentAttended + params.projectedAttended;
    const projectedTotalSessions = params.currentAttended + params.currentAbsent + params.remainingLectures;
    const projectedPercentage =
      projectedTotalSessions > 0
        ? Math.round((projectedTotalAttended / projectedTotalSessions) * 1000) / 10
        : 100;

    const threshold = this.systemSettings.examEligibilityThreshold || 75;
    const isEligible = projectedPercentage >= threshold;
    const minimumNeededForThreshold = Math.ceil(
      (threshold / 100) * projectedTotalSessions - params.currentAttended
    );
    const deficit = Math.max(0, minimumNeededForThreshold - params.projectedAttended);

    return {
      projectedTotalSessions,
      projectedTotalAttended,
      projectedPercentage,
      isEligible,
      deficit,
    };
  }

  // ==========================================
  // OPTION A: OFFICIAL EXAM CLEARANCE DOCKET / HALL PASS GENERATOR
  // ==========================================
  generateExamDocket(studentId: string): ExamDocket {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Student not found');
    const profile = student.profile;
    const program = this.programs.find((p) => p.id === student.programId);
    const department = this.departments.find((d) => d.id === program?.departmentId);
    const faculty = this.faculties.find((f) => f.id === department?.facultyId);

    const enrolledOfferings = this.getStudentOfferings(student.id);
    const studentRecords = this.getRecordsForStudent(student.id);
    const threshold = this.systemSettings.examEligibilityThreshold || 75;

    const docketCourses: ExamDocketCourse[] = enrolledOfferings.map((off) => {
      const course = off.course;
      const courseSessions = this.sessions.filter(
        (s) => s.courseOfferingId === off.id && (s.status === 'CLOSED' || s.status === 'FINALIZED' || s.status === 'ACTIVE')
      );
      const totalSessionsHeld = Math.max(courseSessions.length, 3); // realistic minimum

      const attendedSessions = studentRecords.filter(
        (r) =>
          courseSessions.some((cs) => cs.id === r.sessionId) &&
          (r.status === 'PRESENT' || r.status === 'LATE')
      ).length;

      const excusedSessions = studentRecords.filter(
        (r) =>
          courseSessions.some((cs) => cs.id === r.sessionId) && r.status === 'EXCUSED'
      ).length;

      const eligibleDenominator = Math.max(1, totalSessionsHeld - excusedSessions);
      const rawPct = (attendedSessions / eligibleDenominator) * 100;
      const attendancePercentage = Math.round(rawPct * 10) / 10;
      const isEligible = attendancePercentage >= threshold;

      let statusText: 'CLEARED' | 'BARRED - DEFICIENT' | 'APPROVED WAIVER' = isEligible
        ? 'CLEARED'
        : 'BARRED - DEFICIENT';
      if (excusedSessions > 0 && attendancePercentage >= threshold) {
        statusText = 'APPROVED WAIVER';
      }

      return {
        courseCode: course?.code || 'CSC',
        courseTitle: course?.title || 'Course',
        creditUnits: course?.creditUnits || 2,
        totalSessionsHeld,
        attendedSessions,
        excusedSessions,
        attendancePercentage,
        isEligible,
        statusText,
      };
    });

    const overallEligible = docketCourses.every((c) => c.isEligible);
    const verificationToken = `CUSTECH-DOCKET-${student.matricNumber.replace(/[^A-Z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`;

    return {
      docketNumber: `CUSTECH/EXAM/2026/${Math.floor(100000 + Math.random() * 900000)}`,
      academicSession: '2026/2027',
      semester: 'FIRST SEMESTER',
      studentName: `${profile?.firstName} ${profile?.lastName}`,
      matricNumber: student.matricNumber,
      facultyName: faculty?.name || 'Faculty of Computing and Mathematical Sciences',
      departmentName: department?.name || 'Computer Science',
      level: student.currentLevel,
      isDirectEntry: false,
      generatedAt: new Date().toISOString(),
      courses: docketCourses,
      overallEligible,
      verificationToken,
    };
  }

  getFaculties(): Faculty[] {
    return [...this.faculties];
  }

  getDepartments(): Department[] {
    return [...this.departments];
  }
}

// Global Singleton Database Instance
export const custechDb = new CustechDatabase();
