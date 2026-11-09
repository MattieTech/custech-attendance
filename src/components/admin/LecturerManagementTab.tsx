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
  Shield,
  Layers,
} from 'lucide-react';
import {
  getLecturersAction,
  createLecturerAction,
  updateLecturerAction,
  toggleLecturerActiveAction,
  assignLecturerToCourseAction,
  getCourseOfferingsAction,
} from '@/actions/academic';

interface LecturerManagementTabProps {
  adminUserId: string;
}

export const LecturerManagementTab: React.FC<LecturerManagementTabProps> = ({ adminUserId }) => {
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [offerings, setOfferings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<any | null>(null);
  const [assigningOffering, setAssigningOffering] = useState<any | null>(null);
  const [selectedOfferingToAssign, setSelectedOfferingToAssign] = useState<string>('');

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [departmentId, setDepartmentId] = useState('dept-csc');
  const [staffId, setStaffId] = useState('');

  // Status
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [lecList, offList] = await Promise.all([
        getLecturersAction(),
        getCourseOfferingsAction(),
      ]);
      setLecturers(lecList);
      setOfferings(offList);
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

  const handleOpenAdd = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setDepartmentId('dept-csc');
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
    setStaffId(lec.staffId || '');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSaveLecturer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      if (editingLecturer) {
        const res = await updateLecturerAction(
          editingLecturer.id,
          {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            departmentId,
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
            departmentId,
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
    if (!assigningOffering || !selectedOfferingToAssign) return;
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await assignLecturerToCourseAction(
        selectedOfferingToAssign,
        assigningOffering.id,
        adminUserId
      );
      if (res.success) {
        setFormSuccess('Assigned lecturer to course offering successfully.');
        await loadData();
        setTimeout(() => setAssigningOffering(null), 1000);
      } else {
        setFormError(res.error || 'Failed to assign lecturer to course.');
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

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
                Faculty &amp; Academic Staff
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Lecturer Directory</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Lecturer Management &amp; Course Assignment
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Maintain the roster of CUSTECH academic teaching staff, manage institutional credentials, and assign professors to official course catalogues.
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
              <option value="ALL">All Departments</option>
              <option value="dept-csc">Computer Science</option>
              <option value="dept-se">Software Engineering</option>
              <option value="dept-cve">Civil Engineering</option>
              <option value="dept-mee">Mechanical Engineering</option>
              <option value="dept-bch">Biochemistry</option>
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
                  const assignedCount = offerings.filter(
                    (o) =>
                      o.primaryLecturerId === lec.id ||
                      (o.assignedLecturerIds && o.assignedLecturerIds.includes(lec.id))
                  ).length;

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
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {lec.departmentId === 'dept-csc'
                              ? 'Computer Science'
                              : lec.departmentId === 'dept-se'
                              ? 'Software Engineering'
                              : lec.departmentId === 'dept-cve'
                              ? 'Civil Engineering'
                              : lec.departmentId === 'dept-mee'
                              ? 'Mechanical Engineering'
                              : 'Faculty Member'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-[#8d4a27]" />
                          <span className="font-bold text-slate-900">{assignedCount}</span>
                          <span className="text-[11px] text-slate-500">course(s)</span>
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
                            onClick={() => {
                              setAssigningOffering(lec);
                              setFormError(null);
                              setFormSuccess(null);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold bg-[#fbf5ef] hover:bg-[#ecdacb] text-[#8d4a27] rounded border border-[#ecdacb] transition flex items-center gap-1"
                            title="Assign to Course"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Assign</span>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  >
                    <option value="dept-csc">Computer Science</option>
                    <option value="dept-se">Software Engineering</option>
                    <option value="dept-cve">Civil Engineering</option>
                    <option value="dept-mee">Mechanical Engineering</option>
                    <option value="dept-bch">Biochemistry</option>
                  </select>
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

      {/* Assign to Course Modal */}
      {assigningOffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">Assign Course to Lecturer</h3>
                <p className="text-xs text-slate-500">
                  Assigning {assigningOffering.firstName} {assigningOffering.lastName}
                </p>
              </div>
              <button
                onClick={() => setAssigningOffering(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
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
                  {offerings.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.course?.code} — {off.course?.title} ({off.academicLevel || 200}L)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Assigning sets this lecturer as the primary lecturer with full attendance controls for this course offering.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningOffering(null)}
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
