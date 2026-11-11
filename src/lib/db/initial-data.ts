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
    code: 'FCI',
    name: 'Faculty of Computing and Informatics',
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
  {
    id: 'fac-med',
    code: 'FBMHS',
    name: 'Faculty of Basic Medical and Health Sciences',
  },
  {
    id: 'fac-env',
    code: 'FENV',
    name: 'Faculty of Environmental Science',
  },
  {
    id: 'fac-mgt',
    code: 'FMGS',
    name: 'Faculty of Management Science',
  },
  {
    id: 'fac-agr',
    code: 'FAGR',
    name: 'Faculty of Agriculture',
  },
  {
    id: 'fac-law',
    code: 'FLAW',
    name: 'Faculty of Law',
  },
  {
    id: 'fac-edu',
    code: 'FSTE',
    name: 'Faculty of Science and Technology Education',
  },
];

export const initialDepartments: Department[] = [
  // 1. Faculty of Computing and Informatics (fac-comp)
  { id: 'dept-csc', facultyId: 'fac-comp', code: 'CSC', name: 'Computer Science', hodId: 'user-hod' },
  { id: 'dept-sen', facultyId: 'fac-comp', code: 'SEN', name: 'Software Engineering' },
  { id: 'dept-cys', facultyId: 'fac-comp', code: 'CYS', name: 'Cyber Security' },
  { id: 'dept-ift', facultyId: 'fac-comp', code: 'IFT', name: 'Information Technology' },
  { id: 'dept-dsc', facultyId: 'fac-comp', code: 'DSC', name: 'Data Science' },
  { id: 'dept-air', facultyId: 'fac-comp', code: 'AIR', name: 'Artificial Intelligence and Robotics' },

  // 2. Faculty of Engineering (fac-eng)
  { id: 'dept-age', facultyId: 'fac-eng', code: 'AGE', name: 'Agricultural Engineering' },
  { id: 'dept-che', facultyId: 'fac-eng', code: 'CHE', name: 'Chemical Engineering' },
  { id: 'dept-civil-engineering', facultyId: 'fac-eng', code: 'CVE', name: 'Civil Engineering' },
  { id: 'dept-cpe', facultyId: 'fac-eng', code: 'CPE', name: 'Computer Engineering' },
  { id: 'dept-eee', facultyId: 'fac-eng', code: 'EEE', name: 'Electrical/Electronics Engineering' },
  { id: 'dept-mechanical-engineering', facultyId: 'fac-eng', code: 'MEE', name: 'Mechanical Engineering' },
  { id: 'dept-mct', facultyId: 'fac-eng', code: 'MCT', name: 'Mechatronics Engineering' },
  { id: 'dept-mme', facultyId: 'fac-eng', code: 'MME', name: 'Metallurgical and Materials Engineering' },
  { id: 'dept-mne', facultyId: 'fac-eng', code: 'MNE', name: 'Mining Engineering' },
  { id: 'dept-pge', facultyId: 'fac-eng', code: 'PGE', name: 'Petroleum and Gas Engineering' },
  { id: 'dept-mre', facultyId: 'fac-eng', code: 'MRE', name: 'Marine Engineering' },

  // 3. Faculty of Science (fac-sci)
  { id: 'dept-bch', facultyId: 'fac-sci', code: 'BCH', name: 'Biochemistry' },
  { id: 'dept-bio', facultyId: 'fac-sci', code: 'BIO', name: 'Biology' },
  { id: 'dept-btc', facultyId: 'fac-sci', code: 'BTC', name: 'Biotechnology' },
  { id: 'dept-chm', facultyId: 'fac-sci', code: 'CHM', name: 'Chemistry' },
  { id: 'dept-gly', facultyId: 'fac-sci', code: 'GLY', name: 'Geology' },
  { id: 'dept-gph', facultyId: 'fac-sci', code: 'GPH', name: 'Applied Geophysics' },
  { id: 'dept-mth', facultyId: 'fac-sci', code: 'MTH', name: 'Mathematics' },
  { id: 'dept-mcb', facultyId: 'fac-sci', code: 'MCB', name: 'Microbiology' },
  { id: 'dept-phy', facultyId: 'fac-sci', code: 'PHY', name: 'Physics' },
  { id: 'dept-sta', facultyId: 'fac-sci', code: 'STA', name: 'Statistics' },

  // 4. Faculty of Basic Medical and Health Sciences (fac-med)
  { id: 'dept-ana', facultyId: 'fac-med', code: 'ANA', name: 'Anatomy' },
  { id: 'dept-phs', facultyId: 'fac-med', code: 'PHS', name: 'Physiology' },
  { id: 'dept-mbs', facultyId: 'fac-med', code: 'MBS', name: 'Medicine and Surgery' },
  { id: 'dept-nsc', facultyId: 'fac-med', code: 'NSC', name: 'Nursing Science' },
  { id: 'dept-mls', facultyId: 'fac-med', code: 'MLS', name: 'Medical Laboratory Science' },
  { id: 'dept-rad', facultyId: 'fac-med', code: 'RAD', name: 'Radiography' },
  { id: 'dept-pht', facultyId: 'fac-med', code: 'PHT', name: 'Physiotherapy' },

  // 5. Faculty of Environmental Science (fac-env)
  { id: 'dept-arc', facultyId: 'fac-env', code: 'ARC', name: 'Architecture' },
  { id: 'dept-bld', facultyId: 'fac-env', code: 'BLD', name: 'Building' },
  { id: 'dept-svg', facultyId: 'fac-env', code: 'SVG', name: 'Surveying and Geo-Informatics' },
  { id: 'dept-urp', facultyId: 'fac-env', code: 'URP', name: 'Urban and Regional Planning' },
  { id: 'dept-qsv', facultyId: 'fac-env', code: 'QSV', name: 'Quantity Surveying' },
  { id: 'dept-est', facultyId: 'fac-env', code: 'EST', name: 'Estate Management' },

  // 6. Faculty of Management Science (fac-mgt)
  { id: 'dept-acc', facultyId: 'fac-mgt', code: 'ACC', name: 'Accounting' },
  { id: 'dept-act', facultyId: 'fac-mgt', code: 'ACT', name: 'Actuarial Science' },
  { id: 'dept-bus', facultyId: 'fac-mgt', code: 'BUS', name: 'Business Administration' },
  { id: 'dept-ecn', facultyId: 'fac-mgt', code: 'ECN', name: 'Economics' },
  { id: 'dept-hrm', facultyId: 'fac-mgt', code: 'HRM', name: 'Human Resources Management' },
  { id: 'dept-tlm', facultyId: 'fac-mgt', code: 'TLM', name: 'Transport and Logistics Management' },

  // 7. Faculty of Agriculture (fac-agr)
  { id: 'dept-agr', facultyId: 'fac-agr', code: 'AGR', name: 'Agriculture' },
  { id: 'dept-aee', facultyId: 'fac-agr', code: 'AEE', name: 'Agricultural Economics and Extension' },
  { id: 'dept-faq', facultyId: 'fac-agr', code: 'FAQ', name: 'Fisheries and Aquaculture' },
  { id: 'dept-fwl', facultyId: 'fac-agr', code: 'FWL', name: 'Forestry and Wildlife' },

  // 8. Faculty of Law (fac-law)
  { id: 'dept-cil', facultyId: 'fac-law', code: 'CIL', name: 'Common and Islamic Law' },
  { id: 'dept-ppl', facultyId: 'fac-law', code: 'PPL', name: 'Private and Property Law' },
  { id: 'dept-pil', facultyId: 'fac-law', code: 'PIL', name: 'Public and International Law' },

  // 9. Faculty of Science and Technology Education (fac-edu)
  { id: 'dept-lis', facultyId: 'fac-edu', code: 'LIS', name: 'Library and Information Science' },
  { id: 'dept-edb', facultyId: 'fac-edu', code: 'EDB', name: 'Education and Biology' },
  { id: 'dept-edc', facultyId: 'fac-edu', code: 'EDC', name: 'Education and Chemistry' },
  { id: 'dept-edcs', facultyId: 'fac-edu', code: 'EDCS', name: 'Education and Computer Science' },
  { id: 'dept-edg', facultyId: 'fac-edu', code: 'EDG', name: 'Education and Geography' },
  { id: 'dept-edm', facultyId: 'fac-edu', code: 'EDM', name: 'Education and Mathematics' },
  { id: 'dept-edp', facultyId: 'fac-edu', code: 'EDP', name: 'Education and Physics' },
  { id: 'dept-bte', facultyId: 'fac-edu', code: 'BTE', name: 'Building Technology Education' },
  { id: 'dept-ete', facultyId: 'fac-edu', code: 'ETE', name: 'Electrical/Electronics Technology Education' },
  { id: 'dept-mte', facultyId: 'fac-edu', code: 'MTE', name: 'Mechanical Technology Education' },
];

