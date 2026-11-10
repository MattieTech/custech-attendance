import {
  UserProfile,
  Faculty,
  Department,
  Program,
  AcademicSession,
  Semester,
  Student,
  Staff,
  Classroom,
  Course,
  CourseOffering,
  TimetableEntry,
  Enrollment,
  CourseRepresentative,
  AttendanceSession,
  AttendanceRecord,
  AttendanceCorrection,
  SyllabusTopic,
  CourseMaterial,
  StaffAttendance,
  SystemSettings,
  AuditLog,
  MedicalWaiver,
  DeviceCollisionAlert,
  AppNotification,
} from '@/types';

// Genuine pre-hashed bcrypt PIN for '1234'
export const DEMO_PIN_HASH = '$2b$10$mocXvAT3LHjIoWCl6CVMEOmZkKdgtNSysQ9Ap88ah2MU2TwJuY18O';

export const initialFaculties: Faculty[] = [
  {
    id: 'fac-comp',
    code: 'FCMS',
    name: 'Faculty of Computing and Mathematical Sciences',
    deanId: 'user-dean',
  },
  {
    id: 'fac-eng',
    code: 'FENG',
    name: 'Faculty of Engineering',
  },
  {
    id: 'fac-sci',
    code: 'FSCI',
    name: 'Faculty of Science',
  },
];

export const initialDepartments: Department[] = [
  {
    id: 'dept-csc',
    facultyId: 'fac-comp',
    code: 'CSC',
    name: 'Computer Science',
    hodId: 'user-hod',
  },
  {
    id: 'dept-sen',
    facultyId: 'fac-comp',
    code: 'SEN',
    name: 'Software Engineering',
  },
  {
    id: 'dept-cys',
    facultyId: 'fac-comp',
    code: 'CYS',
    name: 'Cybersecurity',
  },
];

export const initialPrograms: Program[] = [
  {
    id: 'prog-csc',
    departmentId: 'dept-csc',
    code: 'B.Sc. CSC',
    name: 'Computer Science',
    durationYears: 4,
  },
  {
    id: 'prog-sen',
    departmentId: 'dept-sen',
    code: 'B.Eng. SEN',
    name: 'Software Engineering',
    durationYears: 5,
  },
];

export const initialAcademicSessions: AcademicSession[] = [
  {
    id: 'session-2026',
    name: '2026/2027',
    isCurrent: true,
    startDate: '2026-08-01',
    endDate: '2027-06-30',
  },
];

export const initialSemesters: Semester[] = [
  {
    id: 'sem-2026-1',
    academicSessionId: 'session-2026',
    semesterType: 'FIRST',
    isCurrent: true,
    startDate: '2026-08-15',
    endDate: '2026-12-18',
  },
];

