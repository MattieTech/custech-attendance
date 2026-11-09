'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { Course, Department, UserProfile } from '@/types';
import {
  createCourseAction,
  updateCourseAction,
  toggleCourseAction,
  deleteCourseAction,
  bulkImportCoursesAction,
  getCoursesDetailedAction,
} from '@/actions/academic';
import {
  Plus,
  Search,
  BookOpen,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Upload,
  AlertCircle,
  X,
  Filter,
  Users,
  Building,
  GraduationCap,
  Sparkles,
  Download,
} from 'lucide-react';

interface CourseManagementTabProps {
  actorId?: string;
  adminUserId?: string;
}

export const CourseManagementTab: React.FC<CourseManagementTabProps> = ({ actorId, adminUserId }) => {
  const effectiveActorId = actorId || adminUserId || 'admin';
  const [courses, setCourses] = React.useState(custechDb.getCoursesWithDetails());
  const departments = custechDb.getDepartments();
  const lecturers = custechDb.getLecturers();

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedDept, setSelectedDept] = React.useState('ALL');
  const [selectedLevel, setSelectedLevel] = React.useState('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [editCourse, setEditCourse] = React.useState<any | null>(null);

  // Add Form State
  const [addCode, setAddCode] = React.useState('');
  const [addTitle, setAddTitle] = React.useState('');
  const [addUnits, setAddUnits] = React.useState<number>(2);
  const [addDeptId, setAddDeptId] = React.useState(departments[0]?.id || 'dept-csc');
  const [addLevel, setAddLevel] = React.useState<100 | 200 | 300 | 400 | 500>(100);
  const [addLecturerId, setAddLecturerId] = React.useState(lecturers[0]?.id || 'user-lec-csc1');
  const [addDescription, setAddDescription] = React.useState('');
  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit Form State
  const [editCode, setEditCode] = React.useState('');
  const [editTitle, setEditTitle] = React.useState('');
  const [editUnits, setEditUnits] = React.useState<number>(2);
  const [editDeptId, setEditDeptId] = React.useState('');
  const [editLevel, setEditLevel] = React.useState<100 | 200 | 300 | 400 | 500>(100);
  const [editLecturerId, setEditLecturerId] = React.useState('');
  const [editIsActive, setEditIsActive] = React.useState(true);

  // Bulk Upload State
  const [csvContent, setCsvContent] = React.useState('');
  const [bulkParsed, setBulkParsed] = React.useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = React.useState<string[]>([]);
  const [bulkResult, setBulkResult] = React.useState<any | null>(null);

  const refreshCourses = () => {
    setCourses(custechDb.getCoursesWithDetails());
  };

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.departmentName?.toLowerCase().includes(q);

    const matchesDept = selectedDept === 'ALL' || c.departmentId === selectedDept;
    const matchesLevel = selectedLevel === 'ALL' || c.level.toString() === selectedLevel;
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'ACTIVE' && c.isActive !== false) ||
      (selectedStatus === 'INACTIVE' && c.isActive === false);

    return matchesSearch && matchesDept && matchesLevel && matchesStatus;
  });

  // Handle Add Course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await createCourseAction(
        {
          code: addCode.trim().toUpperCase(),
          title: addTitle.trim(),
          creditUnits: Number(addUnits),
          departmentId: addDeptId,
          level: addLevel,
          description: addDescription.trim(),
        },
        effectiveActorId
      );

      if (res.success && res.course) {
        if (addLecturerId) {
          const off = custechDb.getCourseOfferings().find((o) => o.courseId === res.course!.id);
          if (off) {
            custechDb.assignLecturerToCourseOffering(off.id, addLecturerId, effectiveActorId);
          }
        }
        refreshCourses();
        setIsAddModalOpen(false);
        setAddCode('');
        setAddTitle('');
        setAddDescription('');
        setFormSuccess(`Course ${res.course.code} successfully registered in catalogue.`);
        setTimeout(() => setFormSuccess(null), 3500);
      } else {
        setFormError(res.error || 'Failed to create course');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error creating course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Course
  const handleOpenEdit = (course: any) => {
    setEditCourse(course);
    setEditCode(course.code);
    setEditTitle(course.title);
    setEditUnits(course.creditUnits || 2);
    setEditDeptId(course.departmentId);
    setEditLevel(course.level || 100);
    setEditLecturerId(course.primaryOffering?.primaryLecturerId || '');
    setEditIsActive(course.isActive !== false);
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCourse) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await updateCourseAction(
        editCourse.id,
        {
          code: editCode.trim().toUpperCase(),
          title: editTitle.trim(),
          creditUnits: Number(editUnits),
          departmentId: editDeptId,
          level: editLevel,
          isActive: editIsActive,
          primaryLecturerId: editLecturerId,
        },
        effectiveActorId
      );

      if (res.success) {
        refreshCourses();
        setEditCourse(null);
        setFormSuccess(`Course ${editCode} updated successfully.`);
        setTimeout(() => setFormSuccess(null), 3500);
      } else {
        setFormError(res.error || 'Failed to update course');
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Error updating course');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Active
  const handleToggleActive = async (courseId: string, currentActive: boolean) => {
    try {
      await toggleCourseAction(courseId, !currentActive, effectiveActorId);
      refreshCourses();
      setFormSuccess(`Course status updated.`);
      setTimeout(() => setFormSuccess(null), 3000);
    } catch {
      alert('Error updating course status');
    }
  };

  // Handle Delete Course
  const handleDeleteCourse = async (courseId: string, courseCode: string) => {
    if (!confirm(`Are you sure you want to delete course ${courseCode}? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await deleteCourseAction(courseId, effectiveActorId);
      if (res.success) {
        refreshCourses();
        setFormSuccess(`Course ${courseCode} deleted.`);
        setTimeout(() => setFormSuccess(null), 3000);
      } else {
        alert(res.error || 'Could not delete course');
      }
    } catch {
      alert('Error deleting course');
    }
  };

  // Parse CSV Preview
  const handleParseCsv = (raw: string) => {
    setCsvContent(raw);
    setBulkErrors([]);
    setBulkResult(null);

    if (!raw.trim()) {
      setBulkParsed([]);
      return;
    }

    const lines = raw.trim().split('\n');
    const records: any[] = [];
    const errors: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || (index === 0 && trimmed.toLowerCase().includes('course code'))) return;

      const cols = trimmed.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length < 2) {
        errors.push(`Row ${index + 1}: Missing minimum required columns (Code, Title).`);
        return;
      }

      const code = cols[0]?.toUpperCase();
      const title = cols[1];
      const creditUnits = Number(cols[2]) || 2;
      const dept = cols[3] || 'Computer Science';
      const level = (Number(cols[4]) || 100) as 100 | 200 | 300 | 400 | 500;
      const lecturer = cols[5] || '';

      records.push({ code, title, creditUnits, departmentName: dept, level, lecturerEmailOrName: lecturer });
    });

    setBulkParsed(records);
    setBulkErrors(errors);
  };

  // Execute Bulk Import
  const handleConfirmBulkImport = async () => {
    if (bulkParsed.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await bulkImportCoursesAction(bulkParsed, effectiveActorId);
      if (res.success && res.summary) {
        setBulkResult(res.summary);
        refreshCourses();
      } else {
        alert(res.error || 'Import failed');
      }
    } catch {
      alert('Error executing bulk import');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Academic Catalogue
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">ICT Administration</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Course Management & Curriculum Catalogue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure official courses, credit units, departments, levels, and assigned lecturers across CUSTECH.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Import Courses (CSV)</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, title, or department..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] focus:ring-2 focus:ring-[#8d4a27]/20 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-[#8d4a27]"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-[#8d4a27]"
          >
            <option value="ALL">All Levels</option>
            <option value="100">100L</option>
            <option value="200">200L</option>
            <option value="300">300L</option>
            <option value="400">400L</option>
            <option value="500">500L</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-[#8d4a27]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Courses</option>
            <option value="INACTIVE">Inactive Courses</option>
          </select>
        </div>
      </div>

      {/* Courses Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 text-center">Units</th>
                <th className="py-3 px-4">Department & Level</th>
                <th className="py-3 px-4">Assigned Lecturer(s)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span>No courses found matching your filter criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => {
                  const isActive = c.isActive !== false;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900 text-sm">
                        {c.code}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 max-w-xs truncate">
                        {c.title}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded font-extrabold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                          {c.creditUnits} CU
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                          {c.departmentName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">
                          {c.level} Level
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                          {c.assignedLecturers.length > 0
                            ? c.assignedLecturers.join(', ')
                            : 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(c.id, isActive)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Course Details"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c.id, c.code)}
                            title="Delete Course"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 transition"
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

      {/* CREATE COURSE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Course Catalogue
                </span>
                <h3 className="text-lg font-black text-slate-900">Add New Official Course</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    placeholder="e.g. MTH 131"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Credit Units</label>
                  <select
                    value={addUnits}
                    onChange={(e) => setAddUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value={1}>1 Unit</option>
                    <option value={2}>2 Units</option>
                    <option value={3}>3 Units</option>
                    <option value={4}>4 Units</option>
                    <option value={6}>6 Units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  placeholder="e.g. General Mathematics I"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={addDeptId}
                    onChange={(e) => setAddDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Level</label>
                  <select
                    value={addLevel}
                    onChange={(e) => setAddLevel(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Assign Primary Lecturer</label>
                <select
                  value={addLecturerId}
                  onChange={(e) => setAddLecturerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                >
                  {lecturers.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      Dr. {lec.firstName} {lec.lastName} ({lec.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Course Description (Optional)</label>
                <textarea
                  rows={2}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Outline syllabus overview or course objectives..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold rounded-xl shadow-xs transition"
                >
                  {isSubmitting ? 'Saving...' : 'Register Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Update Catalogue
                </span>
                <h3 className="text-lg font-black text-slate-900">Edit {editCourse.code}</h3>
              </div>
              <button
                onClick={() => setEditCourse(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCourse} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Credit Units</label>
                  <select
                    value={editUnits}
                    onChange={(e) => setEditUnits(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value={1}>1 Unit</option>
                    <option value={2}>2 Units</option>
                    <option value={3}>3 Units</option>
                    <option value={4}>4 Units</option>
                    <option value={6}>6 Units</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Course Title</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Level</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value) as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Primary Assigned Lecturer</label>
                <select
                  value={editLecturerId}
                  onChange={(e) => setEditLecturerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                >
                  <option value="">-- Leave Unchanged --</option>
                  {lecturers.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      Dr. {lec.firstName} {lec.lastName} ({lec.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#8d4a27] rounded focus:ring-[#8d4a27]"
                />
                <label htmlFor="editIsActive" className="font-semibold text-slate-700">
                  Course is Active for Semester Attendance
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditCourse(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl transition font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold rounded-xl shadow-xs transition"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV UPLOAD MODAL (PHASE 2.4) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Bulk Registration
                </span>
                <h3 className="text-lg font-black text-slate-900">Import Courses via CSV</h3>
              </div>
              <button
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkResult(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pr-1 text-xs">
              {!bulkResult ? (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Paste CSV Content or Upload
                    </label>
                    <p className="text-[11px] text-slate-500 mb-2">
                      Format: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Course Code, Course Title, Credit Units, Department, Level, Lecturer</code>
                    </p>
                    <textarea
                      rows={6}
                      value={csvContent}
                      onChange={(e) => handleParseCsv(e.target.value)}
                      placeholder={`MTH 131, General Mathematics I, 2, Software Engineering, 100, Dr. Halima Dikko\nCSC 201, Data Structures and Algorithms, 3, Computer Science, 200, Dr. Matthew Bello\nPHY 101, General Physics, 3, Physics, 100, Dr. Bilikisu Sani`}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-[11px] focus:bg-white focus:border-[#8d4a27] outline-none"
                    />
                  </div>

                  {bulkErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                      <span className="font-bold block">Validation Warnings:</span>
                      {bulkErrors.map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}

                  {bulkParsed.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-slate-700 uppercase">
                          Data Preview ({bulkParsed.length} records ready for import)
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                            <tr>
                              <th className="p-2">Code</th>
                              <th className="p-2">Title</th>
                              <th className="p-2">Units</th>
                              <th className="p-2">Department</th>
                              <th className="p-2">Level</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkParsed.map((rec, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 font-mono font-bold text-slate-900">{rec.code}</td>
                                <td className="p-2 truncate max-w-[150px]">{rec.title}</td>
                                <td className="p-2">{rec.creditUnits} CU</td>
                                <td className="p-2 truncate max-w-[120px]">{rec.departmentName}</td>
                                <td className="p-2">{rec.level}L</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Import Success Summary */
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn text-slate-800">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Import Completed Successfully</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Imported</span>
                      <span className="text-base font-extrabold text-emerald-700">{bulkResult.successful}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Skipped/Duplicate</span>
                      <span className="text-base font-extrabold text-amber-700">{bulkResult.skipped}</span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Failed</span>
                      <span className="text-base font-extrabold text-rose-700">{bulkResult.failed}</span>
                    </div>
                  </div>

                  {bulkResult.importedCodes?.length > 0 && (
                    <div className="text-[11px] text-slate-600">
                      <strong>Courses Added:</strong> {bulkResult.importedCodes.join(', ')}
                    </div>
                  )}

                  {bulkResult.errors?.length > 0 && (
                    <div className="space-y-1 text-[11px] text-rose-700 bg-white p-2.5 rounded-xl border border-rose-200">
                      <strong>Notices:</strong>
                      {bulkResult.errors.map((e: any, i: number) => (
                        <div key={i}>• {e.code}: {e.error}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsBulkModalOpen(false);
                  setBulkResult(null);
                }}
                className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Close
              </button>

              {!bulkResult && (
                <button
                  type="button"
                  onClick={handleConfirmBulkImport}
                  disabled={isSubmitting || bulkParsed.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#8d4a27] hover:bg-[#743c22] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Importing...' : `Import ${bulkParsed.length} Courses`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
