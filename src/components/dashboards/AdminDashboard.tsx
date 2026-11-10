'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, SystemSettings, Student, UserRole } from '@/types';
import {
  updateSystemSettingsAction,
  registerStudentAction,
  updateStudentAction,
  toggleStudentStatusAction,
  deleteStudentAction,
  resetStudentPinAction,
  assignUserRoleAction,
  bulkImportStudentsAction,
} from '@/actions/academic';
import { formatTime } from '@/lib/utils';
import { storeSession } from '@/lib/auth/auth-service';
import {
  ShieldCheck,
  Sliders,
  Users,
  GraduationCap,
  Building2,
  CheckCircle2,
  Plus,
  Search,
  Key,
  Copy,
  Trash2,
  FileSpreadsheet,
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  Upload,
  Download,
  Edit,
  Archive,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  Database,
  Network,
  Info,
  BookOpen,
  Calendar,
  ShieldAlert,
} from 'lucide-react';
import { CourseManagementTab } from '@/components/admin/CourseManagementTab';
import { TimetableManagementTab } from '@/components/admin/TimetableManagementTab';
import { LecturerManagementTab } from '@/components/admin/LecturerManagementTab';
import { AttendanceMonitoringTab } from '@/components/admin/AttendanceMonitoringTab';

interface AdminDashboardProps {
  user: UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = React.useState<
    'COURSES' | 'TIMETABLE' | 'LECTURERS' | 'MONITORING' | 'STUDENTS' | 'ROLES' | 'INTEGRATION' | 'POLICIES' | 'AUDIT'
  >('COURSES');
  const [settings, setSettings] = React.useState<SystemSettings>(custechDb.getSystemSettings());
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Student Registry State
  const [students, setStudents] = React.useState(custechDb.getAllStudentsDetailed());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState<string>('ALL');
  const [selectedDept, setSelectedDept] = React.useState<string>('ALL');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [isIntegrationModalOpen, setIsIntegrationModalOpen] = React.useState(false);

  // Add Student Form State
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [matricNumber, setMatricNumber] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [departmentName, setDepartmentName] = React.useState('Computer Science');
  const [facultyId, setFacultyId] = React.useState('fac-comp');
  const [currentLevel, setCurrentLevel] = React.useState<100 | 200 | 300 | 400 | 500>(200);
  const [pin, setPin] = React.useState('1234');
  const [autoEnroll, setAutoEnroll] = React.useState(true);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [registeredStudentSuccess, setRegisteredStudentSuccess] = React.useState<{
    student: Student;
    profile: UserProfile;
    pin: string;
  } | null>(null);

  // Edit Student Modal State
  const [editStudent, setEditStudent] = React.useState<(Student & { profile?: UserProfile; departmentName?: string; facultyName?: string }) | null>(null);
  const [editFirstName, setEditFirstName] = React.useState('');
  const [editLastName, setEditLastName] = React.useState('');
  const [editMatric, setEditMatric] = React.useState('');
  const [editEmail, setEditEmail] = React.useState('');
  const [editDept, setEditDept] = React.useState('');
  const [editFacultyId, setEditFacultyId] = React.useState('fac-comp');
  const [editLevel, setEditLevel] = React.useState<100 | 200 | 300 | 400 | 500>(200);
  const [editIsActive, setEditIsActive] = React.useState(true);
  const [editError, setEditError] = React.useState<string | null>(null);

  // Bulk Import State
  const [csvContent, setCsvContent] = React.useState(
    `Tunde, Bello, 25L1CS1050, , 200, Computer Science\n` +
    `Fatima, Musa, 25L1CV1051, f.musa@gmail.com, 100, Civil Engineering\n` +
    `David, Audu, DE 25L2ME1052, , 200, Mechanical Engineering\n` +
    `Zainab, Ibrahim, 25L1BC1022, , 100, Biochemistry`
  );
  const [bulkStatus, setBulkStatus] = React.useState<string | null>(null);
  const [bulkParsedRows, setBulkParsedRows] = React.useState<Array<{
    firstName: string;
    lastName: string;
    matricNumber: string;
    email?: string;
    currentLevel: number;
    departmentName: string;
    status: 'READY' | 'DUPLICATE' | 'ERROR';
    reason?: string;
  }>>([]);
  const [bulkPreviewStep, setBulkPreviewStep] = React.useState(false);
  const [bulkSummary, setBulkSummary] = React.useState<{
    successful: number;
    skipped: number;
    failed: number;
    errors: Array<{ matricNumber: string; error: string }>;
  } | null>(null);