export const initialPrograms: Program[] = [
  // Computing & Informatics
  { id: 'prog-csc', departmentId: 'dept-csc', code: 'B.Sc. CSC', name: 'Computer Science', durationYears: 4 },
  { id: 'prog-sen', departmentId: 'dept-sen', code: 'B.Sc. SEN', name: 'Software Engineering', durationYears: 4 },
  { id: 'prog-cys', departmentId: 'dept-cys', code: 'B.Sc. CYS', name: 'Cyber Security', durationYears: 4 },
  { id: 'prog-ift', departmentId: 'dept-ift', code: 'B.Sc. IFT', name: 'Information Technology', durationYears: 4 },
  { id: 'prog-dsc', departmentId: 'dept-dsc', code: 'B.Sc. DSC', name: 'Data Science', durationYears: 4 },
  { id: 'prog-air', departmentId: 'dept-air', code: 'B.Sc. AIR', name: 'Artificial Intelligence and Robotics', durationYears: 4 },
  // Engineering
  { id: 'prog-age', departmentId: 'dept-age', code: 'B.Eng. AGE', name: 'Agricultural Engineering', durationYears: 5 },
  { id: 'prog-che', departmentId: 'dept-che', code: 'B.Eng. CHE', name: 'Chemical Engineering', durationYears: 5 },
  { id: 'prog-cve', departmentId: 'dept-civil-engineering', code: 'B.Eng. CVE', name: 'Civil Engineering', durationYears: 5 },
  { id: 'prog-cpe', departmentId: 'dept-cpe', code: 'B.Eng. CPE', name: 'Computer Engineering', durationYears: 5 },
  { id: 'prog-eee', departmentId: 'dept-eee', code: 'B.Eng. EEE', name: 'Electrical/Electronics Engineering', durationYears: 5 },
  { id: 'prog-mee', departmentId: 'dept-mechanical-engineering', code: 'B.Eng. MEE', name: 'Mechanical Engineering', durationYears: 5 },
  { id: 'prog-mct', departmentId: 'dept-mct', code: 'B.Eng. MCT', name: 'Mechatronics Engineering', durationYears: 5 },
  { id: 'prog-mme', departmentId: 'dept-mme', code: 'B.Eng. MME', name: 'Metallurgical and Materials Engineering', durationYears: 5 },
  { id: 'prog-mne', departmentId: 'dept-mne', code: 'B.Eng. MNE', name: 'Mining Engineering', durationYears: 5 },
  { id: 'prog-pge', departmentId: 'dept-pge', code: 'B.Eng. PGE', name: 'Petroleum and Gas Engineering', durationYears: 5 },
  { id: 'prog-mre', departmentId: 'dept-mre', code: 'B.Eng. MRE', name: 'Marine Engineering', durationYears: 5 },
  // Science
  { id: 'prog-bch', departmentId: 'dept-bch', code: 'B.Sc. BCH', name: 'Biochemistry', durationYears: 4 },
  { id: 'prog-bio', departmentId: 'dept-bio', code: 'B.Sc. BIO', name: 'Biology', durationYears: 4 },
  { id: 'prog-btc', departmentId: 'dept-btc', code: 'B.Sc. BTC', name: 'Biotechnology', durationYears: 4 },
  { id: 'prog-chm', departmentId: 'dept-chm', code: 'B.Sc. CHM', name: 'Chemistry', durationYears: 4 },
  { id: 'prog-gly', departmentId: 'dept-gly', code: 'B.Sc. GLY', name: 'Geology', durationYears: 4 },
  { id: 'prog-gph', departmentId: 'dept-gph', code: 'B.Sc. GPH', name: 'Applied Geophysics', durationYears: 4 },
  { id: 'prog-mth', departmentId: 'dept-mth', code: 'B.Sc. MTH', name: 'Mathematics', durationYears: 4 },
  { id: 'prog-mcb', departmentId: 'dept-mcb', code: 'B.Sc. MCB', name: 'Microbiology', durationYears: 4 },
  { id: 'prog-phy', departmentId: 'dept-phy', code: 'B.Sc. PHY', name: 'Physics', durationYears: 4 },
  { id: 'prog-sta', departmentId: 'dept-sta', code: 'B.Sc. STA', name: 'Statistics', durationYears: 4 },
  // Basic Medical & Health Sciences
  { id: 'prog-ana', departmentId: 'dept-ana', code: 'B.Sc. ANA', name: 'Anatomy', durationYears: 4 },
  { id: 'prog-phs', departmentId: 'dept-phs', code: 'B.Sc. PHS', name: 'Physiology', durationYears: 4 },
  { id: 'prog-mbs', departmentId: 'dept-mbs', code: 'MBBS', name: 'Medicine and Surgery', durationYears: 6 },
  { id: 'prog-nsc', departmentId: 'dept-nsc', code: 'B.NSc. NSC', name: 'Nursing Science', durationYears: 5 },
  { id: 'prog-mls', departmentId: 'dept-mls', code: 'B.MLS', name: 'Medical Laboratory Science', durationYears: 5 },
  { id: 'prog-rad', departmentId: 'dept-rad', code: 'B.Rad.', name: 'Radiography', durationYears: 5 },
  { id: 'prog-pht', departmentId: 'dept-pht', code: 'DPT', name: 'Doctor of Physiotherapy', durationYears: 6 },
  // Environmental Science
  { id: 'prog-arc', departmentId: 'dept-arc', code: 'B.Sc. ARC', name: 'Architecture', durationYears: 4 },
  { id: 'prog-bld', departmentId: 'dept-bld', code: 'B.Sc. BLD', name: 'Building', durationYears: 5 },
  { id: 'prog-svg', departmentId: 'dept-svg', code: 'B.Sc. SVG', name: 'Surveying and Geo-Informatics', durationYears: 5 },
  { id: 'prog-urp', departmentId: 'dept-urp', code: 'B.Sc. URP', name: 'Urban and Regional Planning', durationYears: 5 },
  { id: 'prog-qsv', departmentId: 'dept-qsv', code: 'B.Sc. QSV', name: 'Quantity Surveying', durationYears: 5 },
  { id: 'prog-est', departmentId: 'dept-est', code: 'B.Sc. EST', name: 'Estate Management', durationYears: 5 },
  // Management Science
  { id: 'prog-acc', departmentId: 'dept-acc', code: 'B.Sc. ACC', name: 'Accounting', durationYears: 4 },
  { id: 'prog-act', departmentId: 'dept-act', code: 'B.Sc. ACT', name: 'Actuarial Science', durationYears: 4 },
  { id: 'prog-bus', departmentId: 'dept-bus', code: 'B.Sc. BUS', name: 'Business Administration', durationYears: 4 },
  { id: 'prog-ecn', departmentId: 'dept-ecn', code: 'B.Sc. ECN', name: 'Economics', durationYears: 4 },
  { id: 'prog-hrm', departmentId: 'dept-hrm', code: 'B.Sc. HRM', name: 'Human Resources Management', durationYears: 4 },
  { id: 'prog-tlm', departmentId: 'dept-tlm', code: 'B.Sc. TLM', name: 'Transport and Logistics Management', durationYears: 4 },
  // Agriculture
  { id: 'prog-agr', departmentId: 'dept-agr', code: 'B.Agric.', name: 'Agriculture', durationYears: 5 },
  { id: 'prog-aee', departmentId: 'dept-aee', code: 'B.Agric. AEE', name: 'Agricultural Economics and Extension', durationYears: 5 },
  { id: 'prog-faq', departmentId: 'dept-faq', code: 'B.Sc. FAQ', name: 'Fisheries and Aquaculture', durationYears: 5 },
  { id: 'prog-fwl', departmentId: 'dept-fwl', code: 'B.Sc. FWL', name: 'Forestry and Wildlife', durationYears: 5 },
  // Law
  { id: 'prog-cil', departmentId: 'dept-cil', code: 'LL.B. CIL', name: 'Common and Islamic Law', durationYears: 5 },
  { id: 'prog-ppl', departmentId: 'dept-ppl', code: 'LL.B. PPL', name: 'Private and Property Law', durationYears: 5 },
  { id: 'prog-pil', departmentId: 'dept-pil', code: 'LL.B. PIL', name: 'Public and International Law', durationYears: 5 },
  // Science & Technology Education
  { id: 'prog-lis', departmentId: 'dept-lis', code: 'B.LIS', name: 'Library and Information Science', durationYears: 4 },
  { id: 'prog-edb', departmentId: 'dept-edb', code: 'B.Sc.(Ed) BIO', name: 'Education and Biology', durationYears: 4 },
  { id: 'prog-edc', departmentId: 'dept-edc', code: 'B.Sc.(Ed) CHM', name: 'Education and Chemistry', durationYears: 4 },
  { id: 'prog-edcs', departmentId: 'dept-edcs', code: 'B.Sc.(Ed) CSC', name: 'Education and Computer Science', durationYears: 4 },
  { id: 'prog-edg', departmentId: 'dept-edg', code: 'B.Sc.(Ed) GEO', name: 'Education and Geography', durationYears: 4 },
  { id: 'prog-edm', departmentId: 'dept-edm', code: 'B.Sc.(Ed) MTH', name: 'Education and Mathematics', durationYears: 4 },
  { id: 'prog-edp', departmentId: 'dept-edp', code: 'B.Sc.(Ed) PHY', name: 'Education and Physics', durationYears: 4 },
  { id: 'prog-bte', departmentId: 'dept-bte', code: 'B.Tech.(Ed) BLD', name: 'Building Technology Education', durationYears: 4 },
  { id: 'prog-ete', departmentId: 'dept-ete', code: 'B.Tech.(Ed) EEE', name: 'Electrical/Electronics Technology Education', durationYears: 4 },
  { id: 'prog-mte', departmentId: 'dept-mte', code: 'B.Tech.(Ed) MEE', name: 'Mechanical Technology Education', durationYears: 4 },
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
  // Existing Core Courses
  { id: 'course-csc201', departmentId: 'dept-csc', code: 'CSC 201', title: 'Data Structures and Algorithms', creditUnits: 3, level: 200 },
  { id: 'course-sen201', departmentId: 'dept-sen', code: 'SEN 201', title: 'Software Engineering Fundamentals', creditUnits: 2, level: 200 },
  { id: 'course-mth201', departmentId: 'dept-mth', code: 'MTH 201', title: 'Mathematical Methods I', creditUnits: 3, level: 200 },
  { id: 'course-phy201', departmentId: 'dept-phy', code: 'PHY 201', title: 'General Physics for Engineers', creditUnits: 2, level: 200 },

  // Faculty of Computing and Informatics
  { id: 'course-csc101', departmentId: 'dept-csc', code: 'CSC 101', title: 'Introduction to Computing Sciences', creditUnits: 3, level: 100 },
  { id: 'course-csc301', departmentId: 'dept-csc', code: 'CSC 301', title: 'Structured Programming & Compiler Design', creditUnits: 3, level: 300 },
  { id: 'course-cys201', departmentId: 'dept-cys', code: 'CYB 201', title: 'Introduction to Cyber Security', creditUnits: 2, level: 200 },
  { id: 'course-ift201', departmentId: 'dept-ift', code: 'IFT 201', title: 'Database Systems & Cloud Infrastructure', creditUnits: 3, level: 200 },

  // Faculty of Engineering
  { id: 'course-get101', departmentId: 'dept-civil-engineering', code: 'GET 101', title: 'Engineering Drawing & Graphics', creditUnits: 2, level: 100 },
  { id: 'course-cve201', departmentId: 'dept-civil-engineering', code: 'CVE 201', title: 'Strength of Materials I', creditUnits: 3, level: 200 },
  { id: 'course-mee201', departmentId: 'dept-mechanical-engineering', code: 'MEE 201', title: 'Applied Thermodynamics & Fluid Mechanics', creditUnits: 3, level: 200 },
  { id: 'course-eee201', departmentId: 'dept-eee', code: 'EEE 201', title: 'Applied Electricity & Circuit Theory', creditUnits: 3, level: 200 },
  { id: 'course-cpe201', departmentId: 'dept-cpe', code: 'CPE 201', title: 'Digital Logic Design', creditUnits: 3, level: 200 },

  // Faculty of Science
  { id: 'course-mth101', departmentId: 'dept-mth', code: 'MTH 101', title: 'Elementary Mathematics I (Algebra & Trigonometry)', creditUnits: 3, level: 100 },
  { id: 'course-chm101', departmentId: 'dept-chm', code: 'CHM 101', title: 'General Chemistry I', creditUnits: 3, level: 100 },
  { id: 'course-bio101', departmentId: 'dept-bio', code: 'BIO 101', title: 'General Biology I', creditUnits: 3, level: 100 },
  { id: 'course-bch201', departmentId: 'dept-bch', code: 'BCH 201', title: 'General Biochemistry I', creditUnits: 3, level: 200 },
  { id: 'course-mcb201', departmentId: 'dept-mcb', code: 'MCB 201', title: 'General Microbiology', creditUnits: 3, level: 200 },

  // Faculty of Basic Medical & Health Sciences
  { id: 'course-ana201', departmentId: 'dept-ana', code: 'ANA 201', title: 'Gross Anatomy of Upper & Lower Limbs', creditUnits: 3, level: 200 },
  { id: 'course-phs201', departmentId: 'dept-phs', code: 'PHS 201', title: 'Introductory Human Physiology', creditUnits: 3, level: 200 },
  { id: 'course-nsc201', departmentId: 'dept-nsc', code: 'NSC 201', title: 'Foundations of Nursing Science', creditUnits: 3, level: 200 },

  // Faculty of Environmental Science
  { id: 'course-arc101', departmentId: 'dept-arc', code: 'ARC 101', title: 'Architectural Graphics & Freehand Sketching', creditUnits: 3, level: 100 },
  { id: 'course-bld201', departmentId: 'dept-bld', code: 'BLD 201', title: 'Building Construction & Materials', creditUnits: 3, level: 200 },

  // Faculty of Management Science
  { id: 'course-acc101', departmentId: 'dept-acc', code: 'ACC 101', title: 'Introduction to Financial Accounting', creditUnits: 3, level: 100 },
  { id: 'course-bus101', departmentId: 'dept-bus', code: 'BUS 101', title: 'Introduction to Business Management', creditUnits: 2, level: 100 },
  { id: 'course-ecn101', departmentId: 'dept-ecn', code: 'ECN 101', title: 'Principles of Economics I', creditUnits: 3, level: 100 },

  // Faculty of Agriculture
  { id: 'course-agr101', departmentId: 'dept-agr', code: 'AGR 101', title: 'Introduction to Agriculture & Food Production', creditUnits: 2, level: 100 },

  // Faculty of Law
  { id: 'course-law101', departmentId: 'dept-cil', code: 'LAW 101', title: 'Legal Methods I', creditUnits: 4, level: 100 },

  // Faculty of Science & Technology Education
  { id: 'course-edu101', departmentId: 'dept-edcs', code: 'EDU 101', title: 'Introduction to Teaching & Foundations of Education', creditUnits: 2, level: 100 },

  // General Studies (University-wide)
  { id: 'course-gst111', departmentId: 'dept-csc', code: 'GST 111', title: 'Communication in English & Use of Library', creditUnits: 2, level: 100 },
];