export const initialProfiles: UserProfile[] = [
  {
    id: 'user-admin',
    email: 'admin@custech.edu.ng',
    staffId: 'CUSTECH/ADMIN/001',
    firstName: 'Faruq',
    lastName: 'Bello',
    phone: '+234 803 111 2233',
    primaryRole: 'SUPER_ADMIN',
    assignedRoles: ['SUPER_ADMIN'],
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user-vc',
    email: 'vc@custech.edu.ng',
    staffId: 'CUSTECH/EXEC/001',
    firstName: 'Prof. Abdulrahman',
    lastName: 'Salawu',
    phone: '+234 802 000 1122',
    primaryRole: 'PRINCIPAL_OFFICER',
    assignedRoles: ['PRINCIPAL_OFFICER', 'LECTURER'],
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user-dean',
    email: 'dean.computing@custech.edu.ng',
    staffId: 'CUSTECH/ACAD/001',
    firstName: 'Prof. M. O.',
    lastName: 'Yusuf',
    phone: '+234 803 444 5566',
    primaryRole: 'DEAN',
    assignedRoles: ['DEAN', 'LECTURER'],
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user-hod',
    email: 'hod.csc@custech.edu.ng',
    staffId: 'CUSTECH/ACAD/004',
    firstName: 'Dr. K. A.',
    lastName: 'Adeleke',
    phone: '+234 806 777 8899',
    primaryRole: 'HOD',
    assignedRoles: ['HOD', 'LECTURER'], // HOD + Lecturer taking multiple courses
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user-lecturer-1',
    email: 'doe@custech.edu.ng',
    staffId: 'CUSTECH/ACAD/012',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+234 814 123 4567',
    primaryRole: 'LECTURER',
    assignedRoles: ['LECTURER'],
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-01-12T08:00:00Z',
  },
  {
    id: 'user-lecturer-2',
    email: 'zainab.idris@custech.edu.ng',
    staffId: 'CUSTECH/ACAD/015',
    firstName: 'Zainab',
    lastName: 'Idris',
    phone: '+234 805 987 6543',
    primaryRole: 'LECTURER',
    assignedRoles: ['LECTURER'],
    departmentId: 'dept-sen',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-01-12T08:00:00Z',
  },
  {
    id: 'user-rep',
    email: 'rep.ibrahim@student.custech.edu.ng',
    matricNumber: '25L1CS1001',
    firstName: 'Ibrahim',
    lastName: 'Aliyu',
    phone: '+234 809 112 3344',
    primaryRole: 'STUDENT',
    assignedRoles: ['STUDENT', 'COURSE_REP'], // Student + Course Representative
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'user-asst-rep',
    email: 'chioma.adebayo@student.custech.edu.ng',
    matricNumber: '25L2CS1028',
    firstName: 'Chioma',
    lastName: 'Adebayo',
    phone: '+234 813 999 4433',
    primaryRole: 'STUDENT',
    assignedRoles: ['STUDENT', 'ASSISTANT_COURSE_REP'], // Direct Entry Student (DE 25L2CS1028)
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'user-dept-rep',
    email: 'kabir.mohammed@student.custech.edu.ng',
    matricNumber: '25L1CS1005',
    firstName: 'Mohammed',
    lastName: 'Kabir',
    phone: '+234 807 444 1122',
    primaryRole: 'STUDENT',
    assignedRoles: ['STUDENT', 'DEPARTMENT_REP'], // Student + Department Representative
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'user-stu-1',
    email: 'amina@student.custech.edu.ng',
    matricNumber: '25L1CS1014',
    firstName: 'Amina',
    lastName: 'Usman',
    phone: '+234 703 222 3344',
    primaryRole: 'STUDENT',
    assignedRoles: ['STUDENT'],
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'user-stu-2',
    email: 'emeka@student.custech.edu.ng',
    matricNumber: '25L1CS1029',
    firstName: 'Emeka',
    lastName: 'Okonkwo',
    phone: '+234 812 555 6677',
    primaryRole: 'STUDENT',
    assignedRoles: ['STUDENT'],
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'user-stu-3',
    email: 'maryam@student.custech.edu.ng',
    matricNumber: '25L1CS1045',
    firstName: 'Maryam',
    lastName: 'Yakubu',
    phone: '+234 808 333 4455',
    primaryRole: 'STUDENT',
    assignedRoles: ['STUDENT'],
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'user-staff',
    email: 'staff.sanni@custech.edu.ng',
    staffId: 'CUSTECH/NA/088',
    firstName: 'Sanni',
    lastName: 'Momoh',
    phone: '+234 802 444 8899',
    primaryRole: 'NON_ACADEMIC_STAFF',
    assignedRoles: ['NON_ACADEMIC_STAFF'],
    departmentId: 'dept-csc',
    facultyId: 'fac-comp',
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
  },
];

