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
          if (Array.isArray(parsed.customCourses)) {
            parsed.customCourses.forEach((c: Course) => {
              const existingIdx = this.courses.findIndex((ec) => ec.id === c.id);
              if (existingIdx >= 0) this.courses[existingIdx] = c;
              else this.courses.unshift(c);
            });
          }
          if (Array.isArray(parsed.customCourseOfferings)) {
            parsed.customCourseOfferings.forEach((co: CourseOffering) => {
              const existingIdx = this.courseOfferings.findIndex((eco) => eco.id === co.id);
              if (existingIdx >= 0) this.courseOfferings[existingIdx] = co;
              else this.courseOfferings.push(co);
            });
          }
          if (Array.isArray(parsed.customTimetables)) {
            parsed.customTimetables.forEach((t: TimetableEntry) => {
              const existingIdx = this.timetables.findIndex((et) => et.id === t.id);
              if (existingIdx >= 0) this.timetables[existingIdx] = t;
              else this.timetables.push(t);
            });
          }
          if (Array.isArray(parsed.customSessions)) {
            parsed.customSessions.forEach((s: AttendanceSession) => {
              const existingIdx = this.sessions.findIndex((es) => es.id === s.id);
              if (existingIdx >= 0) this.sessions[existingIdx] = s;
              else this.sessions.unshift(s);
            });
          }
          if (Array.isArray(parsed.customAttendanceRecords)) {
            parsed.customAttendanceRecords.forEach((r: AttendanceRecord) => {
              if (!this.attendanceRecords.some((er) => er.id === r.id)) this.attendanceRecords.push(r);
            });
          }
          if (Array.isArray(parsed.customDeviceCollisionAlerts)) {
            parsed.customDeviceCollisionAlerts.forEach((a: DeviceCollisionAlert) => {
              const existingIdx = this.deviceCollisionAlerts.findIndex((ea) => ea.id === a.id);
              if (existingIdx >= 0) this.deviceCollisionAlerts[existingIdx] = a;
              else this.deviceCollisionAlerts.unshift(a);
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
        if (Array.isArray(parsed.customCourses)) {
          parsed.customCourses.forEach((c: Course) => {
            const existingIdx = this.courses.findIndex((ec) => ec.id === c.id);
            if (existingIdx >= 0) this.courses[existingIdx] = c;
            else this.courses.unshift(c);
          });
        }
        if (Array.isArray(parsed.customCourseOfferings)) {
          parsed.customCourseOfferings.forEach((co: CourseOffering) => {
            const existingIdx = this.courseOfferings.findIndex((eco) => eco.id === co.id);
            if (existingIdx >= 0) this.courseOfferings[existingIdx] = co;
            else this.courseOfferings.push(co);
          });
        }
        if (Array.isArray(parsed.customTimetables)) {
          parsed.customTimetables.forEach((t: TimetableEntry) => {
            const existingIdx = this.timetables.findIndex((et) => et.id === t.id);
            if (existingIdx >= 0) this.timetables[existingIdx] = t;
            else this.timetables.push(t);
          });
        }
        if (Array.isArray(parsed.customSessions)) {
          parsed.customSessions.forEach((s: AttendanceSession) => {
            const existingIdx = this.sessions.findIndex((es) => es.id === s.id);
            if (existingIdx >= 0) this.sessions[existingIdx] = s;
            else this.sessions.unshift(s);
          });
        }
        if (Array.isArray(parsed.customAttendanceRecords)) {
          parsed.customAttendanceRecords.forEach((r: AttendanceRecord) => {
            if (!this.attendanceRecords.some((er) => er.id === r.id)) this.attendanceRecords.push(r);
          });
        }
        if (Array.isArray(parsed.customDeviceCollisionAlerts)) {
          parsed.customDeviceCollisionAlerts.forEach((a: DeviceCollisionAlert) => {
            const existingIdx = this.deviceCollisionAlerts.findIndex((ea) => ea.id === a.id);
            if (existingIdx >= 0) this.deviceCollisionAlerts[existingIdx] = a;
            else this.deviceCollisionAlerts.unshift(a);
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
    const initialCourseIds = new Set(initialCourses.map((c) => c.id));
    const initialOfferingIds = new Set(initialCourseOfferings.map((o) => o.id));
    const initialTimetableIds = new Set(initialTimetable.map((t) => t.id));
    const initialSessionIds = new Set(initialSessions.map((s) => s.id));
    const initialRecordIds = new Set(initialAttendanceRecords.map((r) => r.id));
    const initialAlertIds = new Set(initialDeviceCollisionAlerts.map((a) => a.id));

    const customProfiles = this.profiles.filter((p) => !initialProfileIds.has(p.id));
    const customStudents = this.students.filter((s) => !initialStudentIds.has(s.id));
    const customEnrollments = this.enrollments.filter((e) => !initialEnrollmentIds.has(e.id));
    const customDepartments = this.departments.filter((d) => !initialDeptIds.has(d.id));
    const customCourses = this.courses.filter((c) => !initialCourseIds.has(c.id));
    const customCourseOfferings = this.courseOfferings.filter((o) => !initialOfferingIds.has(o.id));
    const customTimetables = this.timetables.filter((t) => !initialTimetableIds.has(t.id));
    const customSessions = this.sessions;
    const customAttendanceRecords = this.attendanceRecords.filter((r) => !initialRecordIds.has(r.id));
    const customDeviceCollisionAlerts = this.deviceCollisionAlerts;

    const payload = {
      customProfiles,
      customStudents,
      customEnrollments,
      customDepartments,
      customCourses,
      customCourseOfferings,
      customTimetables,
      customSessions,
      customAttendanceRecords,
      customDeviceCollisionAlerts,
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
    facultyId?: string;
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
    if (!this.profiles.some((p) => p.id === profile.id || p.matricNumber === profile.matricNumber)) {
      this.profiles.unshift(profile);
    }
    if (student && !this.students.some((s) => s.id === student.id || s.matricNumber === student.matricNumber)) {
      this.students.unshift({ ...student, profile });
    }
    this.savePersistentData();
  }

  syncClientSnapshot(data: {
    profiles?: UserProfile[];
    students?: Student[];
    departments?: Department[];
  }): void {
    if (Array.isArray(data.profiles)) {
      data.profiles.forEach((p) => {
        if (!this.profiles.some((ep) => ep.id === p.id || (p.matricNumber && ep.matricNumber === p.matricNumber))) {
          this.profiles.unshift(p);
        }
      });
    }
    if (Array.isArray(data.students)) {
      data.students.forEach((s) => {
        if (!this.students.some((es) => es.id === s.id || es.matricNumber === s.matricNumber)) {
          this.students.unshift(s);
        }
      });
    }
    if (Array.isArray(data.departments)) {
      data.departments.forEach((d) => {
        if (!this.departments.some((ed) => ed.id === d.id)) {
          this.departments.push(d);
        }
      });
    }
    this.savePersistentData();
  }

  getEnrolledStudentsForOffering(courseOfferingId: string): (Student & { profile?: UserProfile })[] {
    const enrolledIds = this.enrollments
      .filter((e) => e.courseOfferingId === courseOfferingId && e.isActive)
      .map((e) => e.studentId);
    return this.students
      .filter((s) => enrolledIds.includes(s.id))
      .map((s) => ({ ...s, profile: this.getProfileById(s.profileId) }));
  }

  enrollStudentInCourse(studentId: string, courseOfferingId: string, actorId?: string): Enrollment {
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

    const tempCode = generateTemporaryCode();
    const now = new Date();
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
      qrRotationSeconds: this.systemSettings.qrRotationSeconds || 20,
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
        isFlaggedSuspicious,
        flagReason,
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
    return this.courses.map((course) => {
      const dept = this.departments.find((d) => d.id === course.departmentId);
      const fac = this.faculties.find((f) => f.id === dept?.facultyId);
      const offerings = this.courseOfferings.filter((o) => o.courseId === course.id);
      const assignedLecturers = offerings.map((o) => {
        const p = this.getProfileById(o.primaryLecturerId);
        return p ? `${p.firstName} ${p.lastName}` : 'Unassigned';
      });

      return {
        ...course,
        departmentName: dept?.name || 'General Studies',
        facultyName: fac?.name || 'Computing & Applied Sciences',
        offeringsCount: offerings.length,
        assignedLecturers: Array.from(new Set(assignedLecturers)),
        primaryOffering: offerings[0],
      };
    });
  }

  createCourse(
    data: {
      code: string;
      title: string;
      creditUnits: number;
      departmentId: string;
      level: 100 | 200 | 300 | 400 | 500;
      description?: string;
    },
    actorId: string
  ): Course {
    const cleanCode = data.code.trim().toUpperCase();
    if (this.courses.some((c) => c.code.toUpperCase() === cleanCode)) {
      throw new Error(`Course code "${cleanCode}" already exists in the university catalogue.`);
    }

    const courseId = `course-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const newCourse: Course = {
      id: courseId,
      code: cleanCode,
      title: data.title.trim(),
      creditUnits: Number(data.creditUnits) || 2,
      departmentId: data.departmentId,
      level: data.level,
      isActive: true,
      description: data.description?.trim(),
    };

    this.courses.unshift(newCourse);

    // Auto-create a default offering for this course so it's ready for timetabling & attendance
    const offeringId = `offering-${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    if (!this.courseOfferings.some((o) => o.id === offeringId)) {
      this.courseOfferings.push({
        id: offeringId,
        courseId: newCourse.id,
        academicSessionId: 'sess-2026-first',
        semesterId: 'sem-2026-first',
        primaryLecturerId: actorId.startsWith('user-lec') ? actorId : 'user-lec-csc1',
        assignedLecturerIds: [actorId.startsWith('user-lec') ? actorId : 'user-lec-csc1'],
        isActive: true,
      });
    }

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: 'ADMIN_CREATED_COURSE',
      entityType: 'courses',
      entityId: courseId,
      details: { code: cleanCode, title: newCourse.title, departmentId: data.departmentId, level: data.level },
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
      description?: string;
      isActive: boolean;
      primaryLecturerId: string;
    }>,
    actorId: string
  ): Course {
    const course = this.courses.find((c) => c.id === courseId);
    if (!course) throw new Error('Course not found');

    if (data.code && data.code.trim().toUpperCase() !== course.code.toUpperCase()) {
      const cleanCode = data.code.trim().toUpperCase();
      if (this.courses.some((c) => c.id !== courseId && c.code.toUpperCase() === cleanCode)) {
        throw new Error(`Course code "${cleanCode}" is already used by another course.`);
      }
      course.code = cleanCode;
    }
    if (data.title) course.title = data.title.trim();
    if (data.creditUnits !== undefined) course.creditUnits = Number(data.creditUnits);
    if (data.departmentId) course.departmentId = data.departmentId;
    if (data.level) course.level = data.level;
    if (data.description !== undefined) course.description = data.description.trim();
    if (data.isActive !== undefined) course.isActive = data.isActive;

    if (data.primaryLecturerId) {
      const offerings = this.courseOfferings.filter((o) => o.courseId === courseId);
      offerings.forEach((off) => {
        off.primaryLecturerId = data.primaryLecturerId!;
        if (!off.assignedLecturerIds) off.assignedLecturerIds = [];
        if (!off.assignedLecturerIds.includes(data.primaryLecturerId!)) {
          off.assignedLecturerIds.push(data.primaryLecturerId!);
        }
      });
    }

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
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
      actorRole: 'SUPER_ADMIN',
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
      actorRole: 'SUPER_ADMIN',
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
      description?: string;
      lecturerEmailOrName?: string;
    }>,
    actorId: string
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
      const cleanCode = record.code?.trim().toUpperCase();
      if (!cleanCode) {
        failed++;
        errors.push({ code: 'UNKNOWN', error: 'Missing course code.' });
        continue;
      }

      if (seenBatchCodes.has(cleanCode)) {
        skipped++;
        errors.push({ code: cleanCode, error: 'Duplicate course code in uploaded batch.' });
        continue;
      }
      seenBatchCodes.add(cleanCode);

      if (!record.title?.trim()) {
        failed++;
        errors.push({ code: cleanCode, error: 'Course title is missing.' });
        continue;
      }

      if (this.courses.some((c) => c.code.toUpperCase() === cleanCode)) {
        skipped++;
        errors.push({ code: cleanCode, error: 'Course code already exists in university catalogue.' });
        continue;
      }

      try {
        let deptId = record.departmentId;
        if (!deptId && record.departmentName) {
          const dept = this.departments.find(
            (d) =>
              d.name.toLowerCase() === record.departmentName!.toLowerCase() ||
              d.code.toLowerCase() === record.departmentName!.toLowerCase()
          );
          if (dept) deptId = dept.id;
        }
        if (!deptId) deptId = 'dept-csc';

        const newCourse = this.createCourse(
          {
            code: cleanCode,
            title: record.title.trim(),
            creditUnits: Number(record.creditUnits) || 2,
            departmentId: deptId,
            level: (record.level || 100) as 100 | 200 | 300 | 400 | 500,
            description: record.description,
          },
          actorId
        );

        let lecturerId = 'user-lec-csc1';
        if (record.lecturerEmailOrName) {
          const lec = this.profiles.find(
            (p) =>
              (p.primaryRole === 'LECTURER' || p.assignedRoles.includes('LECTURER')) &&
              (p.email.toLowerCase() === record.lecturerEmailOrName!.toLowerCase() ||
                `${p.firstName} ${p.lastName}`.toLowerCase().includes(record.lecturerEmailOrName!.toLowerCase()))
          );
          if (lec) lecturerId = lec.id;
        }

        const offering = this.courseOfferings.find((o) => o.courseId === newCourse.id);
        if (offering) {
          offering.primaryLecturerId = lecturerId;
          offering.assignedLecturerIds = [lecturerId];
        }

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
      },
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

// Global Singleton Database Instance
export const custechDb = new CustechDatabase();
