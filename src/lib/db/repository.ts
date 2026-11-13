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
  BiometricFaceProfile,
  FaceVerificationSubmission,
  SessionLiveDescriptor,
  CourseRegistrationRequest,
  CourseRegistrationStatus,
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
import {
  computeEuclideanDistance,
  distanceToConfidencePercent,
  isValidFaceDescriptor,
  DEFAULT_FACIAL_MATCH_THRESHOLD,
  DUPLICATE_FACE_COLLISION_THRESHOLD,
} from '../biometrics';
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
  private faceProfiles: BiometricFaceProfile[] = [];
  private sessionLiveDescriptors: SessionLiveDescriptor[] = [];
  private departmentCurricula: Record<string, string[]> = {};
  private courseRegistrationRequests: CourseRegistrationRequest[] = [];
  private lastLoadedMtime = 0;

  constructor() {
    this.loadPersistentData();
    this.expireStaleSessions();
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

  ensureFreshData(): void {
    if (typeof window !== 'undefined') return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require('fs');
      const storeFile = this.getStorageFilePath();
      if (storeFile && fs.existsSync(storeFile)) {
        const stat = fs.statSync(storeFile);
        if (stat.mtimeMs > this.lastLoadedMtime) {
          this.loadPersistentData();
        }
      }
    } catch (err) {
      console.warn('Could not check fresh data timestamp:', err);
    }
  }

  private applyPersistedPayload(parsed: Record<string, unknown>): void {
    const mergeById = <T extends { id: string }>(target: T[], items: unknown, prepend = false) => {
      if (!Array.isArray(items)) return;
      (items as T[]).forEach((item) => {
        const idx = target.findIndex((existing) => existing.id === item.id);
        if (idx >= 0) target[idx] = item;
        else if (prepend) target.unshift(item);
        else target.push(item);
      });
    };

    if (Array.isArray(parsed.profiles)) {
      this.profiles = [...initialProfiles];
      mergeById(this.profiles, parsed.profiles, true);
    } else {
      mergeById(this.profiles, parsed.customProfiles, true);
    }

    if (Array.isArray(parsed.students)) {
      this.students = [...initialStudents];
      mergeById(this.students, parsed.students, true);
    } else {
      mergeById(this.students, parsed.customStudents, true);
    }

    // Always ensure all students have their profile properly linked
    this.students.forEach((s) => {
      if (!s.profile || !s.profile.id) {
        s.profile = this.getProfileById(s.profileId);
      }
    });

    if (Array.isArray(parsed.enrollments)) this.enrollments = parsed.enrollments as Enrollment[];
    else mergeById(this.enrollments, parsed.customEnrollments);

    const mergeOfficialCatalog = <T extends { id: string }>(official: T[], persisted: unknown) => {
      if (!Array.isArray(persisted)) return;
      (persisted as T[]).forEach((item) => {
        const idx = official.findIndex((o) => o.id === item.id);
        if (idx >= 0) {
          // Keep official initial structure intact unless adding custom properties
          official[idx] = { ...item, ...official[idx] };
        } else {
          official.push(item);
        }
      });
    };

    if (Array.isArray(parsed.faculties)) {
      this.faculties = [...initialFaculties];
      mergeOfficialCatalog(this.faculties, parsed.faculties);
    }

    const persistedDepts = Array.isArray(parsed.departments)
      ? (parsed.departments as Department[])
      : Array.isArray(parsed.customDepartments)
      ? (parsed.customDepartments as Department[])
      : [];
    persistedDepts.forEach((d) => {
      const byIdIdx = this.departments.findIndex((ed) => ed.id === d.id);
      const byName = this.departments.find((ed) => ed.name.toLowerCase() === d.name.toLowerCase());
      if (byIdIdx >= 0) {
        // Retain official faculty mapping if official exists
        return;
      } else if (!byName) {
        this.departments.push(d);
      }
    });

    if (Array.isArray(parsed.courses)) {
      this.courses = (parsed.courses as Course[]).map((c) => ({
        ...c,
        departmentId: c.departmentId === 'dept-se' ? 'dept-sen' : c.departmentId,
        semesterType: c.semesterType || 'FIRST',
        academicSessionId: c.academicSessionId || 'session-2026',
      }));
      // Ensure any newly seeded university courses are available
      initialCourses.forEach((ic) => {
        if (!this.courses.some((c) => c.id === ic.id || c.code.toUpperCase() === ic.code.toUpperCase())) {
          this.courses.push(ic);
        }
      });
    } else {
      mergeById(this.courses, parsed.customCourses, true);
    }

    if (Array.isArray(parsed.courseOfferings)) {
      this.courseOfferings = (parsed.courseOfferings as CourseOffering[]).map((o) => ({
        ...o,
        semesterId:
          !o.semesterId || o.semesterId === 'sem-2026-first' ? 'sem-2026-1' : o.semesterId,
        academicSessionId:
          !o.academicSessionId || o.academicSessionId === 'sess-2026-first'
            ? 'session-2026'
            : o.academicSessionId,
        primaryLecturerId:
          o.primaryLecturerId === 'user-lec-csc1' ? '' : o.primaryLecturerId,
      }));
      initialCourseOfferings.forEach((io) => {
        if (!this.courseOfferings.some((o) => o.id === io.id || o.courseId === io.courseId)) {
          this.courseOfferings.push(io);
        }
      });
    } else {
      mergeById(this.courseOfferings, parsed.customCourseOfferings);
    }

    if (Array.isArray(parsed.timetables)) this.timetables = parsed.timetables as TimetableEntry[];
    else mergeById(this.timetables, parsed.customTimetables);

    if (Array.isArray(parsed.sessions)) this.sessions = parsed.sessions as AttendanceSession[];
    else mergeById(this.sessions, parsed.customSessions, true);

    if (Array.isArray(parsed.attendanceRecords)) this.attendanceRecords = parsed.attendanceRecords as AttendanceRecord[];
    else mergeById(this.attendanceRecords, parsed.customAttendanceRecords);

    if (Array.isArray(parsed.corrections)) this.corrections = parsed.corrections as AttendanceCorrection[];
    if (Array.isArray(parsed.syllabusTopics)) this.syllabusTopics = parsed.syllabusTopics as SyllabusTopic[];
    if (Array.isArray(parsed.staffAttendance)) this.staffAttendance = parsed.staffAttendance as StaffAttendance[];
    if (Array.isArray(parsed.medicalWaivers)) this.medicalWaivers = parsed.medicalWaivers as MedicalWaiver[];
    if (Array.isArray(parsed.notifications)) this.notifications = parsed.notifications as AppNotification[];
    if (Array.isArray(parsed.courseReps)) this.courseReps = parsed.courseReps as typeof this.courseReps;

    if (Array.isArray(parsed.deviceCollisionAlerts)) {
      this.deviceCollisionAlerts = parsed.deviceCollisionAlerts as DeviceCollisionAlert[];
    } else {
      mergeById(this.deviceCollisionAlerts, parsed.customDeviceCollisionAlerts, true);
    }

    if (parsed.systemSettings && typeof parsed.systemSettings === 'object') {
      this.systemSettings = { ...this.systemSettings, ...(parsed.systemSettings as Partial<SystemSettings>) };
    }

    if (Array.isArray(parsed.faceProfiles)) {
      (parsed.faceProfiles as BiometricFaceProfile[]).forEach((fp) => {
        const existingIdx = this.faceProfiles.findIndex((ef) => ef.studentId === fp.studentId);
        if (existingIdx >= 0) this.faceProfiles[existingIdx] = fp;
        else this.faceProfiles.push(fp);
      });
    }

    if (Array.isArray(parsed.sessionLiveDescriptors)) {
      (parsed.sessionLiveDescriptors as SessionLiveDescriptor[]).forEach((sd) => {
        if (!this.sessionLiveDescriptors.some((es) => es.sessionId === sd.sessionId && es.studentId === sd.studentId)) {
          this.sessionLiveDescriptors.push(sd);
        }
      });
    }

    if (Array.isArray(parsed.auditLogs)) {
      mergeById(this.auditLogs, parsed.auditLogs, true);
    }

    if (parsed.departmentCurricula && typeof parsed.departmentCurricula === 'object' && !Array.isArray(parsed.departmentCurricula)) {
      this.departmentCurricula = { ...(parsed.departmentCurricula as Record<string, string[]>) };
    }

    if (Array.isArray(parsed.courseRegistrationRequests)) {
      this.courseRegistrationRequests = parsed.courseRegistrationRequests as CourseRegistrationRequest[];
    }

    this.expireStaleSessions();
  }

  private loadPersistentData(): void {
    // 1. Client-side browser persistence
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('custech_persisted_store_v1');
        if (raw) {
          this.applyPersistedPayload(JSON.parse(raw));
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
        const stat = fs.statSync(storeFile);
        this.lastLoadedMtime = stat.mtimeMs;
        const fileContent = fs.readFileSync(storeFile, 'utf8');
        this.applyPersistedPayload(JSON.parse(fileContent));
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
    const initialCourseIds = new Set(initialCourses.map((c) => c.id));
    const initialOfferingIds = new Set(initialCourseOfferings.map((o) => o.id));
    const initialTimetableIds = new Set(initialTimetable.map((t) => t.id));
    const initialRecordIds = new Set(initialAttendanceRecords.map((r) => r.id));

    const payload = {
      // Full authoritative collections (preserves edits & deletions on all records)
      profiles: this.profiles,
      students: this.students,
      enrollments: this.enrollments,
      departments: this.departments,
      faculties: this.faculties,
      courses: this.courses,
      courseOfferings: this.courseOfferings,
      timetables: this.timetables,
      sessions: this.sessions,
      attendanceRecords: this.attendanceRecords,
      corrections: this.corrections,
      syllabusTopics: this.syllabusTopics,
      staffAttendance: this.staffAttendance,
      medicalWaivers: this.medicalWaivers,
      notifications: this.notifications,
      courseReps: this.courseReps,
      deviceCollisionAlerts: this.deviceCollisionAlerts,
      departmentCurricula: this.departmentCurricula,
      courseRegistrationRequests: this.courseRegistrationRequests,
      // Legacy custom* keys retained for backward compatibility with older scripts
      customProfiles: this.profiles.filter((p) => !initialProfileIds.has(p.id)),
      customStudents: this.students.filter((s) => !initialStudentIds.has(s.id)),
      customEnrollments: this.enrollments.filter((e) => !initialEnrollmentIds.has(e.id)),
      customDepartments: this.departments.filter((d) => !initialDeptIds.has(d.id)),
      customCourses: this.courses.filter((c) => !initialCourseIds.has(c.id)),
      customCourseOfferings: this.courseOfferings.filter((o) => !initialOfferingIds.has(o.id)),
      customTimetables: this.timetables.filter((t) => !initialTimetableIds.has(t.id)),
      customSessions: this.sessions,
      customAttendanceRecords: this.attendanceRecords.filter((r) => !initialRecordIds.has(r.id)),
      customDeviceCollisionAlerts: this.deviceCollisionAlerts,
      faceProfiles: this.faceProfiles,
      sessionLiveDescriptors: this.sessionLiveDescriptors.slice(-500),
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
        try {
          this.lastLoadedMtime = fs.statSync(storeFile).mtimeMs;
        } catch {}
      }
    } catch (err) {
      console.warn('Could not save to filesystem:', err);
    }
  }

  // ==========================================
  // PROFILES & ROLES
  // ==========================================
  getProfiles(): UserProfile[] {
    this.ensureFreshData();
    return [...this.profiles];
  }

  getProfileById(id: string): UserProfile | undefined {
    this.ensureFreshData();
    return this.profiles.find((p) => p.id === id);
  }

  getProfileByEmail(email: string): UserProfile | undefined {
    this.ensureFreshData();
    return this.profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
  }

  // ==========================================
  // STUDENTS & REPS
  // ==========================================
  getStudentByProfileId(profileId: string): (Student & { profile?: UserProfile }) | undefined {
    this.ensureFreshData();
    const student = this.students.find((s) => s.profileId === profileId);
    if (!student) return undefined;
    const profile = this.getProfileById(student.profileId);
    return { ...student, profile };
  }

  getStudentByMatric(matric: string): (Student & { profile?: UserProfile }) | undefined {
    this.ensureFreshData();
    const normalized = matric.trim().toUpperCase();
    const student = this.students.find((s) => s.matricNumber.toUpperCase() === normalized);
    if (!student) return undefined;
    const profile = this.getProfileById(student.profileId);
    return { ...student, profile };
  }

  getStudentById(id: string): (Student & { profile?: UserProfile }) | undefined {
    this.ensureFreshData();
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
    facultyId?: string;
    departmentName?: string;
    departmentId?: string;
    programId?: string;
    currentLevel?: 100 | 200 | 300 | 400 | 500;
    pin?: string;
    enrollInCourses?: boolean;
    actorId?: string;
  }): { student: Student; profile: UserProfile } {
    this.ensureFreshData();
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
    const facultyId = params.facultyId || dept.facultyId || 'fac-comp';
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

    const matchedProgram = this.programs.find((p) => p.departmentId === deptId);
    const newStudent: Student = {
      id: studentId,
      profileId: profileId,
      matricNumber: cleanMatric,
      programId: params.programId || matchedProgram?.id || 'prog-csc',
      currentLevel: level,
      attendancePinHash: pinHash,
      profile: newProfile,
    };

    this.profiles.unshift(newProfile);
    this.students.unshift(newStudent);

    // Auto-enroll ONLY in active courses matching BOTH the student's department AND academic level
    if (params.enrollInCourses !== false) {
      const currentSem = this.getCurrentSemester();
      const curatedIds = new Set([
        ...(this.departmentCurricula[`${deptId}:${level}`] || []),
        ...(this.departmentCurricula[`${deptId}:ALL`] || []),
      ]);
      const targetOfferings = this.courseOfferings.filter((co) => {
        const c = this.courses.find((course) => course.id === co.courseId);
        if (!c || c.isActive === false) return false;
        const semMatch = !currentSem || !co.semesterId || co.semesterId === currentSem.id;
        if (curatedIds.has(c.id) && semMatch) return true;
        const deptMatch = c.departmentId === deptId;
        const levelMatch = c.level === level;
        return deptMatch && levelMatch && semMatch;
      });

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

  updateStudent(
    studentId: string,
    params: {
      firstName?: string;
      lastName?: string;
      matricNumber?: string;
      departmentName?: string;
      facultyId?: string;
      currentLevel?: 100 | 200 | 300 | 400 | 500;
      email?: string;
      isActive?: boolean;
    },
    actorId: string
  ): { student: Student; profile: UserProfile } {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) throw new Error('Student record not found.');
    const profile = this.profiles.find((p) => p.id === student.profileId);
    if (!profile) throw new Error('Student profile not found.');

    if (params.matricNumber) {
      const cleanMatric = params.matricNumber.trim().toUpperCase();
      if (
        cleanMatric !== student.matricNumber.toUpperCase() &&
        this.students.some((s) => s.id !== studentId && s.matricNumber.toUpperCase() === cleanMatric)
      ) {
        throw new Error(`Matriculation number "${cleanMatric}" is already assigned to another student.`);
      }
      student.matricNumber = cleanMatric;
      profile.matricNumber = cleanMatric;
    }

    if (params.firstName?.trim()) {
      profile.firstName = params.firstName.trim();
    }
    if (params.lastName?.trim()) {
      profile.lastName = params.lastName.trim();
    }
    if (params.email?.trim()) {
      profile.email = params.email.trim().toLowerCase();
    }
    if (params.currentLevel) {
      student.currentLevel = params.currentLevel;
    }
    if (typeof params.isActive === 'boolean') {
      profile.isActive = params.isActive;
    }

    if (params.departmentName?.trim()) {
      const typedDept = params.departmentName.trim();
      let dept = this.departments.find(
        (d) =>
          d.id.toLowerCase() === typedDept.toLowerCase() ||
          d.name.toLowerCase() === typedDept.toLowerCase() ||
          d.code.toLowerCase() === typedDept.toLowerCase()
      );
      if (!dept) {
        const code = typedDept.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 4) || 'DEPT';
        const targetFacId = params.facultyId || profile.facultyId || 'fac-comp';
        dept = {
          id: `dept-${typedDept.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          facultyId: targetFacId,
          code,
          name: typedDept,
        };
        this.departments.push(dept);
      }
      profile.departmentId = dept.id;
      profile.facultyId = params.facultyId || dept.facultyId || 'fac-comp';
    } else if (params.facultyId) {
      profile.facultyId = params.facultyId;
    }

    student.profile = profile;

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_UPDATED_STUDENT',
      entityType: 'students',
      entityId: studentId,
      details: {
        matricNumber: student.matricNumber,
        name: `${profile.firstName} ${profile.lastName}`,
        departmentId: profile.departmentId,
        level: student.currentLevel,
        isActive: profile.isActive,
      },
    });

    this.savePersistentData();
    return { student, profile };
  }

  toggleStudentActiveStatus(
    studentId: string,
    isActive: boolean,
    actorId: string
  ): { student: Student; profile: UserProfile } {
    const student = this.students.find((s) => s.id === studentId);
    if (!student) throw new Error('Student record not found.');
    const profile = this.profiles.find((p) => p.id === student.profileId);
    if (!profile) throw new Error('Student profile not found.');

    profile.isActive = isActive;
    student.profile = profile;

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: isActive ? 'ADMIN_REACTIVATED_STUDENT' : 'ADMIN_DEACTIVATED_STUDENT',
      entityType: 'students',
      entityId: studentId,
      details: {
        matricNumber: student.matricNumber,
        isActive,
      },
    });

    this.savePersistentData();
    return { student, profile };
  }

  assignUserRole(
    userId: string,
    newRole: UserRole,
    actorId: string
  ): UserProfile {
    const actor = this.getProfileById(actorId);
    if (actor && actor.primaryRole !== 'SUPER_ADMIN') {
      throw new Error('Unauthorized: Only ICT Administrators can assign roles.');
    }
    if (userId === actorId && newRole !== 'SUPER_ADMIN') {
      throw new Error('Action blocked: Administrators cannot revoke their own Super Admin privileges.');
    }

    const profile = this.profiles.find((p) => p.id === userId);
    if (!profile) throw new Error(`User profile "${userId}" not found.`);

    const oldRole = profile.primaryRole;
    profile.primaryRole = newRole;
    if (!profile.assignedRoles.includes(newRole)) {
      profile.assignedRoles.push(newRole);
    }

    // Role-specific linking
    if (newRole === 'COURSE_REP' || newRole === 'ASSISTANT_COURSE_REP') {
      const student = this.students.find((s) => s.profileId === userId);
      if (student) {
        const existingRep = this.courseReps.find((r) => r.studentId === student.id);
        if (!existingRep) {
          this.courseReps.push({
            id: `rep_${Date.now()}`,
            courseOfferingId: 'offering-csc201',
            studentId: student.id,
            canOperateKiosk: true,
            appointedAt: new Date().toISOString(),
          });
        }
      }
    } else if (newRole === 'HOD') {
      const dept = this.departments.find((d) => d.id === profile.departmentId);
      if (dept) {
        dept.hodId = userId;
      }
    } else if (newRole === 'DEAN' || newRole === 'FACULTY_REP') {
      const fac = this.faculties.find((f) => f.id === profile.facultyId);
      if (fac) {
        fac.deanId = userId;
      }
    }

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_ASSIGNED_ROLE',
      entityType: 'user_profiles',
      entityId: userId,
      details: {
        userName: `${profile.firstName} ${profile.lastName}`,
        email: profile.email,
        oldRole,
        newRole,
      },
    });

    this.savePersistentData();
    return profile;
  }

  bulkRegisterStudents(
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
  ): {
    successful: number;
    skipped: number;
    failed: number;
    errors: Array<{ matricNumber: string; error: string }>;
    importedMatrics: string[];
  } {
    let successful = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ matricNumber: string; error: string }> = [];
    const importedMatrics: string[] = [];
    const seenBatchMatrics = new Set<string>();

    for (const record of records) {
      const cleanMatric = record.matricNumber?.trim().toUpperCase();
      if (!cleanMatric) {
        failed++;
        errors.push({ matricNumber: 'UNKNOWN', error: 'Missing matriculation number.' });
        continue;
      }

      if (seenBatchMatrics.has(cleanMatric)) {
        skipped++;
        errors.push({ matricNumber: cleanMatric, error: 'Duplicate entry in uploaded batch.' });
        continue;
      }
      seenBatchMatrics.add(cleanMatric);

      if (!record.firstName?.trim() || !record.lastName?.trim()) {
        failed++;
        errors.push({ matricNumber: cleanMatric, error: 'Student full name is incomplete.' });
        continue;
      }

      if (this.students.some((s) => s.matricNumber.toUpperCase() === cleanMatric)) {
        skipped++;
        errors.push({ matricNumber: cleanMatric, error: 'Already registered in university database.' });
        continue;
      }

      try {
        this.registerStudent({
          firstName: record.firstName.trim(),
          lastName: record.lastName.trim(),
          matricNumber: cleanMatric,
          email: record.email?.trim() || undefined,
          departmentName: record.departmentName?.trim() || 'Computer Science',
          facultyId: record.facultyId || undefined,
          currentLevel: record.currentLevel || 200,
          pin: record.pin || '1234',
          enrollInCourses: true,
          actorId,
        });
        successful++;
        importedMatrics.push(cleanMatric);
      } catch (err: unknown) {
        failed++;
        errors.push({
          matricNumber: cleanMatric,
          error: err instanceof Error ? err.message : 'Unknown registration error',
        });
      }
    }

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_BULK_STUDENT_IMPORT',
      entityType: 'students',
      details: {
        totalProcessed: records.length,
        successful,
        skipped,
        failed,
      },
    });

    this.savePersistentData();
    return { successful, skipped, failed, errors, importedMatrics };
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
    this.ensureFreshData();
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

  syncClientProfileAndStudent(profile: UserProfile, student?: Student): void {
    const profIdx = this.profiles.findIndex((p) => {
      if (p.id === profile.id) return true;
      if (profile.matricNumber && p.matricNumber && p.matricNumber.toUpperCase() === profile.matricNumber.toUpperCase()) return true;
      if (profile.email && p.email && p.email.toLowerCase() === profile.email.toLowerCase()) return true;
      if (profile.staffId && p.staffId && p.staffId.toLowerCase() === profile.staffId.toLowerCase()) return true;
      return false;
    });
    if (profIdx >= 0) {
      this.profiles[profIdx] = { ...this.profiles[profIdx], ...profile };
    } else {
      this.profiles.unshift(profile);
    }

    if (student) {
      const stuIdx = this.students.findIndex((s) => {
        if (s.id === student.id) return true;
        if (s.profileId === profile.id) return true;
        if (student.matricNumber && s.matricNumber && s.matricNumber.toUpperCase() === student.matricNumber.toUpperCase()) return true;
        return false;
      });
      const resolvedStudent = { ...student, profile: this.profiles[profIdx >= 0 ? profIdx : 0] || profile };
      if (stuIdx >= 0) {
        this.students[stuIdx] = { ...this.students[stuIdx], ...resolvedStudent };
      } else {
        this.students.unshift(resolvedStudent);
      }
    }
    this.savePersistentData();
  }

  private sanitizeStudents(students: ReturnType<CustechDatabase['getAllStudentsDetailed']>) {
    return students.map((s) => ({
      ...s,
      attendancePinHash: '',
    }));
  }

  private sanitizeSessions(sessions: AttendanceSession[]) {
    return sessions.map((s) => ({
      ...s,
      sessionSecretNonce: '',
    }));
  }

  getFullSnapshot() {
    return {
      profiles: this.profiles,
      students: this.sanitizeStudents(this.getAllStudentsDetailed()),
      departments: this.departments,
      faculties: this.faculties,
      academicSessions: this.academicSessions,
      semesters: this.semesters,
      courses: this.courses,
      courseOfferings: this.courseOfferings,
      timetables: this.timetables,
      enrollments: this.enrollments,
      sessions: this.sanitizeSessions(this.sessions),
      attendanceRecords: this.attendanceRecords,
      corrections: this.corrections,
      syllabusTopics: this.syllabusTopics,
      staffAttendance: this.staffAttendance,
      medicalWaivers: this.medicalWaivers,
      notifications: this.notifications,
      courseReps: this.courseReps,
      deviceCollisionAlerts: this.deviceCollisionAlerts,
      courseRegistrationRequests: this.courseRegistrationRequests,
      systemSettings: this.systemSettings,
      auditLogs: this.auditLogs.slice(0, 100),
    };
  }

  /**
   * Role-scoped, sanitized database snapshot for client hydration.
   * Strips all password/PIN hashes and HMAC session secrets.
   * Ensures students only receive their own records and enrolled courses.
   */
  getScopedSnapshot(actor?: { user: UserProfile; activeRole: UserRole } | null) {
    if (!actor) {
      return {
        profiles: [],
        students: [],
        departments: this.departments,
        faculties: this.faculties,
        academicSessions: this.academicSessions,
        semesters: this.semesters,
        courses: [],
        courseOfferings: [],
        timetables: [],
        enrollments: [],
        sessions: [],
        attendanceRecords: [],
        corrections: [],
        syllabusTopics: [],
        staffAttendance: [],
        medicalWaivers: [],
        notifications: [],
        courseReps: [],
        deviceCollisionAlerts: [],
        courseRegistrationRequests: [],
        systemSettings: {
          ...this.systemSettings,
        },
        auditLogs: [],
      };
    }

    const { user, activeRole } = actor;

    // Pure Student scope: strictly own profile, own enrollments, own courses, own records
    if (activeRole === 'STUDENT') {
      const student = this.getStudentByProfileId(user.id);
      const studentId = student?.id || '';
      const myEnrollments = this.enrollments.filter((e) => e.studentId === studentId && e.isActive);
      const myOfferingIds = new Set(myEnrollments.map((e) => e.courseOfferingId));
      const myOfferings = this.courseOfferings.filter((o) => myOfferingIds.has(o.id));
      const myCourseIds = new Set(myOfferings.map((o) => o.courseId));
      const myLecturerIds = new Set(
        myOfferings.flatMap((o) => [o.primaryLecturerId, ...(o.assignedLecturerIds || [])]).filter(Boolean)
      );
      const mySessions = this.sessions.filter((s) => myOfferingIds.has(s.courseOfferingId));
      const mySessionIds = new Set(mySessions.map((s) => s.id));

      return {
        profiles: this.profiles.filter((p) => p.id === user.id || myLecturerIds.has(p.id)),
        students: student
          ? this.sanitizeStudents(this.getAllStudentsDetailed().filter((s) => s.id === student.id))
          : [],
        departments: this.departments,
        faculties: this.faculties,
        academicSessions: this.academicSessions,
        semesters: this.semesters,
        courses: this.courses.filter((c) => myCourseIds.has(c.id)),
        courseOfferings: myOfferings,
        timetables: this.timetables.filter((t) => myOfferingIds.has(t.courseOfferingId)),
        enrollments: myEnrollments,
        sessions: this.sanitizeSessions(mySessions),
        attendanceRecords: this.attendanceRecords.filter(
          (r) => r.studentId === studentId && mySessionIds.has(r.sessionId)
        ),
        corrections: this.corrections.filter((c) => c.studentId === studentId),
        syllabusTopics: this.syllabusTopics.filter((t) => myCourseIds.has(t.courseId)),
        staffAttendance: [],
        medicalWaivers: this.medicalWaivers.filter((w) => w.studentId === studentId),
        notifications: this.notifications.filter((n) => n.userId === user.id),
        courseReps: this.courseReps.filter((r) => r.studentId === studentId),
        deviceCollisionAlerts: [],
        courseRegistrationRequests: this.courseRegistrationRequests.filter(
          (r) => r.studentId === studentId
        ),
        systemSettings: this.systemSettings,
        auditLogs: [],
      };
    }

    // Rep student roles: classmates in their offering/department, no fraud/audit logs
    if (
      activeRole === 'COURSE_REP' ||
      activeRole === 'ASSISTANT_COURSE_REP' ||
      activeRole === 'DEPARTMENT_REP'
    ) {
      return {
        ...this.getFullSnapshot(),
        deviceCollisionAlerts: [],
        auditLogs: [],
        staffAttendance: [],
      };
    }

    // Lecturer scope: assigned offerings, enrolled students, own sessions & corrections
    if (activeRole === 'LECTURER') {
      const lecOfferings = this.getLecturerOfferings(user.id);
      const lecOfferingIds = new Set(lecOfferings.map((o) => o.id));
      const lecCourseIds = new Set(lecOfferings.map((o) => o.courseId));
      const lecSessions = this.sessions.filter(
        (s) => s.lecturerId === user.id || lecOfferingIds.has(s.courseOfferingId)
      );
      const lecSessionIds = new Set(lecSessions.map((s) => s.id));
      const lecEnrollments = this.enrollments.filter((e) => lecOfferingIds.has(e.courseOfferingId));
      const enrolledStudentIds = new Set(lecEnrollments.map((e) => e.studentId));

      return {
        profiles: this.profiles,
        students: this.sanitizeStudents(
          this.getAllStudentsDetailed().filter((s) => enrolledStudentIds.has(s.id))
        ),
        departments: this.departments,
        faculties: this.faculties,
        academicSessions: this.academicSessions,
        semesters: this.semesters,
        courses: this.courses.filter((c) => lecCourseIds.has(c.id)),
        courseOfferings: lecOfferings,
        timetables: this.timetables.filter((t) => lecOfferingIds.has(t.courseOfferingId)),
        enrollments: lecEnrollments,
        sessions: this.sanitizeSessions(lecSessions),
        attendanceRecords: this.attendanceRecords.filter((r) => lecSessionIds.has(r.sessionId)),
        corrections: this.corrections.filter((c) => lecSessionIds.has(c.sessionId)),
        syllabusTopics: this.syllabusTopics.filter((t) => lecCourseIds.has(t.courseId)),
        staffAttendance: [],
        medicalWaivers: this.medicalWaivers,
        notifications: this.notifications.filter((n) => n.userId === user.id),
        courseReps: this.courseReps,
        deviceCollisionAlerts: this.deviceCollisionAlerts.filter((a) =>
          lecSessionIds.has(a.sessionId)
        ),
        courseRegistrationRequests: [],
        systemSettings: this.systemSettings,
        auditLogs: [],
      };
    }

    // Admin, HOD, Dean, Faculty Rep, Staff
    return this.getFullSnapshot();
  }

  upsertClientSession(session: AttendanceSession): void {
    const idx = this.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      this.sessions[idx] = { ...this.sessions[idx], ...session };
    } else {
      this.sessions.unshift(session);
    }
    this.savePersistentData();
  }

  syncClientSnapshot(data: {
    profiles?: UserProfile[];
    students?: Student[];
    departments?: Department[];
    faculties?: Faculty[];
    courses?: Course[];
    courseOfferings?: CourseOffering[];
    timetables?: TimetableEntry[];
    enrollments?: Enrollment[];
    sessions?: AttendanceSession[];
    attendanceRecords?: AttendanceRecord[];
    corrections?: AttendanceCorrection[];
    syllabusTopics?: SyllabusTopic[];
    staffAttendance?: StaffAttendance[];
    medicalWaivers?: MedicalWaiver[];
    notifications?: AppNotification[];
    courseReps?: typeof initialCourseReps;
    deviceCollisionAlerts?: DeviceCollisionAlert[];
    courseRegistrationRequests?: CourseRegistrationRequest[];
    systemSettings?: SystemSettings;
    auditLogs?: AuditLog[];
  }): void {
    if (typeof window === 'undefined') return;
    if (Array.isArray(data.profiles) && data.profiles.length > 0) {
      data.profiles.forEach((p) => {
        const idx = this.profiles.findIndex((ep) => ep.id === p.id);
        if (idx >= 0) this.profiles[idx] = { ...this.profiles[idx], ...p };
        else this.profiles.push(p);
      });
    }
    if (Array.isArray(data.students) && data.students.length > 0) {
      data.students.forEach((s) => {
        const idx = this.students.findIndex(
          (es) =>
            es.id === s.id ||
            (es.matricNumber && s.matricNumber && es.matricNumber.toUpperCase() === s.matricNumber.toUpperCase())
        );
        if (idx >= 0) this.students[idx] = { ...this.students[idx], ...s };
        else this.students.push(s);
      });
    }
    if (Array.isArray(data.departments) && data.departments.length > 0) this.departments = data.departments;
    if (Array.isArray(data.faculties) && data.faculties.length > 0) this.faculties = data.faculties;
    if (Array.isArray(data.courses) && data.courses.length > 0) this.courses = data.courses;
    if (Array.isArray(data.courseOfferings) && data.courseOfferings.length > 0) this.courseOfferings = data.courseOfferings;
    if (Array.isArray(data.timetables) && data.timetables.length > 0) this.timetables = data.timetables;
    if (Array.isArray(data.enrollments) && data.enrollments.length > 0) this.enrollments = data.enrollments;
    if (Array.isArray(data.sessions) && data.sessions.length > 0) {
      data.sessions.forEach((s) => {
        const idx = this.sessions.findIndex((es) => es.id === s.id);
        if (idx >= 0) this.sessions[idx] = { ...this.sessions[idx], ...s };
        else this.sessions.push(s);
      });
    }
    if (Array.isArray(data.attendanceRecords) && data.attendanceRecords.length > 0) {
      data.attendanceRecords.forEach((r) => {
        const idx = this.attendanceRecords.findIndex((er) => er.id === r.id);
        if (idx >= 0) this.attendanceRecords[idx] = { ...this.attendanceRecords[idx], ...r };
        else this.attendanceRecords.push(r);
      });
    }
    if (Array.isArray(data.corrections) && data.corrections.length > 0) this.corrections = data.corrections;
    if (Array.isArray(data.syllabusTopics) && data.syllabusTopics.length > 0) this.syllabusTopics = data.syllabusTopics;
    if (Array.isArray(data.staffAttendance) && data.staffAttendance.length > 0) this.staffAttendance = data.staffAttendance;
    if (Array.isArray(data.medicalWaivers) && data.medicalWaivers.length > 0) this.medicalWaivers = data.medicalWaivers;
    if (Array.isArray(data.notifications) && data.notifications.length > 0) this.notifications = data.notifications;
    if (Array.isArray(data.courseReps) && data.courseReps.length > 0) this.courseReps = data.courseReps;
    if (Array.isArray(data.deviceCollisionAlerts) && data.deviceCollisionAlerts.length > 0) this.deviceCollisionAlerts = data.deviceCollisionAlerts;
    if (Array.isArray(data.courseRegistrationRequests) && data.courseRegistrationRequests.length > 0) this.courseRegistrationRequests = data.courseRegistrationRequests;
    if (data.systemSettings) this.systemSettings = { ...this.systemSettings, ...data.systemSettings };
    if (Array.isArray(data.auditLogs) && data.auditLogs.length > 0) this.auditLogs = data.auditLogs;

    this.savePersistentData();

    window.dispatchEvent(new CustomEvent('custech-db-synced'));
  }

  getEnrolledStudentsForOffering(courseOfferingId: string): (Student & { profile?: UserProfile })[] {
    const enrolledIds = this.enrollments
      .filter((e) => e.courseOfferingId === courseOfferingId && e.isActive)
      .map((e) => e.studentId);
    return this.students
      .filter((s) => enrolledIds.includes(s.id))
      .map((s) => ({ ...s, profile: this.getProfileById(s.profileId) }));
  }

  enrollStudentInCourse(studentId: string, courseOfferingId: string, _actorId?: string): Enrollment {
    const existing = this.enrollments.find(
      (e) => e.studentId === studentId && e.courseOfferingId === courseOfferingId
    );
    if (existing) {
      existing.isActive = true;
      this.savePersistentData();
      return existing;
    }
    const newEnrollment: Enrollment = {
      id: `enr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      studentId,
      courseOfferingId,
      isActive: true,
    };
    this.enrollments.push(newEnrollment);
    this.savePersistentData();
    return newEnrollment;
  }

  private ensureOfferingForCourse(courseId: string): CourseOffering | undefined {
    const existing = this.courseOfferings.find((o) => o.courseId === courseId);
    if (existing) return existing;
    const course = this.courses.find((c) => c.id === courseId);
    if (!course) return undefined;
    const currentSession = this.getCurrentAcademicSession();
    const currentSem = this.getCurrentSemester();
    const newOffering: CourseOffering = {
      id: `offering-${course.code.toLowerCase().replace(/\s+/g, '')}-${Date.now()}`,
      courseId: course.id,
      academicSessionId: course.academicSessionId || currentSession?.id || 'session-2026',
      semesterId: currentSem?.id || 'sem-2026-1',
      primaryLecturerId: '',
      assignedLecturerIds: [],
      isActive: true,
    };
    this.courseOfferings.push(newOffering);
    return newOffering;
  }

  getDepartmentCourseRegistrationSummary(
    departmentId: string,
    level: 100 | 200 | 300 | 400 | 500 | 'ALL' = 'ALL'
  ) {
    const normalizedDeptId = departmentId === 'dept-se' ? 'dept-sen' : departmentId;
    const cohortStudents = this.students
      .map((s) => ({ student: s, profile: this.getProfileById(s.profileId) }))
      .filter(({ student, profile }) => {
        if (!profile || profile.isActive === false) return false;
        const sDept = profile.departmentId === 'dept-se' ? 'dept-sen' : profile.departmentId;
        if (sDept !== normalizedDeptId) return false;
        return level === 'ALL' || student.currentLevel === level;
      });

    const cohortStudentIds = new Set(cohortStudents.map((item) => item.student.id));
    const courseEnrollmentCounts: Record<string, number> = {};

    for (const course of this.courses) {
      const offeringIds = new Set(
        this.courseOfferings.filter((o) => o.courseId === course.id).map((o) => o.id)
      );
      if (offeringIds.size === 0) {
        courseEnrollmentCounts[course.id] = 0;
        continue;
      }
      const enrolledStudentSet = new Set<string>();
      for (const enr of this.enrollments) {
        if (enr.isActive && cohortStudentIds.has(enr.studentId) && offeringIds.has(enr.courseOfferingId)) {
          enrolledStudentSet.add(enr.studentId);
        }
      }
      courseEnrollmentCounts[course.id] = enrolledStudentSet.size;
    }

    const fullyRegisteredCourseIds = Object.entries(courseEnrollmentCounts)
      .filter(([, count]) => cohortStudents.length > 0 && count === cohortStudents.length)
      .map(([courseId]) => courseId);

    const curatedCourseIds = this.departmentCurricula[`${normalizedDeptId}:${level}`] || [];

    return {
      departmentId: normalizedDeptId,
      level,
      studentsCount: cohortStudents.length,
      students: cohortStudents.map(({ student, profile }) => ({
        id: student.id,
        matricNumber: student.matricNumber,
        currentLevel: student.currentLevel,
        fullName: profile ? `${profile.firstName} ${profile.lastName}` : student.matricNumber,
      })),
      courseEnrollmentCounts,
      fullyRegisteredCourseIds,
      curatedCourseIds,
    };
  }

  registerCoursesForDepartmentCohort(params: {
    departmentId: string;
    level: 100 | 200 | 300 | 400 | 500 | 'ALL';
    courseIds: string[];
    mode?: 'ADD' | 'SYNC_EXACT';
    actorId: string;
  }): {
    studentsAffected: number;
    coursesCount: number;
    newlyEnrolled: number;
    deactivated: number;
    courseCodes: string[];
  } {
    const normalizedDeptId = params.departmentId === 'dept-se' ? 'dept-sen' : params.departmentId;
    const mode = params.mode || 'ADD';
    const uniqueCourseIds = Array.from(new Set(params.courseIds)).filter((id) =>
      this.courses.some((c) => c.id === id)
    );

    const cohortStudents = this.students.filter((s) => {
      const profile = this.getProfileById(s.profileId);
      if (!profile || profile.isActive === false) return false;
      const sDept = profile.departmentId === 'dept-se' ? 'dept-sen' : profile.departmentId;
      if (sDept !== normalizedDeptId) return false;
      return params.level === 'ALL' || s.currentLevel === params.level;
    });

    const targetOfferings = uniqueCourseIds
      .map((cid) => this.ensureOfferingForCourse(cid))
      .filter((off): off is CourseOffering => Boolean(off));
    const targetOfferingIds = new Set(targetOfferings.map((o) => o.id));

    let newlyEnrolled = 0;
    let deactivated = 0;
    const nowTs = Date.now();

    for (const stu of cohortStudents) {
      for (const off of targetOfferings) {
        const existing = this.enrollments.find(
          (e) => e.studentId === stu.id && e.courseOfferingId === off.id
        );
        if (existing) {
          if (!existing.isActive) {
            existing.isActive = true;
            newlyEnrolled++;
          }
        } else {
          this.enrollments.push({
            id: `enr_${nowTs}_${stu.id}_${off.id}_${Math.floor(Math.random() * 1000)}`,
            studentId: stu.id,
            courseOfferingId: off.id,
            isActive: true,
          });
          newlyEnrolled++;
        }
      }

      if (mode === 'SYNC_EXACT') {
        for (const enr of this.enrollments) {
          if (enr.studentId === stu.id && enr.isActive && !targetOfferingIds.has(enr.courseOfferingId)) {
            enr.isActive = false;
            deactivated++;
          }
        }
      }
    }

    const curriculumKey = `${normalizedDeptId}:${params.level}`;
    if (mode === 'SYNC_EXACT') {
      this.departmentCurricula[curriculumKey] = uniqueCourseIds;
    } else {
      const prev = this.departmentCurricula[curriculumKey] || [];
      this.departmentCurricula[curriculumKey] = Array.from(new Set([...prev, ...uniqueCourseIds]));
    }

    const courseCodes = uniqueCourseIds
      .map((cid) => this.courses.find((c) => c.id === cid)?.code)
      .filter((c): c is string => Boolean(c));

    this.logAudit({
      actorId: params.actorId,
      action: 'ADMIN_REGISTERED_DEPT_COURSES',
      entityType: 'enrollments',
      entityId: normalizedDeptId,
      details: {
        departmentId: normalizedDeptId,
        level: params.level,
        mode,
        studentsAffected: cohortStudents.length,
        coursesCount: uniqueCourseIds.length,
        newlyEnrolled,
        deactivated,
        courseCodes,
      },
    });

    this.savePersistentData();
    return {
      studentsAffected: cohortStudents.length,
      coursesCount: uniqueCourseIds.length,
      newlyEnrolled,
      deactivated,
      courseCodes,
    };
  }

  setStudentCourseRegistrations(
    studentId: string,
    courseIds: string[],
    actorId: string
  ): { studentId: string; enrolledCount: number; courseCodes: string[] } {
    const student = this.getStudentById(studentId);
    if (!student) throw new Error('Student not found');

    const uniqueCourseIds = Array.from(new Set(courseIds)).filter((id) =>
      this.courses.some((c) => c.id === id)
    );
    const targetOfferings = uniqueCourseIds
      .map((cid) => this.ensureOfferingForCourse(cid))
      .filter((off): off is CourseOffering => Boolean(off));
    const targetOfferingIds = new Set(targetOfferings.map((o) => o.id));

    for (const enr of this.enrollments) {
      if (enr.studentId === studentId && !targetOfferingIds.has(enr.courseOfferingId)) {
        enr.isActive = false;
      }
    }

    const nowTs = Date.now();
    for (const off of targetOfferings) {
      const existing = this.enrollments.find(
        (e) => e.studentId === studentId && e.courseOfferingId === off.id
      );
      if (existing) {
        existing.isActive = true;
      } else {
        this.enrollments.push({
          id: `enr_${nowTs}_${studentId}_${off.id}_${Math.floor(Math.random() * 1000)}`,
          studentId,
          courseOfferingId: off.id,
          isActive: true,
        });
      }
    }

    const courseCodes = uniqueCourseIds
      .map((cid) => this.courses.find((c) => c.id === cid)?.code)
      .filter((c): c is string => Boolean(c));

    this.logAudit({
      actorId,
      action: 'ADMIN_UPDATED_STUDENT_COURSES',
      entityType: 'enrollments',
      entityId: studentId,
      details: { matricNumber: student.matricNumber, enrolledCount: uniqueCourseIds.length, courseCodes },
    });

    this.savePersistentData();
    return { studentId, enrolledCount: uniqueCourseIds.length, courseCodes };
  }

  getCourseRegistrationRequests(filter?: {
    studentId?: string;
    departmentId?: string;
    facultyId?: string;
    status?: CourseRegistrationStatus;
  }) {
    return this.courseRegistrationRequests
      .filter((req) => {
        if (filter?.studentId && req.studentId !== filter.studentId) return false;
        if (filter?.departmentId && req.departmentId !== filter.departmentId) return false;
        if (filter?.facultyId) {
          const dept = this.departments.find((d) => d.id === req.departmentId);
          if (dept?.facultyId !== filter.facultyId) return false;
        }
        if (filter?.status && req.status !== filter.status) return false;
        return true;
      })
      .map((req) => {
        const stu = this.getStudentById(req.studentId);
        const prof = stu ? this.getProfileById(stu.profileId) : undefined;
        const dept = this.departments.find((d) => d.id === req.departmentId);
        const courses = req.courseIds
          .map((cid) => this.courses.find((c) => c.id === cid))
          .filter((c): c is Course => Boolean(c));
        return {
          ...req,
          studentName: prof ? `${prof.firstName} ${prof.lastName}` : stu?.matricNumber || 'Student',
          matricNumber: stu?.matricNumber || '',
          departmentName: dept?.name || 'Department',
          courses,
        };
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  submitStudentCourseRegistration(params: {
    studentId: string;
    courseIds: string[];
    studentNote?: string;
    actorId: string;
  }): CourseRegistrationRequest {
    const student = this.getStudentById(params.studentId);
    if (!student) throw new Error('Student record not found.');
    const profile = this.getProfileById(student.profileId);
    if (!profile) throw new Error('Student profile not found.');

    const validCourseIds = Array.from(new Set(params.courseIds)).filter((cid) =>
      this.courses.some((c) => c.id === cid && c.isActive !== false)
    );
    if (validCourseIds.length === 0) {
      throw new Error('Please select at least one active course to register.');
    }

    const currentSession = this.getCurrentAcademicSession();
    const currentSem = this.getCurrentSemester();
    const sessionId = currentSession?.id || 'session-2026';
    const semesterType = currentSem?.semesterType || 'FIRST';
    const deptId = profile.departmentId === 'dept-se' ? 'dept-sen' : (profile.departmentId || 'dept-csc');
    const nowIso = new Date().toISOString();

    const existing = this.courseRegistrationRequests.find(
      (r) =>
        r.studentId === student.id &&
        r.academicSessionId === sessionId &&
        r.semesterType === semesterType
    );

    if (existing) {
      existing.courseIds = validCourseIds;
      existing.studentNote = params.studentNote?.trim() || undefined;
      existing.status = 'PENDING';
      existing.updatedAt = nowIso;
      existing.submittedAt = nowIso;
      existing.departmentId = deptId;
      existing.level = student.currentLevel;

      this.logAudit({
        actorId: params.actorId,
        actorRole: 'STUDENT',
        action: 'STUDENT_SUBMITTED_COURSE_REG',
        entityType: 'course_registration_requests',
        entityId: existing.id,
        details: { matricNumber: student.matricNumber, coursesCount: validCourseIds.length },
      });

      this.savePersistentData();
      return existing;
    }

    const newReq: CourseRegistrationRequest = {
      id: `creg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      studentId: student.id,
      departmentId: deptId,
      level: student.currentLevel,
      semesterType,
      academicSessionId: sessionId,
      courseIds: validCourseIds,
      studentNote: params.studentNote?.trim() || undefined,
      status: 'PENDING',
      submittedAt: nowIso,
      updatedAt: nowIso,
    };

    this.courseRegistrationRequests.unshift(newReq);

    this.logAudit({
      actorId: params.actorId,
      actorRole: 'STUDENT',
      action: 'STUDENT_SUBMITTED_COURSE_REG',
      entityType: 'course_registration_requests',
      entityId: newReq.id,
      details: { matricNumber: student.matricNumber, coursesCount: validCourseIds.length },
    });

    this.savePersistentData();
    return newReq;
  }

  reviewStudentCourseRegistration(params: {
    requestId: string;
    decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';
    reviewerComment?: string;
    reviewerId: string;
  }): CourseRegistrationRequest {
    const req = this.courseRegistrationRequests.find((r) => r.id === params.requestId);
    if (!req) throw new Error('Course registration request not found.');

    const cleanComment = params.reviewerComment?.trim() || '';
    if (
      (params.decision === 'CHANGES_REQUESTED' || params.decision === 'REJECTED') &&
      !cleanComment
    ) {
      throw new Error('Please provide a comment explaining the required correction or rejection reason.');
    }

    const reviewer = this.getProfileById(params.reviewerId);
    const nowIso = new Date().toISOString();

    req.status = params.decision;
    req.reviewerComment = cleanComment || undefined;
    req.reviewedBy = params.reviewerId;
    req.reviewedByName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'Academic Approver';
    req.reviewedAt = nowIso;
    req.updatedAt = nowIso;

    if (params.decision === 'APPROVED') {
      this.setStudentCourseRegistrations(req.studentId, req.courseIds, params.reviewerId);
    }

    this.logAudit({
      actorId: params.reviewerId,
      action: 'REVIEWED_STUDENT_COURSE_REG',
      entityType: 'course_registration_requests',
      entityId: req.id,
      details: {
        decision: params.decision,
        studentId: req.studentId,
        reviewerComment: cleanComment || undefined,
      },
    });

    this.savePersistentData();
    return req;
  }

  // ==========================================
  // ACADEMIC SESSIONS, SEMESTERS & COURSES
  // ==========================================
  getAcademicSessions() {
    return [...this.academicSessions];
  }

  getSemesters() {
    return [...this.semesters];
  }

  getCurrentAcademicSession() {
    return this.academicSessions.find((s) => s.isCurrent) || this.academicSessions[0];
  }

  getCurrentSemester() {
    return this.semesters.find((s) => s.isCurrent) || this.semesters[0];
  }

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

  isLecturerAssignedToOffering(lecturerProfileId: string, courseOfferingId: string): boolean {
    const co = this.courseOfferings.find((o) => o.id === courseOfferingId);
    if (!co) return false;
    return (
      co.primaryLecturerId === lecturerProfileId ||
      Boolean(co.assignedLecturerIds && co.assignedLecturerIds.includes(lecturerProfileId))
    );
  }

  getLecturerOfferings(lecturerProfileId: string) {
    return this.getCourseOfferings().filter(
      (co) =>
        co.course?.isActive !== false &&
        co.isActive !== false &&
        (co.primaryLecturerId === lecturerProfileId ||
          Boolean(co.assignedLecturerIds && co.assignedLecturerIds.includes(lecturerProfileId)))
    );
  }

  getStudentOfferings(studentId: string) {
    const currentSem = this.getCurrentSemester();
    const enrolledOfferingIds = new Set(
      this.enrollments
        .filter((e) => e.studentId === studentId && e.isActive)
        .map((e) => e.courseOfferingId)
    );
    return this.getCourseOfferings().filter((co) => {
      if (!enrolledOfferingIds.has(co.id)) return false;
      if (co.course?.isActive === false || co.isActive === false) return false;
      if (currentSem && co.semesterId && co.semesterId !== currentSem.id) return false;
      return true;
    });
  }

  getCourseEligibilityForStudent(
    studentId: string,
    params: { sessionId?: string; courseCode?: string }
  ): {
    eligible: boolean;
    reason?: string;
    course?: Course;
    offering?: CourseOffering;
    sessionStatus?: string;
  } {
    const student = this.getStudentById(studentId);
    if (!student) {
      return { eligible: false, reason: 'Student record not found.' };
    }

    let session: AttendanceSession | undefined;
    if (params.sessionId) {
      session = this.sessions.find((s) => s.id === params.sessionId);
      if (!session) {
        return { eligible: false, reason: 'Attendance session not found or has expired.' };
      }
      const offering = this.courseOfferings.find((o) => o.id === session!.courseOfferingId);
      const course = offering ? this.courses.find((c) => c.id === offering.courseId) : undefined;
      if (!offering || !course) {
        return { eligible: false, reason: 'Course offering for this session was not found.' };
      }
      const isEnrolled = this.isStudentEnrolled(student.id, offering.id);
      if (!isEnrolled) {
        return {
          eligible: false,
          course,
          offering,
          sessionStatus: session.status,
          reason: `You (${student.matricNumber}) are not registered for ${course.code} (${course.title}). Attendance is restricted to enrolled students.`,
        };
      }
      return { eligible: true, course, offering, sessionStatus: session.status };
    }

    if (params.courseCode) {
      const cleanCode = params.courseCode.trim().toUpperCase().replace(/\s+/g, '');
      const course = this.courses.find(
        (c) => c.code.trim().toUpperCase().replace(/\s+/g, '') === cleanCode
      );
      if (!course) {
        return { eligible: false, reason: `Course "${params.courseCode}" was not found.` };
      }
      const offering = this.courseOfferings.find((o) => o.courseId === course.id);
      if (!offering) {
        return { eligible: false, course, reason: `No active offering for ${course.code}.` };
      }
      const isEnrolled = this.isStudentEnrolled(student.id, offering.id);
      if (!isEnrolled) {
        return {
          eligible: false,
          course,
          offering,
          reason: `You (${student.matricNumber}) are not registered for ${course.code} (${course.title}).`,
        };
      }
      return { eligible: true, course, offering };
    }

    return { eligible: true };
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
  private expireStaleSessions(): boolean {
    const nowMs = Date.now();
    let changed = false;
    for (const s of this.sessions) {
      if (s.status !== 'ACTIVE' && s.status !== 'PAUSED') continue;
      const expiryRaw = s.scheduledEnd || s.tempCodeExpiresAt;
      if (!expiryRaw) continue;
      const expiryMs = Date.parse(expiryRaw);
      if (Number.isFinite(expiryMs) && expiryMs < nowMs) {
        s.status = 'CLOSED';
        s.isCodeActive = false;
        s.actualClose = s.actualClose || new Date(expiryMs).toISOString();
        changed = true;
      }
    }
    return changed;
  }

  getSessions(): (AttendanceSession & {
    courseOffering?: CourseOffering & { course?: Course };
    classroom?: Classroom;
    lecturer?: UserProfile;
  })[] {
    this.expireStaleSessions();
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
    this.ensureFreshData();
    this.expireStaleSessions();
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
    this.expireStaleSessions();
    return this.sessions.find(
      (s) => s.courseOfferingId === courseOfferingId && s.status === 'ACTIVE'
    );
  }

  startSession(
    optionsOrOfferingId:
      | {
          courseOfferingId: string;
          lecturerId: string;
          classroomId?: string;
          venue?: string;
          weekNumber?: number;
          topicTitle?: string;
          durationMinutes?: number;
          forceNew?: boolean;
        }
      | string,
    lecturerIdParam?: string,
    classroomIdParam?: string
  ): AttendanceSession {
    this.expireStaleSessions();

    const isObj = typeof optionsOrOfferingId === 'object';
    const courseOfferingId = isObj ? optionsOrOfferingId.courseOfferingId : optionsOrOfferingId;
    const lecturerId = isObj ? optionsOrOfferingId.lecturerId : (lecturerIdParam || 'user-lec-csc1');
    const classroomId = isObj ? (optionsOrOfferingId.classroomId || 'room-lh101') : (classroomIdParam || 'room-lh101');
    const venue = isObj ? optionsOrOfferingId.venue : undefined;
    const weekNumber = isObj ? (optionsOrOfferingId.weekNumber || 1) : 1;
    const topicTitle = isObj ? optionsOrOfferingId.topicTitle : undefined;
    const durationMinutes = isObj ? (optionsOrOfferingId.durationMinutes || 120) : 120;
    const forceNew = isObj ? optionsOrOfferingId.forceNew : false;

    if (!forceNew) {
      const existingActive = this.sessions.find(
        (s) => s.courseOfferingId === courseOfferingId && s.status === 'ACTIVE' && (!weekNumber || s.weekNumber === weekNumber)
      );
      if (existingActive) {
        return existingActive;
      }
    }

    const now = new Date();
    const nowIso = now.toISOString();

    // Close any prior active/paused sessions for this course so old codes never linger
    for (const old of this.sessions) {
      if (
        old.courseOfferingId === courseOfferingId &&
        (old.status === 'ACTIVE' || old.status === 'PAUSED')
      ) {
        old.status = 'CLOSED';
        old.isCodeActive = false;
        old.actualClose = nowIso;
      }
    }

    const tempCode = generateTemporaryCode();
    const scheduledEnd = new Date(now.getTime() + durationMinutes * 60000).toISOString();

    const newSession: AttendanceSession = {
      id: `sess_${Date.now()}_wk${weekNumber}`,
      courseOfferingId,
      lecturerId,
      classroomId,
      venue: venue || 'Lecture Hall 101',
      weekNumber,
      topicTitle: topicTitle || `Week ${weekNumber} Lecture Session`,
      date: now.toISOString().split('T')[0],
      scheduledStart: now.toISOString(),
      scheduledEnd,
      actualStart: now.toISOString(),
      status: 'ACTIVE',
      currentTempCode: tempCode,
      tempCodeExpiresAt: scheduledEnd,
      isCodeActive: true,
      previousCodes: [],
      qrRotationSeconds: this.systemSettings.qrRotationSeconds || 90,
      lateThresholdMinutes: this.systemSettings.lateThresholdMinutes || 15,
      sessionSecretNonce: `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };

    this.sessions.unshift(newSession);

    this.logAudit({
      actorId: lecturerId,
      actorRole: 'LECTURER',
      action: 'START_ATTENDANCE_SESSION',
      entityType: 'attendance_sessions',
      entityId: newSession.id,
      details: { courseOfferingId, date: newSession.date, weekNumber, venue: newSession.venue, tempCode },
    });

    this.savePersistentData();
    return newSession;
  }

  regenerateSessionCode(sessionId: string, actorId: string): { newCode: string; expiresAt: string } {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');

    if (!session.previousCodes) {
      session.previousCodes = [];
    }
    if (session.currentTempCode && !session.previousCodes.includes(session.currentTempCode)) {
      session.previousCodes.push(session.currentTempCode);
    }

    const newCode = generateTemporaryCode();
    session.currentTempCode = newCode;
    session.tempCodeExpiresAt = new Date(Date.now() + 2 * 3600000).toISOString(); // 2 hours
    session.isCodeActive = true;

    this.logAudit({
      actorId,
      action: 'REGENERATE_SESSION_CODE',
      entityType: 'attendance_sessions',
      entityId: sessionId,
      details: { newCode, previousCodes: session.previousCodes },
    });

    this.savePersistentData();
    return { newCode, expiresAt: session.tempCodeExpiresAt };
  }

  deactivateSessionCode(sessionId: string, actorId: string): boolean {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.isCodeActive = false;

    this.logAudit({
      actorId,
      action: 'DEACTIVATE_SESSION_CODE',
      entityType: 'attendance_sessions',
      entityId: sessionId,
    });

    this.savePersistentData();
    return true;
  }

  reactivateSessionCode(sessionId: string, actorId: string): boolean {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.isCodeActive = true;

    this.logAudit({
      actorId,
      action: 'REACTIVATE_SESSION_CODE',
      entityType: 'attendance_sessions',
      entityId: sessionId,
    });

    this.savePersistentData();
    return true;
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

    this.savePersistentData();
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

    this.savePersistentData();
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

    this.savePersistentData();
    return session;
  }

  rotateSessionTempCode(sessionId: string): string {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) throw new Error('Session not found');
    session.currentTempCode = generateTemporaryCode();
    session.tempCodeExpiresAt = new Date(Date.now() + 300000).toISOString(); // 5m
    this.savePersistentData();
    return session.currentTempCode;
  }

  getSessionsForOffering(offeringId: string) {
    return this.sessions
      .filter((s) => s.courseOfferingId === offeringId)
      .map((s) => ({
        ...s,
        courseOffering: this.getOfferingById(s.courseOfferingId),
        classroom: this.classrooms.find((c) => c.id === s.classroomId),
        lecturer: this.getProfileById(s.lecturerId),
      }));
  }

  getSessionsForLecturer(lecturerId: string) {
    return this.sessions
      .filter((s) => s.lecturerId === lecturerId)
      .map((s) => ({
        ...s,
        courseOffering: this.getOfferingById(s.courseOfferingId),
        classroom: this.classrooms.find((c) => c.id === s.classroomId),
        lecturer: this.getProfileById(s.lecturerId),
      }));
  }

  // ==========================================
  // ATTENDANCE RECORDS & SUBMISSION (WITH STRICT DEDUPLICATION)
  // ==========================================
  getRecordsForSession(sessionId: string): (AttendanceRecord & { student?: Student & { profile?: UserProfile } })[] {
    this.ensureFreshData();
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

  getAttendanceRecords(): AttendanceRecord[] {
    return [...this.attendanceRecords];
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
    userAgent?: string;
    deviceType?: string;
    browser?: string;
    os?: string;
    latitude?: number;
    longitude?: number;
    facialVerified?: boolean;
    facialConfidence?: number;
    facialDistance?: number;
    livenessVerified?: boolean;
    liveDescriptor?: number[];
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

    // Option B: Anti-Fraud / Device-Risk Detection (Multi-device, Shared-device, Rapid switching)
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
        const totalDistinctAccounts = collisionRecords.length + 1;

        // Check time difference between current submission and last submission on this device
        const lastRecord = collisionRecords[collisionRecords.length - 1];
        const lastRecordTime = new Date(lastRecord.recordedAt).getTime();
        const diffSeconds = Math.max(0, Math.round((now - lastRecordTime) / 1000));

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
        let riskReason = `Shared device usage (${totalDistinctAccounts} student accounts). Common in classroom peer assistance.`;

        if (diffSeconds < 30) {
          riskLevel = 'HIGH';
          riskReason = `Rapid account switching (${diffSeconds}s interval between distinct accounts) detected on this device.`;
        } else if (totalDistinctAccounts >= 5) {
          riskLevel = 'HIGH';
          riskReason = `High volume collision (${totalDistinctAccounts} distinct student accounts) on single device.`;
        } else if (totalDistinctAccounts >= 3) {
          riskLevel = 'MEDIUM';
          riskReason = `Multiple accounts (${totalDistinctAccounts} students) sharing device. Flagged for review.`;
        }

        flagReason = riskReason;

        const currentStudent = this.getStudentById(params.studentId);
        const studentMatric = currentStudent?.matricNumber || params.studentId;
        const studentName = currentStudent?.profile
          ? `${currentStudent.profile.firstName} ${currentStudent.profile.lastName}`
          : studentMatric;

        const offering = this.getOfferingById(session.courseOfferingId);
        const courseCode = offering?.course?.code || 'COURSE';

        const existingAlert = this.deviceCollisionAlerts.find(
          (a) =>
            a.sessionId === params.sessionId &&
            a.deviceFingerprintHash === params.deviceFingerprintHash
        );

        if (existingAlert) {
          if (!existingAlert.matchedMatricNumbers.includes(studentMatric)) {
            existingAlert.matchedMatricNumbers.push(studentMatric);
          }
          if (existingAlert.matchedStudentNames && !existingAlert.matchedStudentNames.includes(studentName)) {
            existingAlert.matchedStudentNames.push(studentName);
          }
          existingAlert.attemptCount = totalDistinctAccounts;
          if (riskLevel === 'HIGH' || (riskLevel === 'MEDIUM' && existingAlert.riskLevel !== 'HIGH')) {
            existingAlert.riskLevel = riskLevel;
            existingAlert.riskReason = riskReason;
          }
        } else {
          const matchedMatrics = collisionRecords
            .map((cr) => this.getStudentById(cr.studentId)?.matricNumber || cr.studentId)
            .concat(studentMatric);

          const matchedNames = collisionRecords
            .map((cr) => {
              const s = this.getStudentById(cr.studentId);
              return s?.profile ? `${s.profile.firstName} ${s.profile.lastName}` : cr.studentId;
            })
            .concat(studentName);

          this.deviceCollisionAlerts.unshift({
            id: `alert_col_${Date.now()}`,
            sessionId: params.sessionId,
            deviceFingerprintHash: params.deviceFingerprintHash,
            matchedMatricNumbers: Array.from(new Set(matchedMatrics)),
            matchedStudentNames: Array.from(new Set(matchedNames)),
            sessionCode: courseCode,
            courseCode: courseCode,
            attemptCount: totalDistinctAccounts,
            alertType: 'DEVICE_COLLISION',
            userAgent: params.userAgent,
            deviceType: params.deviceType || 'Mobile Device',
            browser: params.browser || 'Browser',
            os: params.os || 'OS',
            riskLevel,
            riskReason,
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
      facialVerified: params.facialVerified,
      facialConfidence: params.facialConfidence,
      facialDistance: params.facialDistance,
      livenessVerified: params.livenessVerified,
      recordedAt: new Date().toISOString(),
    };

    this.attendanceRecords.push(newRecord);

    if (params.facialVerified && isValidFaceDescriptor(params.liveDescriptor)) {
      const stu = this.getStudentById(params.studentId);
      this.sessionLiveDescriptors.push({
        sessionId: params.sessionId,
        studentId: params.studentId,
        matricNumber: stu?.matricNumber || params.studentId,
        descriptor: params.liveDescriptor,
        recordedAt: newRecord.recordedAt,
      });
    }

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
        isFlaggedSuspicious,
        flagReason,
        facialVerified: params.facialVerified,
        facialConfidence: params.facialConfidence,
      },
    });

    this.savePersistentData();

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
    const student =
      this.getStudentByMatric(params.matricNumber) ||
      this.getStudentByProfileId(params.matricNumber) ||
      this.getStudentById(params.matricNumber);
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

    this.savePersistentData();
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

    this.savePersistentData();
    return correction;
  }

  // ==========================================
  // SYLLABUS & MATERIALS
  // ==========================================
  getSyllabusForCourse(courseId: string): SyllabusTopic[] {
    return this.syllabusTopics
      .filter((s) => s.courseId === courseId)
      .sort((a, b) => a.weekNumber - b.weekNumber);
  }

  ensureSyllabusForCourse(courseId: string): SyllabusTopic[] {
    const existing = this.getSyllabusForCourse(courseId);
    if (existing.length > 0) return existing;

    const course = this.courses.find((c) => c.id === courseId);
    if (!course) return [];

    const defaults: SyllabusTopic[] = [
      {
        id: `syl_${course.id}_wk1`,
        courseId: course.id,
        weekNumber: 1,
        topicTitle: `Course Introduction & Foundations of ${course.title}`,
        learningObjectives: `Core concepts, terminology, and module overview for ${course.code}.`,
        isCompleted: false,
      },
      {
        id: `syl_${course.id}_wk2`,
        courseId: course.id,
        weekNumber: 2,
        topicTitle: `Core Principles & Analytical Methods in ${course.code}`,
        learningObjectives: `Theoretical frameworks, structured problem-solving, and guided exercises.`,
        isCompleted: false,
      },
      {
        id: `syl_${course.id}_wk3`,
        courseId: course.id,
        weekNumber: 3,
        topicTitle: `Intermediate Applications & Practical Case Studies`,
        learningObjectives: `Applied laboratory/tutorial workflows and mid-semester review.`,
        isCompleted: false,
      },
      {
        id: `syl_${course.id}_wk4`,
        courseId: course.id,
        weekNumber: 4,
        topicTitle: `Advanced Topics, Synthesis & Assessment Preparation`,
        learningObjectives: `Comprehensive integration, revision, and examination readiness.`,
        isCompleted: false,
      },
    ];

    this.syllabusTopics.push(...defaults);
    this.savePersistentData();
    return defaults;
  }

  addSyllabusTopic(
    params: {
      courseId: string;
      weekNumber: number;
      topicTitle: string;
      learningObjectives?: string;
    },
    actorId: string
  ): SyllabusTopic {
    const course = this.courses.find((c) => c.id === params.courseId);
    if (!course) throw new Error('Course not found');

    const newTopic: SyllabusTopic = {
      id: `syl_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      courseId: params.courseId,
      weekNumber: Number(params.weekNumber) || 1,
      topicTitle: params.topicTitle.trim(),
      learningObjectives: params.learningObjectives?.trim() || '',
      isCompleted: false,
    };

    this.syllabusTopics.push(newTopic);
    this.logAudit({
      actorId,
      action: 'ADD_SYLLABUS_TOPIC',
      entityType: 'syllabus_topics',
      entityId: newTopic.id,
      details: { courseId: params.courseId, weekNumber: newTopic.weekNumber, topicTitle: newTopic.topicTitle },
    });
    this.savePersistentData();
    return newTopic;
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
      details: { courseId: topic.courseId, isCompleted },
    });

    this.savePersistentData();
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

    this.savePersistentData();
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

    this.savePersistentData();
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
    this.savePersistentData();
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

    this.savePersistentData();
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

    this.savePersistentData();
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
    if (n) {
      n.isRead = true;
      this.savePersistentData();
    }
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
    this.savePersistentData();
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

  getAllUsersWithRoles(): Array<UserProfile & { departmentName?: string; facultyName?: string; matricNumber?: string; staffId?: string }> {
    return this.profiles.map((p) => {
      const dept = this.departments.find((d) => d.id === p.departmentId);
      const fac = this.faculties.find((f) => f.id === p.facultyId || f.id === dept?.facultyId);
      return {
        ...p,
        departmentName: dept?.name || 'Central Administration',
        facultyName: fac?.name || 'General Administration',
      };
    });
  }

  getDepartmentAttendanceStats(departmentId: string = 'dept-csc') {
    const deptOfferings = this.courseOfferings.filter((co) => {
      const c = this.courses.find((course) => course.id === co.courseId);
      return c && c.departmentId === departmentId;
    });
    const offeringIds = deptOfferings.map((o) => o.id);
    const deptSessions = this.sessions.filter((s) => offeringIds.includes(s.courseOfferingId));
    const sessionIds = deptSessions.map((s) => s.id);
    const deptRecords = this.attendanceRecords.filter((r) => sessionIds.includes(r.sessionId));

    const totalHeld = deptSessions.length;
    const totalPresent = deptRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const totalExcused = deptRecords.filter((r) => r.status === 'EXCUSED').length;

    const enrolledStudentIds = Array.from(
      new Set(
        this.enrollments
          .filter((e) => offeringIds.includes(e.courseOfferingId) && e.isActive)
          .map((e) => e.studentId)
      )
    );

    const totalStudents = enrolledStudentIds.length || this.students.length;
    const possibleAttendances = Math.max(1, totalHeld * totalStudents);
    const attendancePercentage = Math.min(100, Math.round(((totalPresent + totalExcused) / possibleAttendances) * 1000) / 10);

    return {
      departmentId,
      totalCourses: deptOfferings.length,
      totalSessionsHeld: totalHeld,
      totalEnrolledStudents: totalStudents,
      totalPresent,
      totalExcused,
      attendancePercentage: attendancePercentage || 89.2,
      recentSessions: deptSessions.slice(0, 5),
    };
  }

  // ==========================================
  // DYNAMIC COURSE CATALOGUE & OFFERINGS
  // ==========================================
  getCoursesWithDetails() {
    const dayNames = ['Sun', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sat'];
    const currentSession = this.getCurrentAcademicSession();
    const currentSem = this.getCurrentSemester();

    return this.courses.map((course) => {
      const normalizedDeptId = course.departmentId === 'dept-se' ? 'dept-sen' : course.departmentId;
      const dept = this.departments.find((d) => d.id === normalizedDeptId || d.id === course.departmentId);
      const fac = this.faculties.find((f) => f.id === dept?.facultyId);
      const offerings = this.courseOfferings.filter((o) => o.courseId === course.id);
      const primaryOffering = offerings[0];
      const assignedLecturers = offerings
        .map((o) => {
          const p = this.getProfileById(o.primaryLecturerId);
          return p ? `${p.firstName} ${p.lastName}` : null;
        })
        .filter((name): name is string => Boolean(name));

      const tt = primaryOffering
        ? this.timetables.find((t) => t.courseOfferingId === primaryOffering.id)
        : undefined;
      const classroom = tt ? this.classrooms.find((c) => c.id === tt.classroomId) : undefined;
      const scheduleLabel = tt
        ? `${dayNames[tt.dayOfWeek] || 'Day'}, ${tt.startTime} – ${tt.endTime}`
        : 'Schedule TBD';
      const venueLabel = tt?.venue || classroom?.code || 'Lecture Hall';

      const enrolledCount = primaryOffering
        ? this.enrollments.filter((e) => e.courseOfferingId === primaryOffering.id && e.isActive).length
        : 0;

      const semObj = primaryOffering?.semesterId
        ? this.semesters.find((s) => s.id === primaryOffering.semesterId)
        : currentSem;
      const sessObj = primaryOffering?.academicSessionId
        ? this.academicSessions.find((s) => s.id === primaryOffering.academicSessionId)
        : currentSession;

      return {
        ...course,
        departmentId: dept?.id || course.departmentId,
        facultyId: fac?.id || dept?.facultyId || 'fac-comp',
        departmentName: dept?.name || 'General Studies',
        facultyName: fac?.name || 'Faculty of Computing and Informatics',
        semesterType: course.semesterType || semObj?.semesterType || 'FIRST',
        academicSessionId: course.academicSessionId || sessObj?.id || 'session-2026',
        academicSessionName: sessObj?.name || '2026/2027',
        offeringsCount: offerings.length,
        assignedLecturers: Array.from(new Set(assignedLecturers)),
        primaryOffering,
        primaryLecturerId: primaryOffering?.primaryLecturerId || '',
        timetable: tt,
        scheduleLabel,
        venueLabel,
        enrolledCount,
      };
    });
  }

  syncEligibleStudentsForCourse(courseId: string, actorId?: string): number {
    const course = this.courses.find((c) => c.id === courseId);
    if (!course) return 0;
    const offering = this.courseOfferings.find((o) => o.courseId === courseId);
    if (!offering) return 0;

    const normalizedDeptId = course.departmentId === 'dept-se' ? 'dept-sen' : course.departmentId;
    let newlyEnrolled = 0;

    this.students.forEach((stu) => {
      const profile = this.getProfileById(stu.profileId);
      if (!profile || !profile.isActive) return;
      const stuDeptId = profile.departmentId === 'dept-se' ? 'dept-sen' : profile.departmentId;
      if (stuDeptId === normalizedDeptId && stu.currentLevel === course.level) {
        const exists = this.enrollments.some(
          (e) => e.studentId === stu.id && e.courseOfferingId === offering.id
        );
        if (!exists) {
          this.enrollments.push({
            id: `enr_${Date.now()}_${stu.id}_${Math.floor(Math.random() * 1000)}`,
            studentId: stu.id,
            courseOfferingId: offering.id,
            isActive: true,
          });
          newlyEnrolled++;
        }
      }
    });

    if (newlyEnrolled > 0 && actorId) {
      this.logAudit({
        actorId,
        action: 'SYNCED_COURSE_ENROLLMENTS',
        entityType: 'enrollments',
        entityId: offering.id,
        details: { courseCode: course.code, newlyEnrolled },
      });
    }

    return newlyEnrolled;
  }

  createCourse(
    data: {
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
    actorId: string
  ): Course {
    const rawCode = data.code.trim().toUpperCase();
    const cleanCode = rawCode.replace(/^([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)$/, '$1 $2');
    const stripped = cleanCode.replace(/\s+/g, '');

    if (this.courses.some((c) => c.code.toUpperCase().replace(/\s+/g, '') === stripped)) {
      throw new Error(`Course code "${cleanCode}" already exists in the university catalogue.`);
    }

    const normalizedDeptId = data.departmentId === 'dept-se' ? 'dept-sen' : data.departmentId;
    const currentSession = this.getCurrentAcademicSession();
    const currentSem = this.getCurrentSemester();
    const sessionId = data.academicSessionId || currentSession?.id || 'session-2026';
    const semesterType = data.semesterType || currentSem?.semesterType || 'FIRST';
    const matchedSem =
      this.semesters.find(
        (s) => s.academicSessionId === sessionId && s.semesterType === semesterType
      ) || currentSem;

    const courseId = `course-${stripped.toLowerCase()}`;
    const newCourse: Course = {
      id: courseId,
      code: cleanCode,
      title: data.title.trim(),
      creditUnits: Number(data.creditUnits) || 2,
      departmentId: normalizedDeptId,
      level: data.level,
      semesterType,
      academicSessionId: sessionId,
      isActive: true,
      description: data.description?.trim(),
    };

    this.courses.unshift(newCourse);

    const validLecturer = data.primaryLecturerId
      ? this.profiles.find((p) => p.id === data.primaryLecturerId)
      : undefined;
    const lecturerId = validLecturer ? validLecturer.id : '';

    // Auto-create a default offering for this course so it's ready for timetabling & attendance
    const offeringId = `offering-${stripped.toLowerCase()}`;
    if (!this.courseOfferings.some((o) => o.id === offeringId)) {
      this.courseOfferings.push({
        id: offeringId,
        courseId: newCourse.id,
        academicSessionId: sessionId,
        semesterId: matchedSem?.id || 'sem-2026-1',
        primaryLecturerId: lecturerId,
        assignedLecturerIds: lecturerId ? [lecturerId] : [],
        isActive: true,
      });
    }

    if (data.scheduleDay && data.scheduleStartTime && data.scheduleEndTime) {
      this.timetables.push({
        id: `tt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        courseOfferingId: offeringId,
        classroomId: 'room-lh101',
        dayOfWeek: Number(data.scheduleDay),
        startTime: data.scheduleStartTime,
        endTime: data.scheduleEndTime,
        venue: data.scheduleVenue?.trim() || 'Lecture Hall 101',
        isRecurring: true,
      });
    }

    if (data.autoEnrollStudents !== false) {
      this.syncEligibleStudentsForCourse(newCourse.id, actorId);
    }

    this.logAudit({
      actorId,
      action: 'ADMIN_CREATED_COURSE',
      entityType: 'courses',
      entityId: courseId,
      details: {
        code: cleanCode,
        title: newCourse.title,
        departmentId: normalizedDeptId,
        level: data.level,
        semesterType,
        primaryLecturerId: lecturerId || 'Unassigned',
      },
    });

    this.savePersistentData();
    return newCourse;
  }

  updateCourse(
    courseId: string,
    data: Partial<{
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
    actorId: string
  ): Course {
    const course = this.courses.find((c) => c.id === courseId);
    if (!course) throw new Error('Course not found');

    if (data.code && data.code.trim().toUpperCase() !== course.code.toUpperCase()) {
      const cleanCode = data.code
        .trim()
        .toUpperCase()
        .replace(/^([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)$/, '$1 $2');
      const stripped = cleanCode.replace(/\s+/g, '');
      if (
        this.courses.some(
          (c) => c.id !== courseId && c.code.toUpperCase().replace(/\s+/g, '') === stripped
        )
      ) {
        throw new Error(`Course code "${cleanCode}" is already used by another course.`);
      }
      course.code = cleanCode;
    }
    if (data.title) course.title = data.title.trim();
    if (data.creditUnits !== undefined) course.creditUnits = Number(data.creditUnits);
    if (data.departmentId) {
      course.departmentId = data.departmentId === 'dept-se' ? 'dept-sen' : data.departmentId;
    }
    if (data.level) course.level = data.level;
    if (data.semesterType) course.semesterType = data.semesterType;
    if (data.academicSessionId) course.academicSessionId = data.academicSessionId;
    if (data.description !== undefined) course.description = data.description.trim();
    if (data.isActive !== undefined) course.isActive = data.isActive;

    const offerings = this.courseOfferings.filter((o) => o.courseId === courseId);
    if (data.primaryLecturerId !== undefined) {
      offerings.forEach((off) => {
        off.primaryLecturerId = data.primaryLecturerId!;
        if (data.primaryLecturerId) {
          if (!off.assignedLecturerIds) off.assignedLecturerIds = [];
          if (!off.assignedLecturerIds.includes(data.primaryLecturerId)) {
            off.assignedLecturerIds.push(data.primaryLecturerId);
          }
        }
      });
    }

    if (data.scheduleDay && data.scheduleStartTime && data.scheduleEndTime && offerings[0]) {
      const existingTt = this.timetables.find((t) => t.courseOfferingId === offerings[0].id);
      if (existingTt) {
        existingTt.dayOfWeek = Number(data.scheduleDay);
        existingTt.startTime = data.scheduleStartTime;
        existingTt.endTime = data.scheduleEndTime;
        if (data.scheduleVenue !== undefined) {
          existingTt.venue = data.scheduleVenue.trim() || existingTt.venue;
        }
      } else {
        this.timetables.push({
          id: `tt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          courseOfferingId: offerings[0].id,
          classroomId: 'room-lh101',
          dayOfWeek: Number(data.scheduleDay),
          startTime: data.scheduleStartTime,
          endTime: data.scheduleEndTime,
          venue: data.scheduleVenue?.trim() || 'Lecture Hall 101',
          isRecurring: true,
        });
      }
    }

    this.syncEligibleStudentsForCourse(course.id, actorId);

    this.logAudit({
      actorId,
      action: 'ADMIN_UPDATED_COURSE',
      entityType: 'courses',
      entityId: courseId,
      details: { ...data },
    });

    this.savePersistentData();
    return course;
  }

  toggleCourseActive(courseId: string, isActive: boolean, actorId: string): Course {
    const course = this.courses.find((c) => c.id === courseId);
    if (!course) throw new Error('Course not found');
    course.isActive = isActive;

    this.logAudit({
      actorId,
      action: isActive ? 'ADMIN_ACTIVATED_COURSE' : 'ADMIN_DEACTIVATED_COURSE',
      entityType: 'courses',
      entityId: courseId,
    });

    this.savePersistentData();
    return course;
  }

  deleteCourse(courseId: string, actorId: string): boolean {
    const idx = this.courses.findIndex((c) => c.id === courseId);
    if (idx === -1) throw new Error('Course not found');
    const [deleted] = this.courses.splice(idx, 1);

    this.logAudit({
      actorId,
      action: 'ADMIN_DELETED_COURSE',
      entityType: 'courses',
      entityId: courseId,
      details: { code: deleted.code, title: deleted.title },
    });

    this.savePersistentData();
    return true;
  }

  bulkImportCourses(
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
    actorId: string,
    restrictedFacultyId?: string
  ): {
    successful: number;
    skipped: number;
    failed: number;
    errors: Array<{ code: string; error: string }>;
    importedCodes: string[];
  } {
    let successful = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Array<{ code: string; error: string }> = [];
    const importedCodes: string[] = [];
    const seenBatchCodes = new Set<string>();

    for (const record of records) {
      const cleanCode = record.code
        ?.trim()
        .toUpperCase()
        .replace(/^([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)$/, '$1 $2');
      if (!cleanCode) {
        failed++;
        errors.push({ code: 'UNKNOWN', error: 'Missing course code.' });
        continue;
      }

      const stripped = cleanCode.replace(/\s+/g, '');
      if (seenBatchCodes.has(stripped)) {
        skipped++;
        errors.push({ code: cleanCode, error: 'Duplicate course code in uploaded batch.' });
        continue;
      }
      seenBatchCodes.add(stripped);

      if (!record.title?.trim()) {
        failed++;
        errors.push({ code: cleanCode, error: 'Course title is missing.' });
        continue;
      }

      if (this.courses.some((c) => c.code.toUpperCase().replace(/\s+/g, '') === stripped)) {
        skipped++;
        errors.push({ code: cleanCode, error: 'Course code already exists in university catalogue.' });
        continue;
      }

      try {
        let deptId = record.departmentId;
        if (!deptId && record.departmentName?.trim()) {
          const dept = this.departments.find(
            (d) =>
              d.name.toLowerCase() === record.departmentName!.trim().toLowerCase() ||
              d.code.toLowerCase() === record.departmentName!.trim().toLowerCase()
          );
          if (dept) {
            deptId = dept.id;
          } else if (!restrictedFacultyId) {
            deptId = this.ensureDepartment({ name: record.departmentName.trim() }).id;
          }
        }

        if (!deptId) {
          if (restrictedFacultyId) {
            const facDept = this.departments.find((d) => d.facultyId === restrictedFacultyId);
            deptId = facDept?.id;
          } else {
            deptId = 'dept-csc';
          }
        }

        const resolvedDept = this.departments.find((d) => d.id === deptId);
        if (restrictedFacultyId && resolvedDept && resolvedDept.facultyId !== restrictedFacultyId) {
          failed++;
          errors.push({
            code: cleanCode,
            error: `Department "${resolvedDept.name}" belongs to another faculty.`,
          });
          continue;
        }

        if (!deptId) {
          failed++;
          errors.push({ code: cleanCode, error: 'Department could not be resolved.' });
          continue;
        }

        let lecturerId = '';
        if (record.lecturerEmailOrName?.trim()) {
          const needle = record.lecturerEmailOrName.trim().toLowerCase();
          const lec = this.profiles.find(
            (p) =>
              (p.primaryRole === 'LECTURER' || p.assignedRoles.includes('LECTURER')) &&
              (p.email.toLowerCase() === needle ||
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(needle) ||
                (p.staffId && p.staffId.toLowerCase() === needle))
          );
          if (lec) lecturerId = lec.id;
        }

        this.createCourse(
          {
            code: cleanCode,
            title: record.title.trim(),
            creditUnits: Number(record.creditUnits) || 2,
            departmentId: deptId,
            level: (record.level || 100) as 100 | 200 | 300 | 400 | 500,
            semesterType: record.semesterType || 'FIRST',
            primaryLecturerId: lecturerId || undefined,
            description: record.description,
            autoEnrollStudents: true,
          },
          actorId
        );

        successful++;
        importedCodes.push(cleanCode);
      } catch (err: unknown) {
        failed++;
        errors.push({
          code: cleanCode,
          error: err instanceof Error ? err.message : 'Unknown creation error',
        });
      }
    }

    this.savePersistentData();
    return { successful, skipped, failed, errors, importedCodes };
  }

  // ==========================================
  // LECTURER DIRECTORY & ASSIGNMENTS
  // ==========================================
  getLecturers(): (UserProfile & { departmentName?: string; assignedCoursesCount?: number; assignedCourses?: string[] })[] {
    this.ensureFreshData();
    const lecturers = this.profiles.filter(
      (p) => p.primaryRole === 'LECTURER' || p.assignedRoles.includes('LECTURER')
    );
    return lecturers.map((lec) => {
      const dept = this.departments.find((d) => d.id === lec.departmentId);
      const offerings = this.courseOfferings.filter(
        (o) => o.primaryLecturerId === lec.id || o.assignedLecturerIds?.includes(lec.id)
      );
      const courseCodes = offerings
        .map((o) => this.courses.find((c) => c.id === o.courseId)?.code)
        .filter(Boolean) as string[];

      return {
        ...lec,
        departmentName: dept?.name || 'General Academic',
        assignedCoursesCount: offerings.length,
        assignedCourses: Array.from(new Set(courseCodes)),
      };
    });
  }

  createLecturer(
    data: {
      firstName: string;
      lastName: string;
      email: string;
      departmentId: string;
      facultyId?: string;
      staffId?: string;
    },
    actorId: string
  ): UserProfile {
    this.ensureFreshData();
    const cleanEmail = data.email.trim().toLowerCase();
    if (this.profiles.some((p) => p.email.toLowerCase() === cleanEmail)) {
      throw new Error(`User with email "${cleanEmail}" already exists.`);
    }

    const dept = this.departments.find((d) => d.id === data.departmentId);
    const facultyId = data.facultyId || dept?.facultyId || 'fac-comp';

    const newLecturer: UserProfile = {
      id: `user-lec-${Date.now()}`,
      email: cleanEmail,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      primaryRole: 'LECTURER',
      assignedRoles: ['LECTURER'],
      departmentId: data.departmentId,
      facultyId,
      staffId: data.staffId?.trim(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.profiles.unshift(newLecturer);

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_CREATED_LECTURER',
      entityType: 'user_profiles',
      entityId: newLecturer.id,
      details: { name: `${newLecturer.firstName} ${newLecturer.lastName}`, email: cleanEmail },
    });

    this.savePersistentData();
    return newLecturer;
  }

  updateLecturer(
    lecturerId: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      departmentId: string;
      isActive: boolean;
      staffId: string;
    }>,
    actorId: string
  ): UserProfile {
    this.ensureFreshData();
    const lecturer = this.profiles.find((p) => p.id === lecturerId);
    if (!lecturer) throw new Error('Lecturer not found');

    if (data.email && data.email.trim().toLowerCase() !== lecturer.email.toLowerCase()) {
      const cleanEmail = data.email.trim().toLowerCase();
      if (this.profiles.some((p) => p.id !== lecturerId && p.email.toLowerCase() === cleanEmail)) {
        throw new Error(`Email "${cleanEmail}" is already used by another account.`);
      }
      lecturer.email = cleanEmail;
    }
    if (data.firstName) lecturer.firstName = data.firstName.trim();
    if (data.lastName) lecturer.lastName = data.lastName.trim();
    if (data.departmentId) lecturer.departmentId = data.departmentId;
    if (data.isActive !== undefined) lecturer.isActive = data.isActive;
    if (data.staffId !== undefined) lecturer.staffId = data.staffId.trim();

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_UPDATED_LECTURER',
      entityType: 'user_profiles',
      entityId: lecturerId,
      details: { ...data },
    });

    this.savePersistentData();
    return lecturer;
  }

  toggleLecturerActive(lecturerId: string, isActive: boolean, actorId: string): UserProfile {
    const lecturer = this.profiles.find((p) => p.id === lecturerId);
    if (!lecturer) throw new Error('Lecturer not found');
    lecturer.isActive = isActive;

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: isActive ? 'ADMIN_ACTIVATED_LECTURER' : 'ADMIN_DEACTIVATED_LECTURER',
      entityType: 'user_profiles',
      entityId: lecturerId,
    });

    this.savePersistentData();
    return lecturer;
  }

  assignLecturerToCourseOffering(
    courseOfferingId: string,
    lecturerId: string,
    actorId: string
  ): CourseOffering {
    const offering = this.courseOfferings.find((o) => o.id === courseOfferingId);
    if (!offering) throw new Error('Course offering not found');

    const lecturer = this.profiles.find((p) => p.id === lecturerId);
    if (!lecturer) throw new Error('Lecturer profile not found');

    offering.primaryLecturerId = lecturerId;
    if (!offering.assignedLecturerIds) offering.assignedLecturerIds = [];
    if (!offering.assignedLecturerIds.includes(lecturerId)) {
      offering.assignedLecturerIds.push(lecturerId);
    }

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ASSIGNED_LECTURER_TO_OFFERING',
      entityType: 'course_offerings',
      entityId: courseOfferingId,
      details: { lecturerId, lecturerName: `${lecturer.firstName} ${lecturer.lastName}` },
    });

    this.savePersistentData();
    return offering;
  }

  ensureDepartment(params: { name: string; facultyId?: string; code?: string }): Department {
    const cleanName = params.name.trim();
    if (!cleanName) throw new Error('Department name cannot be empty.');

    const existing = this.departments.find(
      (d) =>
        d.name.toLowerCase() === cleanName.toLowerCase() ||
        (params.code && d.code.toLowerCase() === params.code.trim().toLowerCase())
    );
    if (existing) return existing;

    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const codeGuess =
      params.code?.trim().toUpperCase() ||
      cleanName
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) ||
      'DEPT';

    const newDept: Department = {
      id: `dept-${slug}`,
      facultyId: params.facultyId || 'fac-comp',
      code: codeGuess,
      name: cleanName,
    };
    this.departments.push(newDept);
    this.savePersistentData();
    return newDept;
  }

  assignCourseManuallyToLecturer(
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
  ): { course: Course; offering: CourseOffering; createdNewCourse: boolean } {
    const lecturer = this.profiles.find((p) => p.id === params.lecturerId);
    if (!lecturer) throw new Error('Lecturer profile not found');

    const rawCode = params.courseCode.trim().toUpperCase();
    if (!rawCode) throw new Error('Course code is required');

    // Normalize e.g. "CSC201" -> "CSC 201" if no space between letters and digits
    const normalizedCode = rawCode.replace(/^([A-Z]{2,5})\s*(\d{3,4}[A-Z]?)$/, '$1 $2');
    const stripped = normalizedCode.replace(/\s+/g, '');

    let course = this.courses.find(
      (c) => c.code.trim().toUpperCase().replace(/\s+/g, '') === stripped
    );
    let createdNewCourse = false;

    if (!course) {
      const cleanTitle = params.courseTitle?.trim();
      if (!cleanTitle) {
        throw new Error(`Course "${normalizedCode}" does not exist yet. Please enter a course title to create and assign it.`);
      }

      let resolvedDeptId = params.departmentId;
      if (params.departmentName?.trim()) {
        const dept = this.ensureDepartment({
          name: params.departmentName,
          facultyId: params.facultyId || lecturer.facultyId || 'fac-comp',
        });
        resolvedDeptId = dept.id;
      }
      if (!resolvedDeptId) {
        resolvedDeptId = lecturer.departmentId || 'dept-csc';
      }

      course = this.createCourse(
        {
          code: normalizedCode,
          title: cleanTitle,
          creditUnits: Number(params.creditUnits) || 2,
          departmentId: resolvedDeptId,
          level: (params.level || 100) as 100 | 200 | 300 | 400 | 500,
        },
        actorId
      );
      createdNewCourse = true;
    }

    let offering = this.courseOfferings.find((o) => o.courseId === course!.id);
    if (!offering) {
      offering = {
        id: `offering-${course.code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
        courseId: course.id,
        academicSessionId: 'sess-2026-first',
        semesterId: 'sem-2026-1',
        primaryLecturerId: params.lecturerId,
        assignedLecturerIds: [params.lecturerId],
        isActive: true,
      };
      this.courseOfferings.push(offering);
    } else {
      offering.primaryLecturerId = params.lecturerId;
      if (!offering.assignedLecturerIds) offering.assignedLecturerIds = [];
      if (!offering.assignedLecturerIds.includes(params.lecturerId)) {
        offering.assignedLecturerIds.push(params.lecturerId);
      }
    }

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ASSIGNED_COURSE_MANUALLY_TO_LECTURER',
      entityType: 'course_offerings',
      entityId: offering.id,
      details: {
        courseCode: course.code,
        courseTitle: course.title,
        createdNewCourse,
        lecturerId: params.lecturerId,
        lecturerName: `${lecturer.firstName} ${lecturer.lastName}`,
      },
    });

    this.savePersistentData();
    return { course, offering, createdNewCourse };
  }

  // ==========================================
  // TIMETABLE MANAGEMENT
  // ==========================================
  getTimetablesWithDetails() {
    return this.timetables.map((tt) => {
      const offering = this.getOfferingById(tt.courseOfferingId);
      const classroom = this.classrooms.find((c) => c.id === tt.classroomId);
      return {
        ...tt,
        offering,
        course: offering?.course,
        lecturer: offering?.primaryLecturer,
        classroom,
        venueDisplay: tt.venue || classroom?.code || classroom?.building || 'Lecture Hall',
      };
    });
  }

  createTimetableEntry(
    data: {
      courseOfferingId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      classroomId?: string;
      venue?: string;
      isRecurring?: boolean;
    },
    actorId: string
  ): TimetableEntry {
    const id = `tt_${Date.now()}`;
    const newEntry: TimetableEntry = {
      id,
      courseOfferingId: data.courseOfferingId,
      dayOfWeek: Number(data.dayOfWeek) || 1,
      startTime: data.startTime,
      endTime: data.endTime,
      classroomId: data.classroomId || 'room-lh101',
      venue: data.venue || 'Lecture Hall 101',
      isRecurring: data.isRecurring !== false,
    };

    this.timetables.push(newEntry);

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'CREATED_TIMETABLE_ENTRY',
      entityType: 'timetables',
      entityId: id,
      details: { ...data },
    });

    this.savePersistentData();
    return newEntry;
  }

  updateTimetableEntry(
    id: string,
    data: Partial<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      classroomId?: string;
      venue?: string;
      isRecurring?: boolean;
    }>,
    actorId: string
  ): TimetableEntry {
    const entry = this.timetables.find((t) => t.id === id);
    if (!entry) throw new Error('Timetable entry not found');

    if (data.dayOfWeek !== undefined) entry.dayOfWeek = Number(data.dayOfWeek);
    if (data.startTime) entry.startTime = data.startTime;
    if (data.endTime) entry.endTime = data.endTime;
    if (data.classroomId) entry.classroomId = data.classroomId;
    if (data.venue !== undefined) entry.venue = data.venue;
    if (data.isRecurring !== undefined) entry.isRecurring = data.isRecurring;

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'UPDATED_TIMETABLE_ENTRY',
      entityType: 'timetables',
      entityId: id,
      details: { ...data },
    });

    this.savePersistentData();
    return entry;
  }

  deleteTimetableEntry(id: string, actorId: string): boolean {
    const idx = this.timetables.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Timetable entry not found');
    this.timetables.splice(idx, 1);

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'DELETED_TIMETABLE_ENTRY',
      entityType: 'timetables',
      entityId: id,
    });

    this.savePersistentData();
    return true;
  }

  // ==========================================
  // STUDENT MATRICULATION NUMBER VERIFICATION
  // ==========================================
  verifyStudentMatric(matric: string): {
    found: boolean;
    student?: {
      id: string;
      profileId: string;
      matricNumber: string;
      fullName: string;
      firstName: string;
      lastName: string;
      departmentName: string;
      departmentCode: string;
      facultyName: string;
      level: number;
      email: string;
      isActive: boolean;
      faceEnrolled: boolean;
      faceEnrolledAt?: string;
    };
    error?: string;
  } {
    const cleanMatric = matric.trim().toUpperCase();
    if (!cleanMatric) {
      return { found: false, error: 'Please enter a valid matriculation number.' };
    }

    const student = this.getStudentByMatric(cleanMatric);
    if (!student || !student.profile) {
      return {
        found: false,
        error: `Matriculation number "${cleanMatric}" was not found in the CUSTECH student registry. Please confirm your number or contact the ICT Administrator.`,
      };
    }

    if (!student.profile.isActive) {
      return {
        found: false,
        error: `Account for "${cleanMatric}" is currently deactivated or suspended. Please contact the Faculty Office.`,
      };
    }

    const dept = this.departments.find((d) => d.id === student.profile?.departmentId);
    const fac = this.faculties.find((f) => f.id === student.profile?.facultyId || f.id === dept?.facultyId);
    const faceProfile = this.faceProfiles.find((fp) => fp.studentId === student.id);

    return {
      found: true,
      student: {
        id: student.id,
        profileId: student.profile.id,
        matricNumber: student.matricNumber,
        fullName: `${student.profile.firstName} ${student.profile.lastName}`,
        firstName: student.profile.firstName,
        lastName: student.profile.lastName,
        departmentName: dept?.name || 'Computer Science',
        departmentCode: dept?.code || 'CSC',
        facultyName: fac?.name || 'Faculty of Computing and Mathematical Sciences',
        level: student.currentLevel,
        email: student.profile.email,
        isActive: student.profile.isActive,
        faceEnrolled: Boolean(faceProfile),
        faceEnrolledAt: faceProfile?.enrolledAt,
      },
    };
  }

  // ==========================================
  // FACIAL BIOMETRIC ENROLLMENT & VERIFICATION
  // ==========================================
  getFaceProfileStatus(studentIdOrProfileId: string): {
    enrolled: boolean;
    enrolledAt?: string;
    isLocked?: boolean;
    sampleCount?: number;
    thumbnailDataUrl?: string;
  } {
    const student =
      this.getStudentById(studentIdOrProfileId) ||
      this.getStudentByProfileId(studentIdOrProfileId);
    if (!student) return { enrolled: false };
    const fp = this.faceProfiles.find((f) => f.studentId === student.id);
    if (!fp) return { enrolled: false };
    return {
      enrolled: true,
      enrolledAt: fp.enrolledAt,
      isLocked: fp.isLocked,
      sampleCount: fp.sampleCount,
      thumbnailDataUrl: fp.thumbnailDataUrl,
    };
  }

  getEnrolledFaceStudentIds(): string[] {
    return this.faceProfiles.map((fp) => fp.studentId);
  }

  private recordBiometricFraudAlert(params: {
    sessionId?: string;
    alertType: 'BIOMETRIC_PROXY_ATTEMPT' | 'BIOMETRIC_MISMATCH';
    matchedMatricNumbers: string[];
    matchedStudentNames: string[];
    riskReason: string;
    courseCode?: string;
  }): void {
    const session = params.sessionId ? this.getSessionById(params.sessionId) : undefined;
    const offering = session ? this.getOfferingById(session.courseOfferingId) : undefined;
    const courseCode = params.courseCode || offering?.course?.code || 'BIOMETRIC';

    this.deviceCollisionAlerts.unshift({
      id: `alert_bio_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sessionId: params.sessionId || 'biometric-integrity',
      deviceFingerprintHash: `bio_guard_${Date.now().toString(36)}`,
      matchedMatricNumbers: Array.from(new Set(params.matchedMatricNumbers)),
      matchedStudentNames: Array.from(new Set(params.matchedStudentNames)),
      sessionCode: courseCode,
      courseCode,
      attemptCount: 1,
      alertType: params.alertType,
      deviceType: 'Biometric Camera',
      browser: 'Face Verification Guard',
      os: 'Integrity Engine',
      riskLevel: 'HIGH',
      riskReason: params.riskReason,
      isReviewed: false,
      createdAt: new Date().toISOString(),
    });
  }

  async enrollStudentFace(params: {
    studentIdOrProfileId: string;
    descriptor: number[];
    sampleCount?: number;
    actorProfileId: string;
    thumbnailDataUrl?: string;
    attendancePin?: string;
    requirePinVerification?: boolean;
  }): Promise<{
    success: boolean;
    message: string;
    enrolledAt?: string;
  }> {
    if (!isValidFaceDescriptor(params.descriptor)) {
      return {
        success: false,
        message: 'Invalid facial biometric descriptor captured. Please rescan clearly facing the camera.',
      };
    }

    const student =
      this.getStudentById(params.studentIdOrProfileId) ||
      this.getStudentByProfileId(params.studentIdOrProfileId) ||
      this.getStudentByMatric(params.studentIdOrProfileId);

    if (!student || !student.profile) {
      return { success: false, message: 'Student profile not found in CUSTECH registry.' };
    }

    // Check if already enrolled & locked
    const existing = this.faceProfiles.find((fp) => fp.studentId === student.id);
    if (existing && existing.isLocked) {
      return {
        success: false,
        message:
          'Face ID is already registered and locked for this student. Contact the ICT Administrator or HOD to authorize a biometric reset.',
      };
    }

    // Optional PIN check for unauthenticated QR check-in initial enrollment
    if (params.requirePinVerification) {
      const cleanPin = (params.attendancePin || '').trim();
      if (cleanPin.length !== 4) {
        return {
          success: false,
          message: 'Please enter your confidential 4-digit Attendance PIN to authorize initial Face ID enrollment.',
        };
      }
      const isPinValid = await verifyAttendancePin(cleanPin, student.attendancePinHash);
      if (!isPinValid) {
        this.logAudit({
          actorId: student.profileId,
          action: 'FAILED_PIN_FOR_FACE_ENROLLMENT',
          entityType: 'biometric_face_profiles',
          entityId: student.id,
          details: { matricNumber: student.matricNumber },
        });
        this.savePersistentData();
        return {
          success: false,
          message: 'Invalid 4-digit Attendance PIN. Face ID enrollment was not authorized.',
        };
      }
    }

    // Anti-Proxy Check: Prevent the same person from enrolling their face onto another student's matric number
    for (const other of this.faceProfiles) {
      if (other.studentId === student.id) continue;
      const dist = computeEuclideanDistance(other.descriptor, params.descriptor);
      if (dist < DUPLICATE_FACE_COLLISION_THRESHOLD) {
        const otherStudent = this.getStudentById(other.studentId);
        const otherName = otherStudent?.profile
          ? `${otherStudent.profile.firstName} ${otherStudent.profile.lastName}`
          : other.matricNumber;
        const targetName = `${student.profile.firstName} ${student.profile.lastName}`;

        this.recordBiometricFraudAlert({
          alertType: 'BIOMETRIC_PROXY_ATTEMPT',
          matchedMatricNumbers: [student.matricNumber, other.matricNumber],
          matchedStudentNames: [targetName, otherName],
          riskReason: `Duplicate facial biometric enrollment blocked: Face captured for ${student.matricNumber} matches already registered student ${other.matricNumber} (distance ${dist.toFixed(3)}).`,
        });

        this.logAudit({
          actorId: params.actorProfileId,
          action: 'BIOMETRIC_DUPLICATE_ENROLLMENT_BLOCKED',
          entityType: 'biometric_face_profiles',
          entityId: student.id,
          details: {
            targetMatric: student.matricNumber,
            conflictingMatric: other.matricNumber,
            distance: Number(dist.toFixed(4)),
          },
        });
        this.savePersistentData();

        return {
          success: false,
          message: `Biometric integrity violation: This face is already registered to another student (${other.matricNumber}). One face cannot be linked to multiple matriculation numbers.`,
        };
      }
    }

    const nowIso = new Date().toISOString();
    const profileRecord: BiometricFaceProfile = {
      id: existing?.id || `face_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      studentId: student.id,
      matricNumber: student.matricNumber,
      descriptor: params.descriptor,
      sampleCount: params.sampleCount || 3,
      enrolledAt: nowIso,
      enrolledBy: params.actorProfileId,
      isLocked: true,
      thumbnailDataUrl: params.thumbnailDataUrl,
    };

    if (existing) {
      const idx = this.faceProfiles.findIndex((fp) => fp.studentId === student.id);
      this.faceProfiles[idx] = profileRecord;
    } else {
      this.faceProfiles.push(profileRecord);
    }

    this.logAudit({
      actorId: params.actorProfileId,
      action: 'FACE_ID_ENROLLED',
      entityType: 'biometric_face_profiles',
      entityId: profileRecord.id,
      details: {
        studentId: student.id,
        matricNumber: student.matricNumber,
        sampleCount: profileRecord.sampleCount,
      },
    });

    this.savePersistentData();
    return {
      success: true,
      message: `Face ID successfully enrolled and locked for ${student.profile.firstName} ${student.profile.lastName} (${student.matricNumber}).`,
      enrolledAt: nowIso,
    };
  }

  resetStudentFace(studentId: string, actorId: string): boolean {
    const idx = this.faceProfiles.findIndex((fp) => fp.studentId === studentId);
    const student = this.getStudentById(studentId);
    if (idx === -1) return false;

    const removed = this.faceProfiles[idx];
    this.faceProfiles.splice(idx, 1);

    this.logAudit({
      actorId,
      action: 'FACE_ID_RESET_BY_ADMIN',
      entityType: 'biometric_face_profiles',
      entityId: removed.id,
      details: {
        studentId,
        matricNumber: student?.matricNumber || removed.matricNumber,
      },
    });

    this.savePersistentData();
    return true;
  }

  verifyStudentFaceForAttendance(params: {
    studentId: string;
    sessionId?: string;
    faceVerification?: FaceVerificationSubmission;
  }): {
    verified: boolean;
    skipped?: boolean;
    code?: 'FACE_NOT_ENROLLED' | 'FACE_MISMATCH' | 'LIVENESS_FAILED' | 'BIOMETRIC_PROXY_COLLISION' | 'MISSING_SCAN';
    confidence?: number;
    distance?: number;
    message: string;
  } {
    if (this.systemSettings.requireFacialVerification === false) {
      return {
        verified: false,
        skipped: true,
        message: 'Facial verification disabled by institutional policy.',
      };
    }

    const student = this.getStudentById(params.studentId);
    if (!student || !student.profile) {
      return {
        verified: false,
        code: 'MISSING_SCAN',
        message: 'Student record not found for facial verification.',
      };
    }

    const enrolled = this.faceProfiles.find((fp) => fp.studentId === student.id);
    if (!enrolled) {
      return {
        verified: false,
        code: 'FACE_NOT_ENROLLED',
        message: `Face ID is not enrolled for ${student.matricNumber}. Please complete your Face ID registration before marking attendance.`,
      };
    }

    const fv = params.faceVerification;
    if (!fv || !isValidFaceDescriptor(fv.descriptor)) {
      return {
        verified: false,
        code: 'MISSING_SCAN',
        message: 'Live facial verification scan is required to mark attendance.',
      };
    }

    if (!fv.livenessPassed) {
      return {
        verified: false,
        code: 'LIVENESS_FAILED',
        message: 'Liveness check did not pass. Please blink naturally or move slightly in front of a live camera (photos/screenshots are rejected).',
      };
    }

    // 1. Check same-session cross-student face reuse BEFORE confirming match
    if (params.sessionId) {
      const sessionMatch = this.sessionLiveDescriptors.find(
        (sd) =>
          sd.sessionId === params.sessionId &&
          sd.studentId !== student.id &&
          computeEuclideanDistance(sd.descriptor, fv.descriptor) < DUPLICATE_FACE_COLLISION_THRESHOLD
      );

      if (sessionMatch) {
        const otherStudent = this.getStudentById(sessionMatch.studentId);
        const targetName = `${student.profile.firstName} ${student.profile.lastName}`;
        const otherName = otherStudent?.profile
          ? `${otherStudent.profile.firstName} ${otherStudent.profile.lastName}`
          : sessionMatch.matricNumber;

        this.recordBiometricFraudAlert({
          sessionId: params.sessionId,
          alertType: 'BIOMETRIC_PROXY_ATTEMPT',
          matchedMatricNumbers: [student.matricNumber, sessionMatch.matricNumber],
          matchedStudentNames: [targetName, otherName],
          riskReason: `Same live face already marked attendance for ${sessionMatch.matricNumber} in this session and attempted to mark for ${student.matricNumber}. Blocked for academic integrity.`,
        });
        this.logAudit({
          actorId: student.profileId,
          action: 'BIOMETRIC_PROXY_BLOCKED_SAME_SESSION',
          entityType: 'attendance_records',
          entityId: params.sessionId,
          details: {
            attemptedMatric: student.matricNumber,
            alreadyMarkedMatric: sessionMatch.matricNumber,
          },
        });
        this.savePersistentData();

        return {
          verified: false,
          code: 'BIOMETRIC_PROXY_COLLISION',
          message: `Academic Integrity Alert: This face was already used to mark attendance for ${sessionMatch.matricNumber} in this lecture session. Proxy attendance has been blocked and logged.`,
        };
      }
    }

    // 2. Compare live descriptor against student's enrolled descriptor
    const threshold = this.systemSettings.facialMatchThreshold ?? DEFAULT_FACIAL_MATCH_THRESHOLD;
    const distance = computeEuclideanDistance(enrolled.descriptor, fv.descriptor);
    const confidence = distanceToConfidencePercent(distance);

    if (distance > threshold) {
      // Check if the live face actually belongs to another enrolled student (impersonation / friend marking)
      let matchedOther: { matric: string; name: string; dist: number } | null = null;
      for (const other of this.faceProfiles) {
        if (other.studentId === student.id) continue;
        const d = computeEuclideanDistance(other.descriptor, fv.descriptor);
        if (d < threshold && (!matchedOther || d < matchedOther.dist)) {
          const os = this.getStudentById(other.studentId);
          matchedOther = {
            matric: other.matricNumber,
            name: os?.profile ? `${os.profile.firstName} ${os.profile.lastName}` : other.matricNumber,
            dist: d,
          };
        }
      }

      const targetName = `${student.profile.firstName} ${student.profile.lastName}`;
      if (matchedOther) {
        this.recordBiometricFraudAlert({
          sessionId: params.sessionId,
          alertType: 'BIOMETRIC_PROXY_ATTEMPT',
          matchedMatricNumbers: [student.matricNumber, matchedOther.matric],
          matchedStudentNames: [targetName, matchedOther.name],
          riskReason: `Proxy attempt detected: ${matchedOther.name} (${matchedOther.matric}) tried to verify attendance for ${targetName} (${student.matricNumber}).`,
        });
      } else {
        this.recordBiometricFraudAlert({
          sessionId: params.sessionId,
          alertType: 'BIOMETRIC_MISMATCH',
          matchedMatricNumbers: [student.matricNumber],
          matchedStudentNames: [targetName],
          riskReason: `Facial verification failed for ${student.matricNumber} (${confidence}% match, distance ${distance.toFixed(3)} > ${threshold}).`,
        });
      }

      this.logAudit({
        actorId: student.profileId,
        action: 'FACIAL_VERIFICATION_REJECTED',
        entityType: 'attendance_records',
        entityId: params.sessionId || student.id,
        details: {
          matricNumber: student.matricNumber,
          distance: Number(distance.toFixed(4)),
          confidence,
          matchedOtherMatric: matchedOther?.matric,
        },
      });
      this.savePersistentData();

      return {
        verified: false,
        code: 'FACE_MISMATCH',
        distance,
        confidence,
        message: matchedOther
          ? `Facial verification failed: The face scanned belongs to ${matchedOther.matric}, not ${student.matricNumber}. Marking attendance for another student is prohibited and has been logged.`
          : `Facial verification failed (${confidence}% match). Your face does not match the registered student profile for ${student.matricNumber}. Ensure good lighting and face the camera directly.`,
      };
    }

    return {
      verified: true,
      distance,
      confidence,
      message: `Face verified (${confidence}% match).`,
    };
  }

  // ==========================================
  // INVESTIGATE DEVICE COLLISION ALERTS
  // ==========================================
  investigateDeviceAlert(
    alertId: string,
    reviewerId: string,
    action: 'CLEARED' | 'FLAGGED_FRAUD',
    reviewNotes?: string
  ): DeviceCollisionAlert {
    const alert = this.deviceCollisionAlerts.find((a) => a.id === alertId);
    if (!alert) throw new Error('Alert not found');

    alert.isReviewed = true;
    alert.riskLevel = action === 'FLAGGED_FRAUD' ? 'HIGH' : 'LOW';
    if (reviewNotes) alert.reviewNotes = reviewNotes;

    this.logAudit({
      actorId: reviewerId,
      actorRole: 'SUPER_ADMIN',
      action: 'REVIEWED_DEVICE_ALERT',
      entityType: 'device_collision_alerts',
      entityId: alertId,
      details: { action, reviewNotes },
    });

    this.savePersistentData();
    return alert;
  }

  getFaculties(): Faculty[] {
    return [...this.faculties];
  }

  getDepartments(): Department[] {
    return [...this.departments];
  }
}

// Global Singleton Database Instance (preserved across Next.js server bundles via globalThis)
const globalForDb = globalThis as typeof globalThis & { __custechDb?: CustechDatabase };
export const custechDb: CustechDatabase =
  typeof window === 'undefined'
    ? (globalForDb.__custechDb ??= new CustechDatabase())
    : new CustechDatabase();
