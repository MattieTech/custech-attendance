'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  BookOpen,
  Search,
  Edit,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  Mail,
  Layers,
  Keyboard,
  ListFilter,
} from 'lucide-react';
import {
  getLecturersAction,
  createLecturerAction,
  updateLecturerAction,
  toggleLecturerActiveAction,
  assignLecturerToCourseAction,
  assignCourseManuallyAction,
  ensureDepartmentAction,
  getCourseOfferingsAction,
  getFacultiesAndDepartmentsAction,
} from '@/actions/academic';
import { Department, Faculty } from '@/types';

interface LecturerManagementTabProps {
  adminUserId: string;
}

export const LecturerManagementTab: React.FC<LecturerManagementTabProps> = ({ adminUserId }) => {
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<any | null>(null);
  const [assigningLecturer, setAssigningLecturer] = useState<any | null>(null);

  // Assign Course Modal State
  const [assignMode, setAssignMode] = useState<'MANUAL' | 'SELECT'>('MANUAL');
  const [selectedOfferingToAssign, setSelectedOfferingToAssign] = useState<string>('');
  const [offeringSearchQuery, setOfferingSearchQuery] = useState<string>('');
  const [manualCourseCode, setManualCourseCode] = useState('');
  const [manualCourseTitle, setManualCourseTitle] = useState('');
  const [manualCreditUnits, setManualCreditUnits] = useState<number>(2);
  const [manualLevel, setManualLevel] = useState<100 | 200 | 300 | 400 | 500>(100);
  const [manualFacultyId, setManualFacultyId] = useState('fac-comp');
  const [manualDeptId, setManualDeptId] = useState('dept-csc');
  const [manualCustomDeptName, setManualCustomDeptName] = useState('');
  const [useCustomAssignDept, setUseCustomAssignDept] = useState(false);

  // Add/Edit Lecturer Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('dept-csc');
  const [customLecturerDeptName, setCustomLecturerDeptName] = useState('');
  const [customLecturerFacultyId, setCustomLecturerFacultyId] = useState('fac-comp');
  const [useCustomLecturerDept, setUseCustomLecturerDept] = useState(false);
  const [staffId, setStaffId] = useState('');

  // Status
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lecList, offList, facDept] = await Promise.all([
        getLecturersAction(),
        getCourseOfferingsAction(),
        getFacultiesAndDepartmentsAction(),
      ]);
      setLecturers(lecList);
      setOfferings(offList);
      setFaculties(facDept.faculties);
      setDepartments(facDept.departments);
      if (offList.length > 0 && !selectedOfferingToAssign) {
        setSelectedOfferingToAssign(offList[0].id);
      }
    } catch (err) {
      console.error('Failed to load lecturers', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resolveDepartmentName = (deptId?: string) => {
    if (!deptId) return 'General Academic';
    const normalized = deptId === 'dept-se' ? 'dept-sen' : deptId;
    return departments.find((d) => d.id === normalized || d.id === deptId)?.name || 'General Academic';
  };

  const handleOpenAdd = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setDepartmentId(departments[0]?.id || 'dept-csc');
    setCustomLecturerDeptName('');
    setCustomLecturerFacultyId(faculties[0]?.id || 'fac-comp');
    setUseCustomLecturerDept(false);
    setStaffId(`CUST/LEC/${Math.floor(1000 + Math.random() * 9000)}`);
    setFormError(null);
    setFormSuccess(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (lec: any) => {
    setEditingLecturer(lec);
    setFirstName(lec.firstName);
    setLastName(lec.lastName);
    setEmail(lec.email);
    setDepartmentId(lec.departmentId || 'dept-csc');
    setUseCustomLecturerDept(false);
    setCustomLecturerDeptName('');
    setStaffId(lec.staffId || '');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleOpenAssignModal = (lec: any) => {
    setAssigningLecturer(lec);
    setAssignMode('MANUAL');
    setManualCourseCode('');
    setManualCourseTitle('');
    setManualCreditUnits(2);
    setManualLevel(100);
    const lecDept = departments.find((d) => d.id === lec.departmentId);
    setManualDeptId(lecDept?.id || 'dept-csc');
    setManualFacultyId(lecDept?.facultyId || lec.facultyId || 'fac-comp');
    setManualCustomDeptName('');
    setUseCustomAssignDept(false);
    setOfferingSearchQuery('');
    setFormError(null);
    setFormSuccess(null);
  };

  // Auto-detect matching existing course when typing course code manually
  const matchedExistingOffering = React.useMemo(() => {
    const clean = manualCourseCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!clean) return null;
    return (
      offerings.find(
        (o) => o.course?.code?.trim().toUpperCase().replace(/\s+/g, '') === clean
      ) || null
    );
  }, [manualCourseCode, offerings]);

  const handleManualCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setManualCourseCode(upper);
    const clean = upper.trim().replace(/\s+/g, '');
    const found = offerings.find(
      (o) => o.course?.code?.trim().toUpperCase().replace(/\s+/g, '') === clean
    );
    if (found?.course) {
      setManualCourseTitle(found.course.title);
      setManualCreditUnits(found.course.creditUnits || 2);
      setManualLevel((found.course.level || 100) as 100 | 200 | 300 | 400 | 500);
      if (found.course.departmentId) {
        setManualDeptId(found.course.departmentId);
        const dept = departments.find((d) => d.id === found.course.departmentId);
        if (dept) setManualFacultyId(dept.facultyId);
      }
    }
  };

  const handleSaveLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      let targetDeptId = departmentId;
      if (useCustomLecturerDept && customLecturerDeptName.trim()) {
        const deptRes = await ensureDepartmentAction({
          name: customLecturerDeptName.trim(),
          facultyId: customLecturerFacultyId,
        });
        if (!deptRes.success || !deptRes.department) {
          setFormError(deptRes.error || 'Failed to create custom department.');
          setIsSubmitting(false);
          return;
        }
        targetDeptId = deptRes.department.id;
      }

      if (editingLecturer) {
        const res = await updateLecturerAction(
          editingLecturer.id,
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            departmentId: targetDeptId,
            staffId: staffId.trim() || undefined,
          },
          adminUserId
        );
        if (!res.success) {
          setFormError(res.error || 'Failed to update lecturer');
        } else {
          setFormSuccess('Lecturer profile updated successfully.');
          await loadData();
          setTimeout(() => setEditingLecturer(null), 1000);
        }
      } else {
        const res = await createLecturerAction(
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            departmentId: targetDeptId,
            staffId: staffId.trim() || undefined,
          },
          adminUserId
        );
        if (!res.success) {
          setFormError(res.error || 'Failed to register lecturer');
        } else {
          setFormSuccess('Lecturer registered and added to faculty directory.');
          await loadData();
          setTimeout(() => setIsAddModalOpen(false), 1000);
        }
      }
    } catch {
      setFormError('An unexpected server error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (lec: any) => {
    const actionLabel = lec.isActive ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${actionLabel} ${lec.firstName} ${lec.lastName}?`)) return;
    try {
      const res = await toggleLecturerActiveAction(lec.id, !lec.isActive, adminUserId);
      if (res.success) {
        await loadData();
      } else {
        alert(res.error || 'Failed to update lecturer status');
      }
    } catch {
      alert('Error changing lecturer status');
    }
  };

  const handleAssignCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningLecturer) return;
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (assignMode === 'MANUAL') {
        if (!manualCourseCode.trim()) {
          setFormError('Please type a course code (e.g., CYB 201 or MEE 305).');
          setIsSubmitting(false);
          return;
        }
        const res = await assignCourseManuallyAction(
          {
            lecturerId: assigningLecturer.id,
            courseCode: manualCourseCode.trim(),
            courseTitle: manualCourseTitle.trim() || undefined,
            creditUnits: manualCreditUnits,
            departmentId: useCustomAssignDept ? undefined : manualDeptId,
            departmentName: useCustomAssignDept ? manualCustomDeptName.trim() : undefined,
            facultyId: manualFacultyId,
            level: manualLevel,
          },
          adminUserId
        );
        if (res.success && res.course) {
          setFormSuccess(
            res.createdNewCourse
              ? `Created "${res.course.code} — ${res.course.title}" and assigned to ${assigningLecturer.firstName} ${assigningLecturer.lastName}.`
              : `Assigned existing course "${res.course.code}" to ${assigningLecturer.firstName} ${assigningLecturer.lastName}.`
          );
          await loadData();
          setTimeout(() => setAssigningLecturer(null), 1200);
        } else {
          setFormError(res.error || 'Failed to assign course.');
        }
      } else {
        if (!selectedOfferingToAssign) {
          setFormError('Please select a course offering.');
          setIsSubmitting(false);
          return;
        }
        const res = await assignLecturerToCourseAction(
          selectedOfferingToAssign,
          assigningLecturer.id,
          adminUserId
        );
        if (res.success) {
          setFormSuccess('Assigned lecturer to course offering successfully.');
          await loadData();
          setTimeout(() => setAssigningLecturer(null), 1000);
        } else {
          setFormError(res.error || 'Failed to assign lecturer to course.');
        }
      }
    } catch {
      setFormError('Error linking lecturer to course.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLecturers = lecturers.filter((lec) => {
    const name = `${lec.firstName} ${lec.lastName}`.toLowerCase();
    const mail = (lec.email || '').toLowerCase();
    const staff = (lec.staffId || '').toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = name.includes(query) || mail.includes(query) || staff.includes(query);
    const matchesDept = departmentFilter === 'ALL' || lec.departmentId === departmentFilter;

    return matchesSearch && matchesDept;
  });

  const filteredOfferingsForSelect = offerings.filter((off) => {
    const q = offeringSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      off.course?.code?.toLowerCase().includes(q) ||
      off.course?.title?.toLowerCase().includes(q)
    );
  });

  const renderGroupedDepartmentOptions = () =>
    faculties.map((fac) => {
      const facDepts = departments.filter((d) => d.facultyId === fac.id);
      if (facDepts.length === 0) return null;
      return (
        <optgroup key={fac.id} label={`${fac.name} (${fac.code})`}>
          {facDepts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.code})
            </option>
          ))}
        </optgroup>
      );
    });

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
                Faculty &amp; Academic Staff ({faculties.length} Faculties • {departments.length} Departments)
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Lecturer Management &amp; Course Assignment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Maintain CUSTECH academic teaching staff across all {faculties.length} faculties and assign courses either by typing them manually or selecting from the university catalogue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add New Lecturer</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, or staff ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]/20 focus:border-[#8d4a27]"
            />
          </div>

          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]/20 focus:border-[#8d4a27]"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {renderGroupedDepartmentOptions()}
            </select>
          </div>

          <div className="flex items-center justify-end text-xs text-slate-500 font-medium">
            Total Lecturers: <span className="font-bold text-slate-800 ml-1">{lecturers.length}</span>
          </div>
        </div>
      </div>

      {/* Lecturers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading lecturer directory...
          </div>
        ) : filteredLecturers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No Lecturers Found</p>
            <p className="text-xs text-slate-400 mt-1">
              Adjust your search filter or add a new faculty member.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Lecturer Name &amp; Staff ID</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Assigned Courses</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {filteredLecturers.map((lec) => {
                  const lecOfferings = offerings.filter(
                    (o) =>
                      o.primaryLecturerId === lec.id ||
                      (o.assignedLecturerIds && o.assignedLecturerIds.includes(lec.id))
                  );
                  const assignedCodes = Array.from(
                    new Set(lecOfferings.map((o) => o.course?.code).filter(Boolean))
                  ) as string[];

                  return (
                    <tr key={lec.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#fbf5ef] text-[#8d4a27] font-bold flex items-center justify-center text-xs border border-[#ecdacb]">
                            {lec.firstName?.[0] || 'L'}
                            {lec.lastName?.[0] || ''}
                          </div>
                          <div>
                            <div>
                              {lec.firstName} {lec.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {lec.staffId || 'Staff ID Pending'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{lec.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{lec.departmentName || resolveDepartmentName(lec.departmentId)}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-xs">
                          <BookOpen className="w-3.5 h-3.5 text-[#8d4a27] shrink-0" />
                          {assignedCodes.length === 0 ? (
                            <span className="text-[11px] text-slate-400 italic">No courses assigned</span>
                          ) : (
                            assignedCodes.map((code) => (
                              <span
                                key={code}
                                className="px-1.5 py-0.5 rounded bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] font-mono text-[10px] font-bold"
                              >
                                {code}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {lec.isActive !== false ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAssignModal(lec)}
                            className="px-2.5 py-1 text-[11px] font-bold bg-[#fbf5ef] hover:bg-[#ecdacb] text-[#8d4a27] rounded border border-[#ecdacb] transition flex items-center gap-1"
                            title="Assign Course (Type Manually or Select)"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Assign Course</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(lec)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 hover:text-slate-900 transition"
                            title="Edit Lecturer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(lec)}
                            className={`p-1.5 rounded transition ${
                              lec.isActive !== false
                                ? 'hover:bg-amber-50 text-amber-600'
                                : 'hover:bg-emerald-50 text-emerald-600'
                            }`}
                            title={lec.isActive !== false ? 'Deactivate Lecturer' : 'Activate Lecturer'}
                          >
                            {lec.isActive !== false ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add or Edit Lecturer Modal */}
      {(isAddModalOpen || editingLecturer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {editingLecturer ? 'Edit Lecturer Profile' : 'Register New University Lecturer'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingLecturer
                    ? `Updating record for ${editingLecturer.firstName} ${editingLecturer.lastName}`
                    : 'Institutional credentials and academic department allocation.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingLecturer(null);
                }}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLecturer} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Samuel"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Adeyemi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. s.adeyemi@custech.edu.ng"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Staff ID</label>
                  <input
                    type="text"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    placeholder="e.g. CUST/LEC/1042"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Department *</label>
                    <button
                      type="button"
                      onClick={() => setUseCustomLecturerDept(!useCustomLecturerDept)}
                      className="text-[10px] font-bold text-[#8d4a27] hover:underline"
                    >
                      {useCustomLecturerDept ? 'Select from list' : '+ Type new dept'}
                    </button>
                  </div>
                  {useCustomLecturerDept ? (
                    <div className="space-y-1.5">
                      <select
                        value={customLecturerFacultyId}
                        onChange={(e) => setCustomLecturerFacultyId(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800"
                      >
                        {faculties.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        required
                        value={customLecturerDeptName}
                        onChange={(e) => setCustomLecturerDeptName(e.target.value)}
                        placeholder="Type department name..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                      />
                    </div>
                  ) : (
                    <select
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                    >
                      {renderGroupedDepartmentOptions()}
                    </select>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingLecturer(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving...' : editingLecturer ? 'Save Changes' : 'Register Lecturer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Course to Lecturer Modal (Manual Typing + Catalogue Selection) */}
      {assigningLecturer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Assign Course to Lecturer</h3>
                <p className="text-xs text-slate-500">
                  Assigning to <strong className="text-slate-800">{assigningLecturer.firstName} {assigningLecturer.lastName}</strong>
                </p>
              </div>
              <button
                onClick={() => setAssigningLecturer(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAssignMode('MANUAL');
                    setFormError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                    assignMode === 'MANUAL'
                      ? 'bg-white text-[#8d4a27] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Type Course Manually</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAssignMode('SELECT');
                    setFormError(null);
                  }}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
                    assignMode === 'SELECT'
                      ? 'bg-white text-[#8d4a27] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Select Existing ({offerings.length})</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleAssignCourseSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {assignMode === 'MANUAL' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Course Code *
                      </label>
                      <input
                        type="text"
                        required
                        list="custech-existing-courses-datalist"
                        value={manualCourseCode}
                        onChange={(e) => handleManualCodeChange(e.target.value)}
                        placeholder="e.g. CYB 201, GST 111, MEE 301"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                      />
                      <datalist id="custech-existing-courses-datalist">
                        {offerings.map((off) =>
                          off.course ? (
                            <option key={off.id} value={off.course.code}>
                              {off.course.code} — {off.course.title}
                            </option>
                          ) : null
                        )}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Units</label>
                        <select
                          value={manualCreditUnits}
                          onChange={(e) => setManualCreditUnits(Number(e.target.value))}
                          disabled={!!matchedExistingOffering}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 disabled:opacity-60"
                        >
                          <option value={1}>1 Unit</option>
                          <option value={2}>2 Units</option>
                          <option value={3}>3 Units</option>
                          <option value={4}>4 Units</option>
                          <option value={5}>5 Units</option>
                          <option value={6}>6 Units</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Level</label>
                        <select
                          value={manualLevel}
                          onChange={(e) => setManualLevel(Number(e.target.value) as any)}
                          disabled={!!matchedExistingOffering}
                          className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-900 disabled:opacity-60"
                        >
                          <option value={100}>100L</option>
                          <option value={200}>200L</option>
                          <option value={300}>300L</option>
                          <option value={400}>400L</option>
                          <option value={500}>500L</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {matchedExistingOffering ? (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        Matches existing course: <strong>{matchedExistingOffering.course?.code} — {matchedExistingOffering.course?.title}</strong>. Clicking confirm will assign it directly.
                      </span>
                    </div>
                  ) : manualCourseCode.trim() ? (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                      New course code detected — enter the title &amp; department below to create it in the catalogue and assign it automatically.
                    </div>
                  ) : null}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Course Title {!matchedExistingOffering && '*'}
                    </label>
                    <input
                      type="text"
                      required={!matchedExistingOffering}
                      disabled={!!matchedExistingOffering}
                      value={manualCourseTitle}
                      onChange={(e) => setManualCourseTitle(e.target.value)}
                      placeholder="e.g. Applied Cryptography and Network Security"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27] disabled:opacity-60"
                    />
                  </div>

                  {!matchedExistingOffering && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Department ({departments.length} available)
                        </label>
                        <button
                          type="button"
                          onClick={() => setUseCustomAssignDept(!useCustomAssignDept)}
                          className="text-[10px] font-bold text-[#8d4a27] hover:underline"
                        >
                          {useCustomAssignDept ? 'Select CUSTECH Dept' : '+ Type New Department'}
                        </button>
                      </div>

                      {useCustomAssignDept ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <select
                            value={manualFacultyId}
                            onChange={(e) => setManualFacultyId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                          >
                            {faculties.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            required
                            value={manualCustomDeptName}
                            onChange={(e) => setManualCustomDeptName(e.target.value)}
                            placeholder="Type department name..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900"
                          />
                        </div>
                      ) : (
                        <select
                          value={manualDeptId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setManualDeptId(id);
                            const dept = departments.find((d) => d.id === id);
                            if (dept) setManualFacultyId(dept.facultyId);
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                        >
                          {renderGroupedDepartmentOptions()}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Search Catalogue
                    </label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={offeringSearchQuery}
                        onChange={(e) => setOfferingSearchQuery(e.target.value)}
                        placeholder="Filter by course code or title..."
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Select Course Offering *
                    </label>
                    <select
                      value={selectedOfferingToAssign}
                      onChange={(e) => setSelectedOfferingToAssign(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                    >
                      {filteredOfferingsForSelect.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.course?.code} — {off.course?.title} ({off.course?.level || 200}L)
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Assigning sets this lecturer as the primary lecturer with full attendance controls for this course offering.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningLecturer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-60"
                >
                  {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
