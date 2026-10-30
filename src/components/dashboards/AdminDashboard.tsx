'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, SystemSettings, Student, UserRole } from '@/types';
import {
  updateSystemSettingsAction,
  registerStudentAction,
  deleteStudentAction,
  resetStudentPinAction,
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
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = React.useState<'STUDENTS' | 'POLICIES' | 'AUDIT'>('STUDENTS');
  const [settings, setSettings] = React.useState<SystemSettings>(custechDb.getSystemSettings());
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Student Registry State
  const [students, setStudents] = React.useState(custechDb.getAllStudentsDetailed());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedLevel, setSelectedLevel] = React.useState<string>('ALL');
  const [selectedDept, setSelectedDept] = React.useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);

  // Add Student Form State
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [matricNumber, setMatricNumber] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [departmentName, setDepartmentName] = React.useState('Computer Science');
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

  // Bulk Import State
  const [csvContent, setCsvContent] = React.useState(
    `Tunde, Bello, 25L1CS1050, , 200, Computer Science\n` +
    `Fatima, Musa, 25L1CV1051, f.musa@gmail.com, 100, Civil Engineering\n` +
    `David, Audu, DE 25L2ME1052, , 200, Mechanical Engineering\n` +
    `Zainab, Ibrahim, 25L1BC1022, , 100, Biochemistry`
  );
  const [bulkStatus, setBulkStatus] = React.useState<string | null>(null);

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
          currentLevel,
          pin,
          enrollInCourses: autoEnroll,
        },
        user.id
      );

      if (!res.success || !res.student || !res.profile) {
        setFormError(res.error || 'Failed to register student.');
      } else {
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
    setPin('1234');
    setFormError(null);
    setRegisteredStudentSuccess(null);
  };

  // Handle Student Deletion
  const handleDeleteStudent = async (studentId: string, matric: string) => {
    if (!confirm(`Are you sure you want to remove student with Matric Number ${matric} from the database?`)) {
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

  // Quick Sign In As This Student (Allows admin to test student view immediately)
  const handleTestSignInAsStudent = (profile: UserProfile) => {
    storeSession({
      user: profile,
      activeRole: 'STUDENT',
      loginTime: new Date().toISOString(),
    });
  };

  // Handle Bulk CSV Import
  const handleBulkImport = async () => {
    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    let imported = 0;
    const errors: string[] = [];

    setIsSubmitting(true);
    for (const line of lines) {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 3) continue;
      const [fName, lName, mat, em, lvl, dept] = parts;
      try {
        const res = await registerStudentAction(
          {
            firstName: fName,
            lastName: lName,
            matricNumber: mat.toUpperCase(),
            email: em && em.includes('@') ? em.toLowerCase() : undefined,
            currentLevel: (Number(lvl) as 100 | 200 | 300 | 400 | 500) || 200,
            departmentName: dept || 'Computer Science',
            pin: '1234',
            enrollInCourses: true,
          },
          user.id
        );
        if (res.success) imported++;
        else errors.push(`${mat}: ${res.error}`);
      } catch (e: unknown) {
        errors.push(`${mat}: ${e instanceof Error ? e.message : 'Error'}`);
      }
    }

    setIsSubmitting(false);
    refreshStudentsList();
    if (errors.length === 0) {
      setBulkStatus(`Successfully registered ${imported} student(s) into CUSTECH database.`);
    } else {
      setBulkStatus(`Imported ${imported} student(s). Errors: ${errors.join('; ')}`);
    }
    setTimeout(() => {
      setBulkStatus(null);
      if (errors.length === 0) setIsBulkModalOpen(false);
    }, 4000);
  };

  // Filter students
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

    return matchesSearch && matchesLevel && matchesDept;
  });

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
            <span className="text-xs text-slate-500 font-medium">ICT Directorate & Academic Registry</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            CUSTECH Central Academic Presence & Student Database
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System Administrator: Engr. {user.firstName} {user.lastName}. Full control over student admissions, course enrollments, policies, and attendance parameters.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setActiveTab('STUDENTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'STUDENTS'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <GraduationCap className="w-4 h-4 text-[#8d4a27]" />
          <span>Student Directory & Admissions ({students.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'POLICIES'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#8d4a27]" />
          <span>Attendance Policies & Parameters</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'AUDIT'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-[#8d4a27]" />
          <span>Security Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

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
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                >
                  <option value="ALL">All Levels</option>
                  <option value="100">100 Level</option>
                  <option value="200">200 Level</option>
                  <option value="300">300 Level</option>
                  <option value="400">400 Level</option>
                </select>

                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
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
                  onClick={() => setIsBulkModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                  title="Import multiple students via CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#8d4a27]" />
                  <span>Bulk CSV Import</span>
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto w-full mt-4">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="border-b border-slate-200 text-slate-400 uppercase text-xs font-semibold">
                  <tr>
                    <th className="pb-3 pt-1">Matriculation No</th>
                    <th className="pb-3 pt-1">Student Full Name</th>
                    <th className="pb-3 pt-1">Department</th>
                    <th className="pb-3 pt-1">Level</th>
                    <th className="pb-3 pt-1">Courses</th>
                    <th className="pb-3 pt-1">Status</th>
                    <th className="pb-3 pt-1 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                        No students match the search filter. Click "+ Add New Student" to enroll one.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((st) => {
                      const p = st.profile;
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
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Active</span>
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              {/* Test Sign In */}
                              {p && (
                                <button
                                  onClick={() => handleTestSignInAsStudent(p)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#8d4a27] hover:text-white text-slate-700 text-xs font-bold transition flex items-center gap-1"
                                  title="Instant test sign-in as this student"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>Test Login</span>
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
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SYSTEM POLICIES & ATTENDANCE PARAMETERS                 */}
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
                max={60}
                value={settings.qrRotationSeconds}
                onChange={(e) =>
                  setSettings({ ...settings, qrRotationSeconds: Number(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono focus:border-[#8d4a27] focus:ring-1 focus:ring-[#8d4a27] outline-hidden transition"
              />
              <p className="text-xs text-slate-400 mt-1">Anti-proxy refresh period (default 20s)</p>
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

                  {/* Department (Typed Input with Datalist of all CUSTECH Departments) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Department * (Type Any CUSTECH Dept)
                      </label>
                      <span className="text-[11px] text-slate-400">Type freely or choose suggestion</span>
                    </div>
                    <input
                      type="text"
                      required
                      list="custech-all-departments-list"
                      placeholder="Type department (e.g. Mechanical Engineering, Civil, Geology, Biochemistry...)"
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
      {/* MODAL: BULK CSV IMPORT                                         */}
      {/* ============================================================== */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-6">
            <div className="bg-[#743c22] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#eed7c3]" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  Batch Import Students from CSV
                </h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1 rounded-lg text-[#eed7c3] hover:text-white hover:bg-[#5f321d]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Paste student records below. Format: <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono">FirstName, LastName, MatricNumber, Email, Level, DepartmentId</code>
              </p>

              {bulkStatus && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                  {bulkStatus}
                </div>
              )}

              <textarea
                rows={6}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 text-slate-900 bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-600"
                >
                  Close
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Importing Batch...' : 'Run Batch Import'}
                </button>
              </div>
            </div>
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