export const initialStudents: Student[] = [
  {
    id: 'stu-rep',
    profileId: 'user-rep',
    matricNumber: '25L1CS1001',
    programId: 'prog-csc',
    currentLevel: 200,
    attendancePinHash: DEMO_PIN_HASH,
  },
  {
    id: 'stu-1',
    profileId: 'user-stu-1',
    matricNumber: '25L1CS1014',
    programId: 'prog-csc',
    currentLevel: 200,
    attendancePinHash: DEMO_PIN_HASH,
  },
  {
    id: 'stu-2',
    profileId: 'user-stu-2',
    matricNumber: '25L1CS1029',
    programId: 'prog-csc',
    currentLevel: 200,
    attendancePinHash: DEMO_PIN_HASH,
  },
  {
    id: 'stu-3',
    profileId: 'user-stu-3',
    matricNumber: '25L1CS1045',
    programId: 'prog-csc',
    currentLevel: 200,
    attendancePinHash: DEMO_PIN_HASH,
  },
  {
    id: 'stu-asst-rep',
    profileId: 'user-asst-rep',
    matricNumber: '25L2CS1028',
    programId: 'prog-csc',
    currentLevel: 200,
    attendancePinHash: DEMO_PIN_HASH,
  },
  {
    id: 'stu-dept-rep',
    profileId: 'user-dept-rep',
    matricNumber: '25L1CS1005',
    programId: 'prog-csc',
    currentLevel: 200,
    attendancePinHash: DEMO_PIN_HASH,
  },
];

export const initialStaff: Staff[] = [
  {
    id: 'staff-dean',
    profileId: 'user-dean',
    staffNumber: 'CUSTECH/AC/001',
    departmentId: 'dept-csc',
    isAcademic: true,
    designation: 'Professor & Dean',
  },
  {
    id: 'staff-hod',
    profileId: 'user-hod',
    staffNumber: 'CUSTECH/AC/004',
    departmentId: 'dept-csc',
    isAcademic: true,
    designation: 'Associate Professor & HOD',
  },
  {
    id: 'staff-lecturer-1',
    profileId: 'user-lecturer-1',
    staffNumber: 'CUSTECH/AC/042',
    departmentId: 'dept-csc',
    isAcademic: true,
    designation: 'Senior Lecturer',
  },
  {
    id: 'staff-lecturer-2',
    profileId: 'user-lecturer-2',
    staffNumber: 'CUSTECH/AC/058',
    departmentId: 'dept-sen',
    isAcademic: true,
    designation: 'Lecturer I',
  },
  {
    id: 'staff-non-acad',
    profileId: 'user-staff',
    staffNumber: 'CUSTECH/NA/088',
    departmentId: 'dept-csc',
    isAcademic: false,
    designation: 'Senior Executive Officer',
  },
];

export const initialClassrooms: Classroom[] = [
  {
    id: 'room-lh101',
    code: 'LH 101',
    building: 'Computing Complex',
    capacity: 120,
    latitude: 7.7289,
    longitude: 6.2758,
    radiusMeters: 80,
    isActive: true,
  },
  {
    id: 'room-auda',
    code: 'Auditorium A',
    building: 'Central Lecture Complex',
    capacity: 350,
    latitude: 7.7295,
    longitude: 6.2764,
    radiusMeters: 100,
    isActive: true,
  },
  {
    id: 'room-lab2',
    code: 'Software Lab 2',
    building: 'Computing Annex',
    capacity: 60,
    latitude: 7.7291,
    longitude: 6.276,
    radiusMeters: 50,
    isActive: true,
  },
];

export const initialCourses: Course[] = [
  {
    id: 'course-csc201',
    departmentId: 'dept-csc',
    code: 'CSC 201',
    title: 'Data Structures and Algorithms',
    creditUnits: 3,
    level: 200,
  },
  {
    id: 'course-sen201',
    departmentId: 'dept-sen',
    code: 'SEN 201',
    title: 'Software Engineering Fundamentals',
    creditUnits: 2,
    level: 200,
  },
  {
    id: 'course-mth201',
    departmentId: 'dept-csc',
    code: 'MTH 201',
    title: 'Mathematical Methods I',
    creditUnits: 3,
    level: 200,
  },
  {
    id: 'course-phy201',
    departmentId: 'dept-csc',
    code: 'PHY 201',
    title: 'General Physics for Engineers',
    creditUnits: 2,
    level: 200,
  },
];

