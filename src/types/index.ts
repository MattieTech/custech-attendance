export type UserRole =
  | 'SUPER_ADMIN'
  | 'PRINCIPAL_OFFICER'
  | 'DEAN'
  | 'FACULTY_REP'
  | 'ASST_FACULTY_REP'
  | 'HOD'
  | 'LECTURER'
  | 'COURSE_REP'
  | 'ASSISTANT_COURSE_REP'
  | 'DEPARTMENT_REP'
  | 'STUDENT'
  | 'NON_ACADEMIC_STAFF';

export type SessionStatus =
  | 'SCHEDULED'
  | 'READY'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CLOSED'
  | 'FINALIZED'
  | 'CANCELLED'
  | 'REOPENED';

export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'EXCUSED'
  | 'PENDING';

export type AttendanceMethod =
  | 'DYNAMIC_QR'
  | 'TEMP_CODE'
  | 'KIOSK_PIN'
  | 'LECTURER_MANUAL'
  | 'ADMIN_ADJUSTMENT';

export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AssistedReason =
  | 'No smartphone'
  | 'Phone battery dead'
  | 'No internet / mobile data'
  | 'Device malfunction'
  | 'Lost / stolen device'
  | 'Other approved reason';

export type MaterialVisibility =
  | 'ALL_ENROLLED'
  | 'MIN_ATTENDANCE_75'
  | 'RELEASE_AFTER_LECTURE';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  primaryRole: UserRole;
  assignedRoles: UserRole[]; // All roles held concurrently by this user
  staffId?: string;          // Staff ID, e.g. 'CUSTECH/ACAD/004'
  matricNumber?: string;     // Student Matric No, e.g. '25L1CS1012' (UTME) or '25L2CS1028' (Direct Entry)
  isActive: boolean;
  departmentId?: string;
  facultyId?: string;
  createdAt: string;
}

export interface Faculty {
  id: string;
  code: string;
  name: string;
  deanId?: string;
}

export interface Department {
  id: string;
  facultyId: string;
  code: string;
  name: string;
  hodId?: string;
}

export interface Program {
  id: string;
  departmentId: string;
  code: string;
  name: string;
  durationYears: number;
}

export interface AcademicSession {
  id: string;
  name: string; // e.g. '2026/2027'
  isCurrent: boolean;
  startDate: string;
  endDate: string;
}

export interface Semester {
  id: string;
  academicSessionId: string;
  semesterType: 'FIRST' | 'SECOND';
  isCurrent: boolean;
  startDate: string;
  endDate: string;
}

export interface Student {
  id: string;
  profileId: string;
  matricNumber: string; // e.g. '25L1CS1234' (UTME) or '25L2CS1234' (Direct Entry)
  programId: string;
  currentLevel: 100 | 200 | 300 | 400 | 500;
  attendancePinHash: string; // bcrypt hash of 4-digit PIN
  profile?: UserProfile;
}

export interface Staff {
  id: string;
  profileId: string;
  staffNumber: string; // e.g. 'CUSTECH/ST/088'
  departmentId: string;
  isAcademic: boolean;
  designation: string;
  profile?: UserProfile;
}

export interface Classroom {
  id: string;
  code: string; // e.g. 'LH 101'
  building: string; // e.g. 'Faculty of Computing Complex'
  capacity: number;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  isActive: boolean;
}

export interface Course {
  id: string;
  departmentId: string;
  code: string; // e.g. 'CSC 201'
  title: string;
  creditUnits: number;
  level: 100 | 200 | 300 | 400 | 500;
  semesterType?: 'FIRST' | 'SECOND';
  academicSessionId?: string;
  isActive?: boolean;
  description?: string;
}

export interface CourseOffering {
  id: string;
  courseId: string;
  semesterId: string;
  primaryLecturerId: string;
  assignedLecturerIds?: string[];
  course?: Course;
  primaryLecturer?: UserProfile;
  academicSessionId?: string;
  isActive?: boolean;
}