export const initialCourseOfferings: CourseOffering[] = [
  { id: 'offering-csc201', courseId: 'course-csc201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-sen201', courseId: 'course-sen201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-mth201', courseId: 'course-mth201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-hod' },
  { id: 'offering-phy201', courseId: 'course-phy201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-csc101', courseId: 'course-csc101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-csc301', courseId: 'course-csc301', semesterId: 'sem-2026-1', primaryLecturerId: 'user-hod' },
  { id: 'offering-cys201', courseId: 'course-cys201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-ift201', courseId: 'course-ift201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-get101', courseId: 'course-get101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-cve201', courseId: 'course-cve201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-mee201', courseId: 'course-mee201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-eee201', courseId: 'course-eee201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-cpe201', courseId: 'course-cpe201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-mth101', courseId: 'course-mth101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-hod' },
  { id: 'offering-chm101', courseId: 'course-chm101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-bio101', courseId: 'course-bio101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-bch201', courseId: 'course-bch201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-mcb201', courseId: 'course-mcb201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-ana201', courseId: 'course-ana201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-phs201', courseId: 'course-phs201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-nsc201', courseId: 'course-nsc201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-arc101', courseId: 'course-arc101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-bld201', courseId: 'course-bld201', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-acc101', courseId: 'course-acc101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-bus101', courseId: 'course-bus101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-ecn101', courseId: 'course-ecn101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-agr101', courseId: 'course-agr101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-law101', courseId: 'course-law101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-2' },
  { id: 'offering-edu101', courseId: 'course-edu101', semesterId: 'sem-2026-1', primaryLecturerId: 'user-lecturer-1' },
  { id: 'offering-gst111', courseId: 'course-gst111', semesterId: 'sem-2026-1', primaryLecturerId: 'user-dean' },
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
  // Past CSC 201 session 3 (Week 3 - CLOSED so lecturers start attendance manually)
  {
    id: 'sess-today-csc',
    courseOfferingId: 'offering-csc201',
    lecturerId: 'user-lecturer-1',
    classroomId: 'room-lh101',
    date: '2026-09-03',
    scheduledStart: '2026-09-03T10:00:00Z',
    scheduledEnd: '2026-09-03T12:00:00Z',
    actualStart: '2026-09-03T10:05:00Z',
    actualClose: '2026-09-03T11:55:00Z',
    status: 'CLOSED',
    currentTempCode: '7K4P92',
    tempCodeExpiresAt: '2026-09-03T11:55:00Z',
    isCodeActive: false,
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
  requireFacialVerification: true,
  facialMatchThreshold: 0.50,
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