export const initialCourseOfferings: CourseOffering[] = [
  {
    id: 'offering-csc201',
    courseId: 'course-csc201',
    semesterId: 'sem-2026-1',
    primaryLecturerId: 'user-lecturer-1',
  },
  {
    id: 'offering-sen201',
    courseId: 'course-sen201',
    semesterId: 'sem-2026-1',
    primaryLecturerId: 'user-lecturer-2',
  },
  {
    id: 'offering-mth201',
    courseId: 'course-mth201',
    semesterId: 'sem-2026-1',
    primaryLecturerId: 'user-hod', // Dr. Adeleke (HOD) teaches MTH 201
  },
];

export const initialTimetable: TimetableEntry[] = [
  {
    id: 'tt-1',
    courseOfferingId: 'offering-csc201',
    classroomId: 'room-lh101',
    dayOfWeek: 4, // Thursday
    startTime: '10:00',
    endTime: '12:00',
  },
  {
    id: 'tt-2',
    courseOfferingId: 'offering-sen201',
    classroomId: 'room-lab2',
    dayOfWeek: 4, // Thursday
    startTime: '14:00',
    endTime: '16:00',
  },
  {
    id: 'tt-3',
    courseOfferingId: 'offering-mth201',
    classroomId: 'room-auda',
    dayOfWeek: 4, // Thursday
    startTime: '12:00',
    endTime: '14:00',
  },
];

export const initialEnrollments: Enrollment[] = [
  // CSC 201 enrollments (Reps + students)
  { id: 'enr-1', courseOfferingId: 'offering-csc201', studentId: 'stu-rep', isActive: true },
  { id: 'enr-2', courseOfferingId: 'offering-csc201', studentId: 'stu-1', isActive: true },
  { id: 'enr-3', courseOfferingId: 'offering-csc201', studentId: 'stu-2', isActive: true },
  { id: 'enr-4', courseOfferingId: 'offering-csc201', studentId: 'stu-3', isActive: true },
  { id: 'enr-4b', courseOfferingId: 'offering-csc201', studentId: 'stu-asst-rep', isActive: true },
  { id: 'enr-4c', courseOfferingId: 'offering-csc201', studentId: 'stu-dept-rep', isActive: true },
  // SEN 201 enrollments
  { id: 'enr-5', courseOfferingId: 'offering-sen201', studentId: 'stu-rep', isActive: true },
  { id: 'enr-6', courseOfferingId: 'offering-sen201', studentId: 'stu-1', isActive: true },
  { id: 'enr-7', courseOfferingId: 'offering-sen201', studentId: 'stu-2', isActive: true },
  { id: 'enr-8', courseOfferingId: 'offering-sen201', studentId: 'stu-3', isActive: true },
  { id: 'enr-8b', courseOfferingId: 'offering-sen201', studentId: 'stu-asst-rep', isActive: true },
  { id: 'enr-8c', courseOfferingId: 'offering-sen201', studentId: 'stu-dept-rep', isActive: true },
];

export const initialCourseReps: CourseRepresentative[] = [
  {
    id: 'rep-csc201',
    courseOfferingId: 'offering-csc201',
    studentId: 'stu-rep',
    canOperateKiosk: true,
    appointedAt: '2026-08-20T10:00:00Z',
  },
  {
    id: 'asst-rep-csc201',
    courseOfferingId: 'offering-csc201',
    studentId: 'stu-asst-rep',
    canOperateKiosk: true,
    appointedAt: '2026-08-20T10:00:00Z',
  },
];