export interface TimetableEntry {
  id: string;
  courseOfferingId: string;
  classroomId: string;
  dayOfWeek: number; // 1 = Monday, 5 = Friday
  startTime: string; // '10:00'
  endTime: string; // '12:00'
  courseOffering?: CourseOffering;
  classroom?: Classroom;
  venue?: string;
  isRecurring?: boolean;
}

export interface Enrollment {
  id: string;
  courseOfferingId: string;
  studentId: string;
  isActive: boolean;
  student?: Student;
}

export interface CourseRepresentative {
  id: string;
  courseOfferingId: string;
  studentId: string;
  canOperateKiosk: boolean;
  appointedAt: string;
}

export interface AttendanceSession {
  id: string;
  courseOfferingId: string;
  lecturerId: string;
  substituteLecturerId?: string;
  classroomId?: string;
  venue?: string;
  weekNumber?: number; // e.g. Week 1, Week 2...
  topicTitle?: string;
  date: string; // YYYY-MM-DD
  scheduledStart: string; // ISO
  scheduledEnd: string; // ISO
  actualStart?: string;
  actualClose?: string;
  status: SessionStatus;
  currentTempCode: string; // 6 chars, e.g. '7K4P92'
  tempCodeExpiresAt: string;
  isCodeActive?: boolean;
  previousCodes?: string[];
  qrRotationSeconds: number; // default 60s
  lateThresholdMinutes: number; // default 15m
  sessionSecretNonce: string; // HMAC secret
  cancellationReason?: string;
  courseOffering?: CourseOffering;
  classroom?: Classroom;
  lecturer?: UserProfile;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  method: AttendanceMethod;
  recordedBy: string; // profileId
  clientEventId?: string; // Idempotency
  assistedReason?: AssistedReason;
  deviceFingerprintHash?: string;
  ipAddress?: string;
  latitude?: number;
  longitude?: number;
  isFlaggedSuspicious: boolean;
  flagReason?: string;
  facialVerified?: boolean;
  facialConfidence?: number; // 0 - 100 similarity percentage
  facialDistance?: number; // Euclidean descriptor distance
  livenessVerified?: boolean;
  recordedAt: string;
  student?: Student;
}

export interface AttendanceCorrection {
  id: string;
  sessionId: string;
  studentId: string;
  reason: string;
  supportingDocUrl?: string;
  status: CorrectionStatus;
  reviewedBy?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  student?: Student;
  session?: AttendanceSession;
}

export interface SyllabusTopic {
  id: string;
  courseId: string;
  weekNumber: number;
  topicTitle: string;
  learningObjectives?: string;
  isCompleted?: boolean;
}

export interface SyllabusProgress {
  id: string;
  sessionId: string;
  topicId: string;
  isCompleted: boolean;
  lectureNotes?: string;
  recordedAt: string;
}

export interface CourseMaterial {
  id: string;
  courseOfferingId: string;
  title: string;
  description?: string;
  filePath: string;
  fileSizeBytes: number;
  mimeType: string;
  visibilityRule: MaterialVisibility;
  uploadedBy: string;
  createdAt: string;
}

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: AttendanceStatus;
  workingMinutes?: number;
  latitude?: number;
  longitude?: number;
}

export interface StaffLeaveRequest {
  id: string;
  staffId: string;
  leaveType: 'ANNUAL' | 'CASUAL' | 'SICK' | 'MATERNITY' | 'STUDY';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  createdAt: string;
}

export interface StaffFieldAssignment {
  id: string;
  staffId: string;
  destination: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvingOfficerId?: string;
}

export interface SystemSettings {
  qrRotationSeconds: number;
  attendanceDurationMinutes: number;
  lateThresholdMinutes: number;
  gracePeriodMinutes: number;
  minimumAttendanceWarningThreshold: number; // e.g. 70
  examEligibilityThreshold: number; // e.g. 75
  correctionWindowHours: number; // e.g. 48
  staffWorkStartTime: string; // '08:00'
  staffWorkEndTime: string; // '16:00'
  staffLateGraceMinutes: number; // 15
  requireFacialVerification?: boolean; // Require live facial scan for student attendance
  facialMatchThreshold?: number; // Euclidean distance cutoff (default 0.50, lower = stricter)
}