  // User Roles State
  const [usersList, setUsersList] = React.useState(custechDb.getAllUsersWithRoles());
  const [roleSearchQuery, setRoleSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<string>('ALL');
  const [roleAssignModalUser, setRoleAssignModalUser] = React.useState<UserProfile | null>(null);
  const [newRoleSelection, setNewRoleSelection] = React.useState<UserRole>('STUDENT');
  const [roleAssignFeedback, setRoleAssignFeedback] = React.useState<string | null>(null);

  // Reset PIN State
  const [pinResetModal, setPinResetModal] = React.useState<{ studentId: string; matric: string } | null>(null);
  const [newPinValue, setNewPinValue] = React.useState('1234');

  const auditLogs = custechDb.getAuditLogs();
  const faculties = custechDb.getFaculties();
  const departments = custechDb.getDepartments();

  // Dynamic list of all available departments (from DB + registered students)
  const availableDepartments = React.useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d) => set.add(d.name));
    students.forEach((s) => {
      if (s.departmentName) set.add(s.departmentName);
    });
    return Array.from(set).sort();
  }, [departments, students]);

  // Refresh student records from repository
  const refreshStudentsList = React.useCallback(() => {
    setStudents(custechDb.getAllStudentsDetailed());
    setUsersList(custechDb.getAllUsersWithRoles());
  }, []);

  // Auto-generate student email when typing names
  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (!email || email.includes('@student.custech.edu.ng')) {
      const clean = `${val.trim().toLowerCase()}.${lastName.trim().toLowerCase()}`;
      setEmail(clean ? `${clean.replace(/[^a-z0-9.]/g, '')}@student.custech.edu.ng` : '');
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (!email || email.includes('@student.custech.edu.ng')) {
      const clean = `${firstName.trim().toLowerCase()}.${val.trim().toLowerCase()}`;
      setEmail(clean ? `${clean.replace(/[^a-z0-9.]/g, '')}@student.custech.edu.ng` : '');
    }
  };

  // CUSTECH Matriculation Pattern Validation Check
  const validateMatricFormat = (m: string) => {
    const cleaned = m.trim().toUpperCase();
    const isUTME = /^[0-9]{2}L1[A-Z]{2,4}[0-9]{3,4}$/.test(cleaned);
    const isDE = /^(DE\s*)?[0-9]{2}L2[A-Z]{2,4}[0-9]{3,4}$/.test(cleaned);
    return isUTME || isDE;
  };

  // Handle Add Student
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanMatric = matricNumber.trim().toUpperCase();
    if (!cleanMatric) {
      setFormError('Please provide a Matriculation Number.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setFormError('Please provide both first name and last name.');
      return;
    }

    if (!departmentName.trim()) {
      setFormError('Please type or select a Department.');
      return;
    }

    if (pin.length !== 4) {
      setFormError('Attendance PIN must be exactly 4 digits.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerStudentAction(
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          matricNumber: cleanMatric,
          email: email.trim() || undefined,
          departmentName: departmentName.trim(),
          facultyId,
          currentLevel,
          pin,
          enrollInCourses: autoEnroll,
        },
        user.id
      );

      if (!res.success || !res.student || !res.profile) {
        setFormError(res.error || 'Failed to register student.');
      } else {
        custechDb.syncClientProfileAndStudent(res.profile, res.student);
        setRegisteredStudentSuccess({
          student: res.student,
          profile: res.profile,
          pin,
        });
        refreshStudentsList();
      }
    } catch {
      setFormError('Unexpected server error while registering student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset Add Student Form for next entry
  const handleResetAddForm = () => {
    setFirstName('');
    setLastName('');
    setMatricNumber('');
    setEmail('');
    setDepartmentName('Computer Science');
    setFacultyId('fac-comp');
    setPin('1234');
    setFormError(null);
    setRegisteredStudentSuccess(null);
  };

  // Open Edit Modal
  const openEditModal = (st: (typeof students)[0]) => {
    setEditStudent(st);
    setEditFirstName(st.profile?.firstName || '');
    setEditLastName(st.profile?.lastName || '');
    setEditMatric(st.matricNumber || '');
    setEditEmail(st.profile?.email || '');
    setEditDept(st.departmentName || 'Computer Science');
    setEditFacultyId(st.profile?.facultyId || 'fac-comp');
    setEditLevel(st.currentLevel || 200);
    setEditIsActive(st.profile?.isActive !== false);
    setEditError(null);
  };

  // Submit Edit Student
  const handleUpdateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudent) return;
    setIsSubmitting(true);
    setEditError(null);
    try {
      const res = await updateStudentAction(
        editStudent.id,
        {
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          matricNumber: editMatric.trim().toUpperCase(),
          email: editEmail.trim() || undefined,
          departmentName: editDept.trim(),
          facultyId: editFacultyId,
          currentLevel: editLevel,
          isActive: editIsActive,
        },
        user.id
      );
      if (res.success) {
        refreshStudentsList();
        setEditStudent(null);
      } else {
        setEditError(res.error || 'Failed to update student');
      }
    } catch {
      setEditError('Unexpected error updating student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Archive / Deactivate Student
  const handleToggleArchiveStudent = async (studentId: string, currentIsActive: boolean, matric: string) => {
    const actionLabel = currentIsActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionLabel} student record for ${matric}? This preserves all past attendance records and audit logs.`)) {
      return;
    }
    try {
      await toggleStudentStatusAction(studentId, !currentIsActive, user.id);
      refreshStudentsList();
    } catch {
      alert(`Failed to ${actionLabel} student.`);
    }
  };

  // Handle Student Deletion
  const handleDeleteStudent = async (studentId: string, matric: string) => {
    if (!confirm(`Permanently remove student with Matric Number ${matric}? Note: For graduating or inactive students, archiving is recommended instead of deletion.`)) {
      return;
    }
    await deleteStudentAction(studentId, user.id);
    refreshStudentsList();
  };

  // Handle PIN Reset
  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinResetModal || newPinValue.length !== 4) return;
    await resetStudentPinAction(pinResetModal.studentId, newPinValue, user.id);
    alert(`Attendance PIN for ${pinResetModal.matric} updated to: ${newPinValue}`);
    setPinResetModal(null);
    refreshStudentsList();
  };

  // Quick Sign In As This Student
  const handleTestSignInAsStudent = (profile: UserProfile) => {
    storeSession({
      user: profile,
      activeRole: 'STUDENT',
      loginTime: new Date().toISOString(),
    });
  };

  // Download Sample CSV Template
  const downloadSampleCsvTemplate = () => {
    const csvHeader = 'First Name,Last Name,Matriculation Number,Email,Level,Department\n';
    const sampleRows = [
      'Amina,Usman,25L1CS1080,amina.usman@student.custech.edu.ng,200,Computer Science',
      'Emeka,Okonkwo,25L1SE1081,,200,Software Engineering',
      'Zainab,Aliyu,25L1CY1082,,100,Cybersecurity',
      'Babatunde,Adeleke,DE 25L2ME1083,,200,Mechanical Engineering',
      'Chinedu,Nwosu,25L1CV1084,,300,Civil Engineering',
    ].join('\n');
    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'custech_student_bulk_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse and Pre-Validate CSV Content
  const parseAndValidateCsv = (rawText: string) => {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.toLowerCase().startsWith('first name'));

    const existingMatrics = new Set(students.map((s) => s.matricNumber.toUpperCase()));
    const seenBatch = new Set<string>();

    const parsed = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim());
      const [fName, lName, mat, em, lvl, dept] = parts;
      const cleanMatric = mat ? mat.toUpperCase() : '';
      const numLevel = Number(lvl) || 200;

      let status: 'READY' | 'DUPLICATE' | 'ERROR' = 'READY';
      let reason = 'Ready to import';

      if (!fName || !lName || !cleanMatric) {
        status = 'ERROR';
        reason = 'Missing required fields (First/Last Name or Matric)';
      } else if (seenBatch.has(cleanMatric)) {
        status = 'DUPLICATE';
        reason = 'Duplicate within this uploaded batch';
      } else if (existingMatrics.has(cleanMatric)) {
        status = 'DUPLICATE';
        reason = 'Already registered in university database';
      }

      if (cleanMatric) seenBatch.add(cleanMatric);

      return {
        firstName: fName || '',
        lastName: lName || '',
        matricNumber: cleanMatric,
        email: em && em.includes('@') ? em.toLowerCase() : undefined,
        currentLevel: numLevel,
        departmentName: dept || 'Computer Science',
        status,
        reason,
      };
    });

    setBulkParsedRows(parsed);
    setBulkPreviewStep(true);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvContent(content);
        parseAndValidateCsv(content);
      }
    };
    reader.readAsText(file);
  };

  // Confirm and Execute Bulk Import
  const handleConfirmBulkImport = async () => {
    const validRows = bulkParsedRows.filter((r) => r.status === 'READY');
    if (validRows.length === 0) {
      alert('No valid student records ready to import.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await bulkImportStudentsAction(
        validRows.map((r) => ({
          firstName: r.firstName,
          lastName: r.lastName,
          matricNumber: r.matricNumber,
          email: r.email,
          currentLevel: (r.currentLevel as 100 | 200 | 300 | 400 | 500) || 200,
          departmentName: r.departmentName,
          pin: '1234',
        })),
        user.id
      );

      if (res.success && res.summary) {
        setBulkSummary(res.summary);
        refreshStudentsList();
      } else {
        alert(res.error || 'Failed to complete bulk import.');
      }
    } catch {
      alert('Unexpected error during batch registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role Assignment Submit Handler
  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleAssignModalUser) return;
    setIsSubmitting(true);
    try {
      const res = await assignUserRoleAction(roleAssignModalUser.id, newRoleSelection, user.id);
      if (res.success) {
        setRoleAssignFeedback(`Successfully assigned role "${newRoleSelection}" to ${roleAssignModalUser.firstName} ${roleAssignModalUser.lastName}.`);
        setUsersList(custechDb.getAllUsersWithRoles());
        setTimeout(() => {
          setRoleAssignModalUser(null);
          setRoleAssignFeedback(null);
        }, 1800);
      } else {
        alert(res.error || 'Failed to assign role');
      }
    } catch {
      alert('Error updating user role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter students with status filter and pagination
  const filteredStudents = students.filter((s) => {
    const p = s.profile;
    const matchesSearch =
      s.matricNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p?.firstName && p.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p?.lastName && p.lastName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p?.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLevel = selectedLevel === 'ALL' || String(s.currentLevel) === selectedLevel;
    const matchesDept =
      selectedDept === 'ALL' ||
      s.departmentName?.toLowerCase() === selectedDept.toLowerCase() ||
      p?.departmentId === selectedDept;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && p?.isActive !== false) ||
      (statusFilter === 'ARCHIVED' && p?.isActive === false);

    return matchesSearch && matchesLevel && matchesDept && matchesStatus;
  });

  const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSystemSettingsAction(
        {
          examEligibilityThreshold: Number(settings.examEligibilityThreshold),
          minimumAttendanceWarningThreshold: Number(settings.minimumAttendanceWarningThreshold),
          qrRotationSeconds: Number(settings.qrRotationSeconds),
          lateThresholdMinutes: Number(settings.lateThresholdMinutes),
        },
        user.id
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Institutional Administration
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">ICT Directorate &amp; Academic Registry</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            CUSTECH Central Academic Presence &amp; Student Database
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System Administrator: Engr. {user.firstName} {user.lastName}. Full control over student admissions, course enrollments, RBAC user permissions, and attendance parameters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsIntegrationModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-xs"
          >
            <Network className="w-4 h-4 text-[#8d4a27]" />
            <span>SIS Integration</span>
          </button>

          <button
            onClick={() => {
              handleResetAddForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Student</span>
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('COURSES')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'COURSES'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 text-[#8d4a27]" />
          <span>Course Catalogue</span>
        </button>

        <button
          onClick={() => setActiveTab('TIMETABLE')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'TIMETABLE'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4 text-[#8d4a27]" />
          <span>Timetable &amp; Schedules</span>
        </button>

        <button
          onClick={() => setActiveTab('LECTURERS')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'LECTURERS'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 text-[#8d4a27]" />
          <span>Lecturer Directory</span>
        </button>

        <button
          onClick={() => setActiveTab('MONITORING')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'MONITORING'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Live Monitor &amp; Anti-Proxy</span>
        </button>

        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'STUDENTS'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-[#8d4a27]" />
          <span>Students ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'ROLES'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 text-[#8d4a27]" />
          <span>User Roles ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('INTEGRATION')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'INTEGRATION'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4 text-[#8d4a27]" />
          <span>SIS Connector</span>
        </button>

        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'POLICIES'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#8d4a27]" />
          <span>Policies</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'AUDIT'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#8d4a27]" />
          <span>Audit ({auditLogs.length})</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB: COURSE CATALOGUE MANAGEMENT                               */}
      {/* ============================================================== */}
      {activeTab === 'COURSES' && <CourseManagementTab adminUserId={user.id} />}

      {/* ============================================================== */}
      {/* TAB: TIMETABLE & SCHEDULING                                    */}
      {/* ============================================================== */}
      {activeTab === 'TIMETABLE' && <TimetableManagementTab adminUserId={user.id} />}

      {/* ============================================================== */}
      {/* TAB: LECTURER DIRECTORY & ASSIGNMENTS                          */}
      {/* ============================================================== */}
      {activeTab === 'LECTURERS' && <LecturerManagementTab adminUserId={user.id} />}

      {/* ============================================================== */}
      {/* TAB: LIVE ATTENDANCE & ANTI-PROXY SURVEILLANCE                 */}
      {/* ============================================================== */}
      {activeTab === 'MONITORING' && <AttendanceMonitoringTab adminUserId={user.id} />}

      {/* ============================================================== */}
      {/* TAB 1: STUDENT REGISTRY & ADMISSIONS                           */}
      {/* ============================================================== */}
      {activeTab === 'STUDENTS' && (
        <div className="space-y-6">
          {/* KPI Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-semibold">Total Registered Students</div>
              <p className="text-3xl font-black text-slate-900 mt-1">{students.length}</p>
              <p className="text-xs text-slate-400 mt-1">In official university registry</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-semibold">Computer Science (CSC)</div>
              <p className="text-3xl font-black text-slate-900 mt-1">
                {students.filter((s) => s.profile?.departmentId === 'dept-csc').length}
              </p>
              <p className="text-xs text-slate-400 mt-1">200L & DE cohort</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-semibold">Active In Lectures</div>
              <p className="text-3xl font-black text-slate-900 mt-1">100%</p>
              <p className="text-xs text-slate-400 mt-1">Enrolled in active courses</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="text-xs text-slate-500 font-semibold">Default PIN Auth</div>
              <p className="text-3xl font-black text-[#8d4a27] mt-1">Active</p>
              <p className="text-xs text-slate-400 mt-1">Kiosk 4-digit PIN enabled</p>
            </div>
          </div>

          {/* Student Table & Filters Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student by name or matric number (e.g. 25L1CS...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                />
              </div>

              {/* Filters & Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'ARCHIVED');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="ARCHIVED">Deactivated / Archived</option>
                </select>

                <select
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                >
                  <option value="ALL">All Levels</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                  <option value="500">500 Level</option>
                </select>

                <select
                  value={selectedDept}
                  onChange={(e) => {
                    setSelectedDept(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                >
                  <option value="ALL">All Departments ({availableDepartments.length})</option>
                  {availableDepartments.map((deptName) => (
                    <option key={deptName} value={deptName}>
                      {deptName}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    setBulkPreviewStep(false);
                    setBulkSummary(null);
                    setIsBulkModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                  title="Import multiple students via CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#8d4a27]" />
                  <span>Bulk Import</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto w-full mt-4">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="border-b border-slate-200 text-slate-400 uppercase text-xs font-semibold">
                  <tr>
                    <th className="pb-3 pt-1">Matriculation No</th>
                    <th className="pb-3 pt-1">Student Full Name</th>
                    <th className="pb-3 pt-1">Department</th>
                    <th className="pb-3 pt-1">Faculty</th>
                    <th className="pb-3 pt-1">Level</th>
                    <th className="pb-3 pt-1">Courses</th>
                    <th className="pb-3 pt-1">Status</th>
                    <th className="pb-3 pt-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                        No students match the search filter. Click "+ Add New Student" to enroll one.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((st) => {
                      const p = st.profile;
                      const isActive = p?.isActive !== false;
                      return (
                        <tr key={st.id} className="hover:bg-slate-50 transition group">
                          {/* Matric */}
                          <td className="py-3 font-mono font-bold text-slate-900">
                            <span className="inline-flex items-center gap-1">
                              {st.matricNumber}
                              <button
                                onClick={() => navigator.clipboard.writeText(st.matricNumber)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-600 transition"
                                title="Copy Matric Number"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          </td>

                          {/* Name & Email */}
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] font-bold text-xs flex items-center justify-center shrink-0">
                                {p?.firstName?.[0] || 'S'}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">
                                  {p?.firstName} {p?.lastName}
                                </p>
                                <p className="text-[11px] text-slate-400">{p?.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Dept */}
                          <td className="py-3 text-slate-600 font-medium">{st.departmentName}</td>

                          {/* Faculty */}
                          <td className="py-3 text-slate-500 text-xs">{st.facultyName || 'Faculty of Computing'}</td>

                          {/* Level */}
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                              {st.currentLevel}L
                            </span>
                          </td>

                          {/* Courses */}
                          <td className="py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                              {st.enrolledCoursesCount} Enrolled
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                <Archive className="w-3 h-3 text-slate-400" />
                                <span>Deactivated</span>
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {/* Edit Student */}
                              <button
                                onClick={() => openEditModal(st)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-[#8d4a27] hover:bg-[#fbf5ef] transition"
                                title="Edit Student Information"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Archive / Deactivate */}
                              <button
                                onClick={() => handleToggleArchiveStudent(st.id, isActive, st.matricNumber)}
                                className={`p-1.5 rounded-lg transition ${
                                  isActive
                                    ? 'text-slate-400 hover:text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
                                }`}
                                title={isActive ? 'Deactivate / Archive Student' : 'Reactivate Student'}
                              >
                                {isActive ? <Archive className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>

                              {/* Test Sign In */}
                              {p && (
                                <button
                                  onClick={() => handleTestSignInAsStudent(p)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-[#8d4a27] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1"
                                  title="Test sign-in as this student"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Login</span>
                                </button>
                              )}

                              {/* Reset PIN */}
                              <button
                                onClick={() => setPinResetModal({ studentId: st.id, matric: st.matricNumber })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition"
                                title="Reset Attendance PIN"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteStudent(st.id, st.matricNumber)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition"
                                title="Delete Student"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredStudents.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length} students</span>
                  <span className="text-slate-300">•</span>
                  <div className="flex items-center gap-1">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-2 py-1 rounded border border-slate-300 bg-white text-slate-700 font-semibold"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1 font-bold text-slate-800">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            {/* End of Pagination */}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: USER ROLES & ACCESS CONTROL                               */}
      {/* ============================================================== */}
      {activeTab === 'ROLES' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name, email, staff ID or matric..."
                  value={roleSearchQuery}
                  onChange={(e) => setRoleSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                >
                  <option value="ALL">All Roles ({usersList.length})</option>
                  <option value="SUPER_ADMIN">ICT Administrator</option>
                  <option value="HOD">Head of Department (HOD)</option>
                  <option value="LECTURER">Course Lecturer</option>
                  <option value="DEAN">Faculty Dean / Representative</option>
                  <option value="FACULTY_REP">Faculty Representative</option>
                  <option value="ASST_FACULTY_REP">Assistant Faculty Representative</option>
                  <option value="COURSE_REP">Course Representative</option>
                  <option value="ASSISTANT_COURSE_REP">Assistant Course Representative</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto w-full mt-4">
              <table className="w-full text-left text-xs min-w-[760px]">
                <thead className="border-b border-slate-200 text-slate-400 uppercase text-xs font-semibold">
                  <tr>
                    <th className="pb-3 pt-1">User Name</th>
                    <th className="pb-3 pt-1">Identifier (Staff ID / Matric)</th>
                    <th className="pb-3 pt-1">Email</th>
                    <th className="pb-3 pt-1">Primary Role</th>
                    <th className="pb-3 pt-1">Department / Faculty</th>
                    <th className="pb-3 pt-1">Status</th>
                    <th className="pb-3 pt-1 text-right">Role Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersList
                    .filter((u) => {
                      const matchesSearch =
                        `${u.firstName} ${u.lastName}`.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
                        u.email.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
                        (u.matricNumber && u.matricNumber.toLowerCase().includes(roleSearchQuery.toLowerCase())) ||
                        (u.staffId && u.staffId.toLowerCase().includes(roleSearchQuery.toLowerCase()));

                      const matchesRole =
                        roleFilter === 'ALL' ||
                        u.primaryRole === roleFilter ||
                        u.assignedRoles.includes(roleFilter as UserRole);

                      return matchesSearch && matchesRole;
                    })
                    .map((u) => {
                      return (
                        <tr key={u.id} className="hover:bg-slate-50 transition">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#fbf5ef] text-[#8d4a27] font-bold text-xs flex items-center justify-center shrink-0 border border-[#ecdacb]">
                                {u.firstName[0]}
                              </div>
                              <span className="font-bold text-slate-900">
                                {u.firstName} {u.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 font-mono font-semibold text-slate-700">
                            {u.matricNumber || u.staffId || 'ADMIN'}
                          </td>
                          <td className="py-3 text-slate-500 font-mono text-[11px]">{u.email}</td>
                          <td className="py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                              {u.primaryRole}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600">
                            <p className="font-medium">{u.departmentName}</p>
                            <p className="text-[10px] text-slate-400">{u.facultyName}</p>
                          </td>
                          <td className="py-3">
                            {u.isActive !== false ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => {
                                setRoleAssignModalUser(u);
                                setNewRoleSelection(u.primaryRole);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-[#8d4a27] hover:text-white text-slate-700 text-xs font-bold transition inline-flex items-center gap-1"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Assign Role</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB: UNIVERSITY SIS / ERP DATABASE INTEGRATION ARCHITECTURE    */}
      {/* ============================================================== */}
      {activeTab === 'INTEGRATION' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-[#fbf5ef] border border-[#ecdacb] text-[#8d4a27] flex items-center justify-center shrink-0">
                <Network className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Future University Student Information System (SIS) Integration
                </h3>
                <p className="text-xs text-slate-500">
                  Clean modular integration architecture for direct, authorized data exchange when management permits.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#8d4a27]" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">REST API Gateway</h4>
                </div>
                <p className="text-xs text-slate-600">
                  Secure webhook &amp; REST connector endpoint for live bi-directional sync of student enrollments and matriculation updates.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-500 bg-white p-2 rounded border border-slate-200">
                  POST /api/v1/sis/sync-students<br />
                  Authorization: Bearer &lt;SIS_SECURE_TOKEN&gt;
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#8d4a27]" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Batch Database Exchange</h4>
                </div>
                <p className="text-xs text-slate-600">
                  Automated intake and mapping of university registrar CSV/Excel extracts into standardized CourseTaker tables.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-500 bg-white p-2 rounded border border-slate-200">
                  Scheduled Cron: Every Sunday 02:00 AM<br />
                  Format: UTF-8 CSV / XLSX
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#8d4a27]" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Zero-Assumption Security</h4>
                </div>
                <p className="text-xs text-slate-600">
                  Designed without assumption of direct database credentials; uses clean ingestion interfaces with role verification and audit logging.
                </p>
                <div className="pt-2 text-[11px] font-mono text-slate-500 bg-white p-2 rounded border border-slate-200">
                  Data Governance: Fully Audited<br />
                  Field Validation: Enforced
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">Architectural Readiness Status:</p>
                <p className="mt-0.5">
                  The data repository is structured to seamlessly bind to external university endpoints. Once university ICT and Senate grant API authorization keys, connection parameters can be activated without architectural restructuring.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SYSTEM POLICIES & ATTENDANCE PARAMETERS                 */}
      {/* ============================================================== */}
      {activeTab === 'POLICIES' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#8d4a27]" />
              <h3 className="text-sm font-bold text-slate-900">
                Institutional Policy & Attendance Parameters
              </h3>
            </div>
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-[#8d4a27]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Policies Updated & Audited</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Exam Eligibility Threshold (%)
              </label>
              <input
                type="number"
                min={50}
                max={100}
                value={settings.examEligibilityThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, examEligibilityThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:border-[#8d4a27] focus:ring-1 focus:ring-[#8d4a27] outline-hidden transition"
              />
              <p className="text-xs text-slate-400 mt-1">Statutory attendance requirement (default 75%)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Warning Notice Threshold (%)
              </label>
              <input
                type="number"
                min={40}
                max={90}
                value={settings.minimumAttendanceWarningThreshold}
                onChange={(e) =>
                  setSettings({ ...settings, minimumAttendanceWarningThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:border-[#8d4a27] focus:ring-1 focus:ring-[#8d4a27] outline-hidden transition"
              />
              <p className="text-xs text-slate-400 mt-1">Triggers student portal alert (default 70%)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                QR Code Rotation Interval (Seconds)
              </label>
              <input
                type="number"
                min={10}
                max={120}
                value={settings.qrRotationSeconds}
                onChange={(e) =>
                  setSettings({ ...settings, qrRotationSeconds: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:border-[#8d4a27] focus:ring-1 focus:ring-[#8d4a27] outline-hidden transition"
              />
              <p className="text-xs text-slate-400 mt-1">Anti-proxy refresh period (default 60s)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Late Status Grace Period (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={45}
                value={settings.lateThresholdMinutes}
                onChange={(e) =>
                  setSettings({ ...settings, lateThresholdMinutes: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:border-[#8d4a27] focus:ring-1 focus:ring-[#8d4a27] outline-hidden transition"
              />
              <p className="text-xs text-slate-400 mt-1">Classes after this are marked LATE (default 15m)</p>
            </div>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {isSaving ? 'Applying Changes...' : 'Save & Publish Policy Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: IMMUTABLE AUDIT TRAIL                                   */}
      {/* ============================================================== */}
      {activeTab === 'AUDIT' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8d4a27]" />
              <h3 className="text-sm font-bold text-slate-900">
                Immutable Security & System Audit Trail ({auditLogs.length} Events)
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">PostgreSQL Append-Only Registry</span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="border-b border-slate-200 text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="pb-3 pt-1">Timestamp</th>
                  <th className="pb-3 pt-1">Actor</th>
                  <th className="pb-3 pt-1">Role</th>
                  <th className="pb-3 pt-1">Action</th>
                  <th className="pb-3 pt-1">Target Entity</th>
                  <th className="pb-3 pt-1">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {formatTime(log.createdAt)}
                    </td>
                    <td className="py-3 font-semibold text-slate-800">{log.actorName}</td>
                    <td className="py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                        {log.actorRole}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-slate-900 font-bold">{log.action}</td>
                    <td className="py-3 text-slate-500 font-mono text-xs">{log.entityType}</td>
                    <td className="py-3 text-slate-400 text-xs max-w-xs truncate">
                      {JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD NEW STUDENT                                         */}
      {/* ============================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6">
            {/* Header */}
            <div className="bg-[#743c22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5f321d] flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                    Enroll Student in CUSTECH Database
                  </h3>
                  <p className="text-xs text-[#eed7c3]">
                    Official Academic Admissions & Attendance Registration
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#eed7c3] hover:text-white hover:bg-[#5f321d] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {registeredStudentSuccess ? (
                /* Success Card with Credentials Slip */
                <div className="space-y-4 animate-fadeIn">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950">
                        Student Successfully Registered &amp; Enrolled!
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        The student is now active in the university database, enrolled in course offerings, and ready for lecture attendance.
                      </p>
                    </div>
                  </div>

                  {/* Student Credentials Slip Card */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Official Student Login Credentials
                      </span>
                      <span className="text-[11px] font-mono font-bold text-[#8d4a27] bg-[#fbf5ef] px-2 py-0.5 rounded border border-[#ecdacb]">
                        Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Full Name:</span>
                        <span className="font-bold text-slate-800">
                          {registeredStudentSuccess.profile.firstName} {registeredStudentSuccess.profile.lastName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Matriculation Number:</span>
                        <span className="font-mono font-bold text-[#8d4a27]">
                          {registeredStudentSuccess.student.matricNumber}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">University Email:</span>
                        <span className="font-mono text-slate-700">{registeredStudentSuccess.profile.email}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">4-Digit Attendance PIN:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {registeredStudentSuccess.pin}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const text = `CUSTECH Academic Credentials:\nName: ${registeredStudentSuccess.profile.firstName} ${registeredStudentSuccess.profile.lastName}\nMatric: ${registeredStudentSuccess.student.matricNumber}\nEmail: ${registeredStudentSuccess.profile.email}\nAttendance PIN: ${registeredStudentSuccess.pin}`;
                          navigator.clipboard.writeText(text);
                          alert('Credentials copied to clipboard!');
                        }}
                        className="flex-1 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#8d4a27]" />
                        <span>Copy Credentials</span>
                      </button>

                      <button
                        onClick={() => {
                          handleTestSignInAsStudent(registeredStudentSuccess.profile);
                        }}
                        className="flex-1 py-2 px-3 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Test Sign-In Now</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleResetAddForm}
                      className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                    >
                      + Add Another Student
                    </button>
                  </div>
                </div>
              ) : (
                /* Registration Form */
                <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tunde"
                        value={firstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bello"
                        value={lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                      />
                    </div>
                  </div>

                  {/* Matriculation Number with live pattern validation */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Matriculation Number *
                      </label>
                      {matricNumber && (
                        <span
                          className={`text-[11px] font-bold ${
                            validateMatricFormat(matricNumber) ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {validateMatricFormat(matricNumber)
                            ? '✓ Standard CUSTECH Format Verified'
                            : 'Standard: e.g. 25L1CS1050 or DE 25L2CS1050'}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 25L1CS1050 (UTME) or DE 25L2CS1050 (Direct Entry)"
                      value={matricNumber}
                      onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono uppercase text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                    />
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                      <span>Quick presets:</span>
                      <button
                        type="button"
                        onClick={() => setMatricNumber('25L1CS' + Math.floor(1000 + Math.random() * 9000))}
                        className="text-[#8d4a27] font-semibold hover:underline"
                      >
                        Generate UTME (25L1CS...)
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setMatricNumber('DE 25L2CS' + Math.floor(1000 + Math.random() * 9000))}
                        className="text-[#8d4a27] font-semibold hover:underline"
                      >
                        Generate DE (25L2CS...)
                      </button>
                    </div>
                  </div>

                  {/* Email (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        University Email (Optional)
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">Leave blank to auto-generate from matric</span>
                    </div>
                    <input
                      type="email"
                      placeholder="e.g. tunde.bello@student.custech.edu.ng (Optional)"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                    />
                  </div>

                  {/* Faculty & Department */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Faculty *
                      </label>
                      <select
                        value={facultyId}
                        onChange={(e) => setFacultyId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                      >
                        {faculties.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Department *
                      </label>
                      <input
                        type="text"
                        required
                        list="custech-all-departments-list"
                        placeholder="e.g. Computer Science, Mechanical..."
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                      />
                      <datalist id="custech-all-departments-list">
                        <option value="Computer Science" />
                        <option value="Software Engineering" />
                        <option value="Cybersecurity" />
                        <option value="Information Technology" />
                        <option value="Artificial Intelligence and Robotics" />
                        <option value="Civil Engineering" />
                        <option value="Mechanical Engineering" />
                        <option value="Electrical and Electronics Engineering" />
                        <option value="Mining Engineering" />
                        <option value="Chemical Engineering" />
                        <option value="Materials and Metallurgical Engineering" />
                        <option value="Agricultural and Bioresources Engineering" />
                        <option value="Mathematics" />
                        <option value="Physics with Electronics" />
                        <option value="Chemistry" />
                        <option value="Biology" />
                        <option value="Biochemistry" />
                        <option value="Microbiology" />
                        <option value="Geology" />
                        <option value="Applied Geophysics" />
                        <option value="Statistics" />
                        <option value="Accounting" />
                        <option value="Business Administration" />
                        <option value="Economics" />
                        <option value="Mass Communication" />
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    {/* Level */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Level
                      </label>
                      <select
                        value={currentLevel}
                        onChange={(e) =>
                          setCurrentLevel(Number(e.target.value) as 100 | 200 | 300 | 400 | 500)
                        }
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                      >
                        <option value={100}>100 Level</option>
                        <option value={200}>200 Level</option>
                        <option value={300}>300 Level</option>
                        <option value={400}>400 Level</option>
                        <option value={500}>500 Level</option>
                      </select>
                    </div>

                    {/* PIN */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        4-Digit PIN
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={pin}
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 font-mono text-center text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Auto-enroll checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="auto-enroll"
                      checked={autoEnroll}
                      onChange={(e) => setAutoEnroll(e.target.checked)}
                      className="accent-[#8d4a27] w-4 h-4 rounded"
                    />
                    <label htmlFor="auto-enroll" className="text-xs text-slate-700 select-none">
                      Automatically enroll student in active departmental courses (e.g. CSC 201)
                    </label>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                      {isSubmitting ? 'Registering...' : 'Complete Student Registration'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ENHANCED BULK CSV / EXCEL IMPORT                         */}
      {/* ============================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            <div className="bg-[#743c22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#eed7c3]" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    University Bulk Student Import
                  </h3>
                  <p className="text-[11px] text-[#eed7c3]">
                    Pre-validate, detect duplicates, and import student cohorts
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkPreviewStep(false);
                  setBulkSummary(null);
                }}
                className="p-1.5 rounded-lg text-[#eed7c3] hover:text-white hover:bg-[#5f321d] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {/* STAGE 3: IMPORT SUMMARY */}
              {bulkSummary ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-emerald-900">
                        Batch Import Processing Completed
                      </h4>
                      <p className="text-xs text-emerald-700 mt-1">
                        The student records have been verified and processed by the university database engine.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                      <p className="text-[11px] font-bold text-emerald-700 uppercase">Successfully Added</p>
                      <p className="text-2xl font-extrabold text-emerald-800">{bulkSummary.successful}</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <p className="text-[11px] font-bold text-amber-700 uppercase">Skipped (Duplicates)</p>
                      <p className="text-2xl font-extrabold text-amber-800">{bulkSummary.skipped}</p>
                    </div>
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-center">
                      <p className="text-[11px] font-bold text-rose-700 uppercase">Failed / Rejected</p>
                      <p className="text-2xl font-extrabold text-rose-800">{bulkSummary.failed}</p>
                    </div>
                  </div>

                  {bulkSummary.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-slate-700 mb-2">Detailed Error Log:</p>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-rose-700">
                        {bulkSummary.errors.map((err, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{err.matricNumber || 'Row'}:</span>
                            <span>{err.error}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={() => {
                        setIsBulkModalOpen(false);
                        setBulkPreviewStep(false);
                        setBulkSummary(null);
                        refreshStudentsList();
                      }}
                      className="px-5 py-2.5 rounded-xl bg-[#8d4a27] text-white text-xs font-bold hover:bg-[#743c22] transition"
                    >
                      Done & View Student Registry
                    </button>
                  </div>
                </div>
              ) : bulkPreviewStep ? (
                /* STAGE 2: PREVIEW & VALIDATION */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Validation & Duplication Pre-Check
                      </h4>
                      <p className="text-xs text-slate-500">
                        Review parsed student records before committing to the database.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        {bulkParsedRows.filter((r) => r.status === 'READY').length} Ready
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        {bulkParsedRows.filter((r) => r.status === 'DUPLICATE').length} Duplicate
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        {bulkParsedRows.filter((r) => r.status === 'ERROR').length} Error
                      </span>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Matric No.</th>
                          <th className="p-2.5">Full Name</th>
                          <th className="p-2.5">Department</th>
                          <th className="p-2.5">Level</th>
                          <th className="p-2.5">Note</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {bulkParsedRows.map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              row.status === 'READY'
                                ? 'bg-white hover:bg-slate-50'
                                : row.status === 'DUPLICATE'
                                ? 'bg-amber-50/50'
                                : 'bg-rose-50/50'
                            }
                          >
                            <td className="p-2.5">
                              {row.status === 'READY' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                              )}
                              {row.status === 'DUPLICATE' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                  <AlertCircle className="w-3 h-3" /> Duplicate
                                </span>
                              )}
                              {row.status === 'ERROR' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                  <X className="w-3 h-3" /> Invalid
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono font-bold text-slate-800">{row.matricNumber || '—'}</td>
                            <td className="p-2.5 text-slate-800">{row.firstName} {row.lastName}</td>
                            <td className="p-2.5 text-slate-600">{row.departmentName}</td>
                            <td className="p-2.5 text-slate-600">{row.currentLevel}L</td>
                            <td className="p-2.5 text-[11px] text-slate-500">{row.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setBulkPreviewStep(false)}
                      className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmBulkImport}
                      disabled={isSubmitting || bulkParsedRows.filter((r) => r.status === 'READY').length === 0}
                      className="px-5 py-2.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                      {isSubmitting
                        ? 'Executing Import...'
                        : `Confirm & Import ${bulkParsedRows.filter((r) => r.status === 'READY').length} Valid Students`}
                    </button>
                  </div>
                </div>
              ) : (
                /* STAGE 1: UPLOAD & PASTE FORM */
                <div className="space-y-4">
                  {/* Template Download Banner */}
                  <div className="p-3.5 bg-[#fbf5ef] border border-[#ecdacb] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-[#743c22]">Standard CUSTECH Student Import Template</p>
                      <p className="text-[11px] text-[#8d4a27]">
                        Columns: First Name, Last Name, Matric Number, Email, Level, Department
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadSampleCsvTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#8d4a27] text-[#8d4a27] hover:bg-[#8d4a27] hover:text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Template
                    </button>
                  </div>

                  {/* File Upload Dropzone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Upload CSV File
                    </label>
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 hover:border-[#8d4a27] rounded-xl cursor-pointer bg-slate-50 hover:bg-[#fbf5ef] transition text-center">
                      <Upload className="w-8 h-8 text-[#8d4a27] mb-2" />
                      <span className="text-xs font-bold text-slate-700">Click to browse or drop CSV file here</span>
                      <span className="text-[11px] text-slate-400 mt-1">Accepts UTF-8 formatted .csv files</span>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Direct CSV Textarea Fallback */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Or Paste Raw CSV Data
                      </label>
                      <span className="text-[11px] text-slate-400 font-mono">1 record per line</span>
                    </div>
                    <textarea
                      rows={5}
                      value={csvContent}
                      onChange={(e) => setCsvContent(e.target.value)}
                      placeholder="FirstName, LastName, MatricNumber, Email, Level, Department"
                      className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(false)}
                      className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => parseAndValidateCsv(csvContent)}
                      disabled={!csvContent.trim()}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Validate & Preview Records
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EDIT STUDENT RECORD                                     */}
      {/* ============================================================== */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-6">
            <div className="bg-[#743c22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#eed7c3]" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Edit Student Record
                  </h3>
                  <p className="text-[11px] text-[#eed7c3] font-mono">
                    {editStudent.matricNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditStudent(null)}
                className="p-1.5 rounded-lg text-[#eed7c3] hover:text-white hover:bg-[#5f321d] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudentSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>
              </div>

              {/* Matriculation Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Matriculation Number *
                </label>
                <input
                  type="text"
                  required
                  value={editMatric}
                  onChange={(e) => setEditMatric(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono uppercase text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  University Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                />
              </div>

              {/* Faculty & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Faculty *
                  </label>
                  <select
                    value={editFacultyId}
                    onChange={(e) => setEditFacultyId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                  >
                    {faculties.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    list="custech-all-departments-list"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>
              </div>

              {/* Level & Active Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Level
                  </label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value) as 100 | 200 | 300 | 400 | 500)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                  >
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>

                <div className="pt-5">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="accent-[#8d4a27] w-4 h-4 rounded"
                    />
                    <span className="text-xs font-bold text-slate-700">
                      Active Student Account
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    {editIsActive ? 'Student can mark attendance' : 'Archived / Inactive'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Student Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ROLE ASSIGNMENT & ACCESS CONTROL                        */}
      {/* ============================================================== */}
      {roleAssignModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-6">
            <div className="bg-[#743c22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#eed7c3]" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  Assign System Role & Permissions
                </h3>
              </div>
              <button
                onClick={() => {
                  setRoleAssignModalUser(null);
                  setRoleAssignFeedback(null);
                }}
                className="p-1.5 rounded-lg text-[#eed7c3] hover:text-white hover:bg-[#5f321d] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignRoleSubmit} className="p-6 space-y-4">
              {roleAssignFeedback && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{roleAssignFeedback}</span>
                </div>
              )}

              {/* Target User Info */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  {roleAssignModalUser.firstName} {roleAssignModalUser.lastName}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  {roleAssignModalUser.email}
                </p>
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-500">Current Role:</span>
                  <span className="font-bold text-[#8d4a27] bg-[#fbf5ef] border border-[#ecdacb] px-2 py-0.5 rounded">
                    {roleAssignModalUser.primaryRole}
                  </span>
                </div>
              </div>

              {/* Role Selection Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Assign New Role *
                </label>
                <select
                  value={newRoleSelection}
                  onChange={(e) => setNewRoleSelection(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                >
                  <option value="SUPER_ADMIN">ICT Administrator (Super Admin)</option>
                  <option value="HOD">Head of Department (HOD)</option>
                  <option value="LECTURER">Lecturer / Course Examiner</option>
                  <option value="FACULTY_REP">Faculty Representative</option>
                  <option value="ASST_FACULTY_REP">Assistant Faculty Representative</option>
                  <option value="COURSE_REP">Course Representative</option>
                  <option value="ASST_COURSE_REP">Assistant Course Representative</option>
                  <option value="STUDENT">Student</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Enforces strict backend authorization across dashboards and API routes.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setRoleAssignModalUser(null);
                    setRoleAssignFeedback(null);
                  }}
                  className="px-4 py-2.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: RESET ATTENDANCE PIN                                    */}
      {/* ============================================================== */}
      {pinResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Reset Confidential Attendance PIN
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Student: <span className="font-mono font-bold text-[#8d4a27]">{pinResetModal.matric}</span>
            </p>

            <form onSubmit={handleResetPinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New 4-Digit PIN
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={newPinValue}
                  onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 text-center text-xl font-mono tracking-widest rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPinResetModal(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newPinValue.length !== 4}
                  className="px-4 py-2 rounded-lg bg-[#8d4a27] text-white text-xs font-bold disabled:opacity-50"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