export const initialSessions: AttendanceSession[] = [
  // Past CSC 201 session 1 (Week 1)
  {
    id: 'sess-csc-1',
    courseOfferingId: 'offering-csc201',
    lecturerId: 'user-lecturer-1',
    classroomId: 'room-lh101',
    date: '2026-08-20',
    scheduledStart: '2026-08-20T10:00:00Z',
    scheduledEnd: '2026-08-20T12:00:00Z',
    actualStart: '2026-08-20T10:04:00Z',
    actualClose: '2026-08-20T11:55:00Z',
    status: 'CLOSED',
    currentTempCode: '9X2K7L',
    tempCodeExpiresAt: '2026-08-20T11:55:00Z',
    qrRotationSeconds: 60,
    lateThresholdMinutes: 15,
    sessionSecretNonce: 'nonce_week1_csc201',
  },
  // Past CSC 201 session 2 (Week 2)
  {
    id: 'sess-csc-2',
    courseOfferingId: 'offering-csc201',
    lecturerId: 'user-lecturer-1',
    classroomId: 'room-lh101',
    date: '2026-08-27',
    scheduledStart: '2026-08-27T10:00:00Z',
    scheduledEnd: '2026-08-27T12:00:00Z',
    actualStart: '2026-08-27T10:02:00Z',
    actualClose: '2026-08-27T11:50:00Z',
    status: 'CLOSED',
    currentTempCode: '4M8P2W',
    tempCodeExpiresAt: '2026-08-27T11:50:00Z',
    qrRotationSeconds: 60,
    lateThresholdMinutes: 15,
    sessionSecretNonce: 'nonce_week2_csc201',
  },
  // Today's Live CSC 201 Session (Week 3 - ACTIVE)
  {
    id: 'sess-today-csc',
    courseOfferingId: 'offering-csc201',
    lecturerId: 'user-lecturer-1',
    classroomId: 'room-lh101',
    date: '2026-09-03',
    scheduledStart: '2026-09-03T10:00:00Z',
    scheduledEnd: '2026-09-03T12:00:00Z',
    actualStart: '2026-09-03T10:05:00Z',
    status: 'ACTIVE',
    currentTempCode: '7K4P92',
    tempCodeExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    qrRotationSeconds: 60,
    lateThresholdMinutes: 15,
    sessionSecretNonce: 'nonce_live_today_csc201',
  },
];

export const initialAttendanceRecords: AttendanceRecord[] = [
  // Session 1 records (All attended)
  {
    id: 'rec-1',
    sessionId: 'sess-csc-1',
    studentId: 'stu-rep',
    status: 'PRESENT',
    method: 'DYNAMIC_QR',
    recordedBy: 'user-rep',
    recordedAt: '2026-08-20T10:08:00Z',
    isFlaggedSuspicious: false,
  },
  {
    id: 'rec-2',
    sessionId: 'sess-csc-1',
    studentId: 'stu-1',
    status: 'PRESENT',
    method: 'DYNAMIC_QR',
    recordedBy: 'user-stu-1',
    recordedAt: '2026-08-20T10:09:00Z',
    isFlaggedSuspicious: false,
  },
  {
    id: 'rec-3',
    sessionId: 'sess-csc-1',
    studentId: 'stu-2',
    status: 'LATE',
    method: 'TEMP_CODE',
    recordedBy: 'user-stu-2',
    recordedAt: '2026-08-20T10:22:00Z',
    isFlaggedSuspicious: false,
  },
  {
    id: 'rec-4',
    sessionId: 'sess-csc-1',
    studentId: 'stu-3',
    status: 'PRESENT',
    method: 'KIOSK_PIN',
    recordedBy: 'user-lecturer-1',
    assistedReason: 'No smartphone',
    recordedAt: '2026-08-20T10:12:00Z',
    isFlaggedSuspicious: false,
  },
  // Session 2 records (Student 2 was absent)
  {
    id: 'rec-5',
    sessionId: 'sess-csc-2',
    studentId: 'stu-rep',
    status: 'PRESENT',
    method: 'DYNAMIC_QR',
    recordedBy: 'user-rep',
    recordedAt: '2026-08-27T10:07:00Z',
    isFlaggedSuspicious: false,
  },
  {
    id: 'rec-6',
    sessionId: 'sess-csc-2',
    studentId: 'stu-1',
    status: 'PRESENT',
    method: 'DYNAMIC_QR',
    recordedBy: 'user-stu-1',
    recordedAt: '2026-08-27T10:08:00Z',
    isFlaggedSuspicious: false,
  },
  {
    id: 'rec-7',
    sessionId: 'sess-csc-2',
    studentId: 'stu-3',
    status: 'PRESENT',
    method: 'KIOSK_PIN',
    recordedBy: 'user-rep',
    assistedReason: 'Phone battery dead',
    recordedAt: '2026-08-27T10:14:00Z',
    isFlaggedSuspicious: false,
  },
  // Note: stu-2 is absent for session 2
];