export interface AuditLog {
  id: string;
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// Token payload signed with HMAC-SHA256
export interface RotatingQrPayload {
  sessionId: string;
  courseCode: string;
  timestampWindow: number; // Floor(UnixTimestamp / RotationInterval)
  nonce: string;
  signature: string; // HMAC-SHA256 hex
}

// Kiosk input DTO
export interface KioskAttendanceDTO {
  sessionId: string;
  matricNumber: string;
  attendancePin: string;
  assistedReason?: AssistedReason;
  operatorProfileId?: string;
  clientEventId?: string;
}

// Medical Clinic Waiver Exemption
export interface MedicalWaiver {
  id: string;
  studentId: string;
  startDate: string; // ISO or YYYY-MM-DD
  endDate: string;
  hospitalName: string; // e.g. 'CUSTECH University Health Centre, Osara'
  diagnosisSummary: string;
  doctorName: string;
  doctorLicenseNo: string;
  approvedBy: string; // profileId
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  student?: Student;
}

// Anti-Fraud Device Abuse / Collision Alert
export interface DeviceCollisionAlert {
  id: string;
  sessionId: string;
  deviceFingerprintHash: string;
  matchedMatricNumbers: string[];
  matchedStudentNames?: string[];
  studentIds?: string[];
  sessionCode: string;
  courseCode?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  attemptCount: number;
  alertType?: 'DEVICE_COLLISION' | 'BIOMETRIC_PROXY_ATTEMPT' | 'BIOMETRIC_MISMATCH';
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReason?: string;
  isReviewed: boolean;
  reviewedBy?: string;
  reviewNotes?: string;
  actionTaken?: 'CLEARED' | 'FLAGGED_DISCIPLINARY';
  createdAt: string;
}

// In-App Notification System
export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'WARNING' | 'CRITICAL' | 'INFO' | 'WAIVER' | 'FRAUD';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

// Official Exam Clearance Docket / Hall Pass Model
export interface ExamDocketCourse {
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  totalSessionsHeld: number;
  attendedSessions: number;
  excusedSessions: number;
  attendancePercentage: number;
  isEligible: boolean;
  statusText: 'CLEARED' | 'BARRED - DEFICIENT' | 'APPROVED WAIVER';
}

export interface ExamDocket {
  docketNumber: string;
  academicSession: string;
  semester: string;
  studentName: string;
  matricNumber: string;
  facultyName: string;
  departmentName: string;
  level: number;
  isDirectEntry: boolean;
  passportPhotoUrl?: string;
  generatedAt: string;
  courses: ExamDocketCourse[];
  overallEligible: boolean;
  verificationToken: string; // Cryptographic verification string
}

// Student Facial Biometric Enrollment Profile
export interface BiometricFaceProfile {
  id: string;
  studentId: string;
  matricNumber: string;
  descriptor: number[]; // 128-dimensional face embedding
  sampleCount: number;
  enrolledAt: string;
  enrolledBy: string; // profileId
  isLocked: boolean;
  thumbnailDataUrl?: string;
}

// Live Facial Verification Payload submitted during attendance marking
export interface FaceVerificationSubmission {
  descriptor: number[]; // 128-dimensional live embedding
  livenessPassed: boolean;
  livenessChallenge: 'BLINK' | 'HEAD_TURN' | 'MULTI_FRAME_MOTION';
  blinkDetected?: boolean;
  motionScore?: number;
  capturedAt: string;
}

export interface SessionLiveDescriptor {
  sessionId: string;
  studentId: string;
  matricNumber: string;
  descriptor: number[];
  recordedAt: string;
}