export const initialCorrections: AttendanceCorrection[] = [
  {
    id: 'cor-1',
    sessionId: 'sess-csc-2',
    studentId: 'stu-2',
    reason: 'I was in class sitting at the front, but my phone battery had died before Kiosk assistance ended.',
    status: 'PENDING',
    createdAt: '2026-08-28T14:30:00Z',
  },
];

export const initialSyllabusTopics: SyllabusTopic[] = [
  {
    id: 'syl-1',
    courseId: 'course-csc201',
    weekNumber: 1,
    topicTitle: 'Introduction to Asymptotic Notation & Complexity Analysis',
    learningObjectives: 'Big-O, Big-Omega, Big-Theta bounds; recursion trees and master theorem.',
    isCompleted: true,
  },
  {
    id: 'syl-2',
    courseId: 'course-csc201',
    weekNumber: 2,
    topicTitle: 'Linear Data Structures: Linked Lists, Stacks, Queues',
    learningObjectives: 'Singly and doubly linked lists, circular buffers, stack applications in parsing.',
    isCompleted: true,
  },
  {
    id: 'syl-3',
    courseId: 'course-csc201',
    weekNumber: 3,
    topicTitle: 'Tree Structures: Binary Trees & Binary Search Trees (BST)',
    learningObjectives: 'Tree traversal (pre, in, post order), BST insertion, deletion, and balancing.',
    isCompleted: false,
  },
  {
    id: 'syl-4',
    courseId: 'course-csc201',
    weekNumber: 4,
    topicTitle: 'Self-Balancing Trees (AVL Trees & Red-Black Trees)',
    learningObjectives: 'Rotations, height-balancing invariants.',
    isCompleted: false,
  },
];

export const initialMaterials: CourseMaterial[] = [
  {
    id: 'mat-1',
    courseOfferingId: 'offering-csc201',
    title: 'CSC 201 - Week 1 Lecture Slides: Asymptotic Analysis',
    description: 'Formal definitions of Big-O, Big-Theta, and Big-Omega with worked examples.',
    filePath: '/materials/csc201_week1.pdf',
    fileSizeBytes: 2450000,
    mimeType: 'application/pdf',
    visibilityRule: 'ALL_ENROLLED',
    uploadedBy: 'user-lecturer-1',
    createdAt: '2026-08-19T16:00:00Z',
  },
  {
    id: 'mat-2',
    courseOfferingId: 'offering-csc201',
    title: 'CSC 201 - Week 2 Code Samples: Linked Lists in C & Python',
    description: 'Implementation repository and memory allocation notes.',
    filePath: '/materials/csc201_linked_lists.zip',
    fileSizeBytes: 1120000,
    mimeType: 'application/zip',
    visibilityRule: 'MIN_ATTENDANCE_75',
    uploadedBy: 'user-lecturer-1',
    createdAt: '2026-08-26T15:00:00Z',
  },
];

export const initialStaffAttendance: StaffAttendance[] = [
  {
    id: 'sa-1',
    staffId: 'staff-non-acad',
    date: '2026-09-02',
    checkIn: '2026-09-02T07:55:00Z',
    checkOut: '2026-09-02T16:05:00Z',
    status: 'PRESENT',
    workingMinutes: 490,
  },
  {
    id: 'sa-2',
    staffId: 'staff-lecturer-1',
    date: '2026-09-02',
    checkIn: '2026-09-02T08:04:00Z',
    checkOut: '2026-09-02T17:15:00Z',
    status: 'PRESENT',
    workingMinutes: 551,
  },
];

export const initialSystemSettings: SystemSettings = {
  qrRotationSeconds: 60,
  attendanceDurationMinutes: 60,
  lateThresholdMinutes: 15,
  gracePeriodMinutes: 5,
  minimumAttendanceWarningThreshold: 70,
  examEligibilityThreshold: 75,
  correctionWindowHours: 48,
  staffWorkStartTime: '08:00',
  staffWorkEndTime: '16:00',
  staffLateGraceMinutes: 15,
};

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    actorId: 'user-admin',
    actorName: 'Engr. Faruq Bello (Admin)',
    actorRole: 'SUPER_ADMIN',
    action: 'SYSTEM_INITIALIZED',
    entityType: 'SYSTEM',
    details: { version: '1.0.0', institution: 'CUSTECH Osara' },
    createdAt: '2026-08-01T08:00:00Z',
  },
  {
    id: 'audit-2',
    actorId: 'user-lecturer-1',
    actorName: 'Dr. John Doe',
    actorRole: 'LECTURER',
    action: 'ATTENDANCE_SESSION_STARTED',
    entityType: 'attendance_sessions',
    entityId: 'sess-today-csc',
    details: { course: 'CSC 201', classroom: 'LH 101' },
    createdAt: '2026-09-03T10:05:00Z',
  },
];

export const initialMedicalWaivers: MedicalWaiver[] = [
  {
    id: 'waiver-1',
    studentId: 'stu-2', // Emeka Okonkwo
    startDate: '2026-08-25',
    endDate: '2026-08-28',
    hospitalName: 'CUSTECH University Health Centre, Osara',
    diagnosisSummary: 'Acute Malaria & Gastroenteritis with IV hydration',
    doctorName: 'Dr. A. B. Ohiani',
    doctorLicenseNo: 'MDCN/64821',
    approvedBy: 'user-dean',
    status: 'APPROVED',
    createdAt: '2026-08-29T09:00:00Z',
  },
];

export const initialDeviceCollisionAlerts: DeviceCollisionAlert[] = [
  {
    id: 'alert-col-1',
    sessionId: 'sess-today-csc',
    deviceFingerprintHash: 'dev_fp_infinix_hot10_8849',
    matchedMatricNumbers: ['25L1CS1029', '25L1CS1088'],
    sessionCode: 'CSC 201',
    ipAddress: '197.210.226.42',
    attemptCount: 2,
    isReviewed: false,
    createdAt: '2026-09-03T10:18:00Z',
  },
];

export const initialNotifications: AppNotification[] = [
  {
    id: 'notif-1',
    userId: 'user-stu-2', // Emeka Okonkwo
    title: 'Attendance Warning Threshold Notice',
    message: 'Your attendance in CSC 201 is currently 66.7%, which is below the statutory 75% exam requirement.',
    type: 'WARNING',
    isRead: false,
    link: '/student',
    createdAt: '2026-08-28T12:00:00Z',
  },
  {
    id: 'notif-2',
    userId: 'user-stu-2',
    title: 'Clinic Medical Waiver Approved',
    message: 'Your sick bay admission from 25–28 Aug has been verified. Affected lecture sessions marked as EXCUSED.',
    type: 'WAIVER',
    isRead: false,
    link: '/student',
    createdAt: '2026-08-29T10:00:00Z',
  },
  {
    id: 'notif-3',
    userId: 'user-lecturer-1', // Dr. John Doe
    title: 'Suspicious Device Collision Flagged',
    message: '2 student accounts were marked within 90 seconds from the same device (Infinix Hot 10) in CSC 201.',
    type: 'FRAUD',
    isRead: false,
    link: '/lecturer',
    createdAt: '2026-09-03T10:19:00Z',
  },
];

