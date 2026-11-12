'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import {
  registerCoursesForDepartmentAction,
  getDatabaseSnapshotAction,
} from '@/actions/academic';
import {
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Search,
  Users,
  Layers,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';

interface DepartmentCourseRegistrationTabProps {
  facultyId?: string;
  onUpdated?: () => void;
}

export const DepartmentCourseRegistrationTab: React.FC<
  DepartmentCourseRegistrationTabProps
> = ({ facultyId, onUpdated }) => {
  const faculties = custechDb.getFaculties();
  const allDepartments = custechDb.getDepartments();
  const scopedDepartments = facultyId
    ? allDepartments.filter((d) => d.facultyId === facultyId)
    : allDepartments;

  const [selectedDeptId, setSelectedDeptId] = React.useState<string>(
    scopedDepartments[0]?.id || 'dept-csc'
  );
  const [selectedLevel, setSelectedLevel] = React.useState<
    100 | 200 | 300 | 400 | 500 | 'ALL'
  >(200);
  const [mode, setMode] = React.useState<'ADD' | 'SYNC_EXACT'>('SYNC_EXACT');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [courseDeptScope, setCourseDeptScope] = React.useState<
    'ALL' | 'SELECTED_DEPT' | 'SHARED_OTHER'
  >('ALL');
  const [courseLevelFilter, setCourseLevelFilter] = React.useState<string>('ALL');
  const [refreshTick, setRefreshTick] = React.useState(0);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showStudentsPreview, setShowStudentsPreview] = React.useState(false);

  const effectiveDeptId = scopedDepartments.some((d) => d.id === selectedDeptId)
    ? selectedDeptId
    : scopedDepartments[0]?.id || selectedDeptId;

  const selectedDept = allDepartments.find((d) => d.id === effectiveDeptId);

  const allCourses = React.useMemo(() => {
    void refreshTick;
    return custechDb.getCoursesWithDetails().filter((c) => c.isActive !== false);
  }, [refreshTick]);

  const cohortSummary = React.useMemo(() => {
    void refreshTick;
    return custechDb.getDepartmentCourseRegistrationSummary(effectiveDeptId, selectedLevel);
  }, [effectiveDeptId, selectedLevel, refreshTick]);

  // Pre-seed selection when switching department or level
  const buildDefaultSelection = React.useCallback(
    (deptId: string, level: 100 | 200 | 300 | 400 | 500 | 'ALL') => {
      const summary = custechDb.getDepartmentCourseRegistrationSummary(deptId, level);
      if (summary.curatedCourseIds.length > 0) {
        return summary.curatedCourseIds;
      }
      if (summary.fullyRegisteredCourseIds.length > 0) {
        return summary.fullyRegisteredCourseIds;
      }
      return custechDb
        .getCoursesWithDetails()
        .filter(
          (c) =>
            c.isActive !== false &&
            c.departmentId === deptId &&
            (level === 'ALL' || c.level === level)
        )
        .map((c) => c.id);
    },
    []
  );

  const [selectedCourseIds, setSelectedCourseIds] = React.useState<string[]>(() =>
    buildDefaultSelection(effectiveDeptId, selectedLevel)
  );

  const handleChangeDept = (newDeptId: string) => {
    setSelectedDeptId(newDeptId);
    setSelectedCourseIds(buildDefaultSelection(newDeptId, selectedLevel));
    setFeedback(null);
  };

  const handleChangeLevel = (newLevel: 100 | 200 | 300 | 400 | 500 | 'ALL') => {
    setSelectedLevel(newLevel);
    setSelectedCourseIds(buildDefaultSelection(effectiveDeptId, newLevel));
    setFeedback(null);
  };

  const filteredCourses = allCourses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.departmentName.toLowerCase().includes(q);
    const matchesScope =
      courseDeptScope === 'ALL' ||
      (courseDeptScope === 'SELECTED_DEPT' && c.departmentId === effectiveDeptId) ||
      (courseDeptScope === 'SHARED_OTHER' && c.departmentId !== effectiveDeptId);
    const matchesLevel =
      courseLevelFilter === 'ALL' || String(c.level) === courseLevelFilter;
    return matchesSearch && matchesScope && matchesLevel;
  });

  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSelectDeptCore = () => {
    const coreIds = allCourses
      .filter(
        (c) =>
          c.departmentId === effectiveDeptId &&
          (selectedLevel === 'ALL' || c.level === selectedLevel)
      )
      .map((c) => c.id);
    setSelectedCourseIds((prev) => Array.from(new Set([...prev, ...coreIds])));
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredCourses.map((c) => c.id);
    setSelectedCourseIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const handleApplyRegistration = async () => {
    if (!effectiveDeptId) return;
    if (selectedCourseIds.length === 0 && mode === 'ADD') {
      setFeedback({
        type: 'error',
        message: 'Select at least one course to register for this department.',
      });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await registerCoursesForDepartmentAction({
        departmentId: effectiveDeptId,
        level: selectedLevel,
        courseIds: selectedCourseIds,
        mode,
      });

      if (!res.success || !res.result) {
        setFeedback({
          type: 'error',
          message: res.error || 'Failed to register courses for department.',
        });
        return;
      }

      const snap = await getDatabaseSnapshotAction();
      custechDb.syncClientSnapshot(snap);
      setRefreshTick((t) => t + 1);
      onUpdated?.();

      const { studentsAffected, coursesCount, newlyEnrolled, deactivated } = res.result;
      setFeedback({
        type: 'success',
        message:
          studentsAffected === 0
            ? `Saved ${coursesCount} curriculum course(s) for ${selectedDept?.name || 'Department'} (${selectedLevel === 'ALL' ? 'All Levels' : `${selectedLevel}L`}). Future students in this cohort will automatically inherit these courses.`
            : `Updated ${coursesCount} course(s) across ${studentsAffected} student(s) in ${selectedDept?.name || 'Department'} (${selectedLevel === 'ALL' ? 'All Levels' : `${selectedLevel}L`}) — ${newlyEnrolled} enrollment(s) added${deactivated > 0 ? `, ${deactivated} removed` : ''}.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unexpected error while saving department course registrations.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#8d4a27]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Department Cohort Curriculum &amp; Registration
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Register Courses for Students by Department
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a department and level, choose all courses those students should offer (including shared MTH/PHY/GST courses), and apply to every student in that department at once.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void handleApplyRegistration()}
          disabled={isSaving}
          className="px-5 py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 shrink-0"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>
            {isSaving
              ? 'Applying Registration...'
              : `Register ${selectedCourseIds.length} Course(s) for ${selectedDept?.code || 'Dept'} Students`}
          </span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-bold flex items-start gap-2.5 animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Department & Level Cohort Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8d4a27]" />
              <span>1. Target Department &amp; Level</span>
            </h3>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Department
              </label>
              <select
                value={effectiveDeptId}
                onChange={(e) => handleChangeDept(e.target.value)}
                className="w-full px-3 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none"
              >
                {faculties.map((fac) => {
                  const deptsInFac = scopedDepartments.filter(
                    (d) => d.facultyId === fac.id
                  );
                  if (deptsInFac.length === 0) return null;
                  return (
                    <optgroup key={fac.id} label={fac.name}>
                      {deptsInFac.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Academic Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ALL', 100, 200, 300, 400, 500] as const).map((lvl) => (
                  <button
                    key={String(lvl)}
                    type="button"
                    onClick={() => handleChangeLevel(lvl)}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition ${
                      selectedLevel === lvl
                        ? 'bg-[#8d4a27] text-white border-[#8d4a27]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lvl === 'ALL' ? 'All Levels' : `${lvl}L`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
                Registration Mode
              </label>
              <div className="space-y-2 text-xs">
                <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="regMode"
                    checked={mode === 'SYNC_EXACT'}
                    onChange={() => setMode('SYNC_EXACT')}
                    className="mt-0.5 accent-[#8d4a27]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Uniform Dept Curriculum (Recommended)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Every student in this department/level will offer the exact checked courses.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                  <input
                    type="radio"
                    name="regMode"
                    checked={mode === 'ADD'}
                    onChange={() => setMode('ADD')}
                    className="mt-0.5 accent-[#8d4a27]"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Add / Append Courses Only
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Adds checked courses without removing any extra courses students already have.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Cohort Students Summary */}
            <div className="p-3.5 rounded-xl bg-[#fbf5ef] border border-[#ecdacb] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#8d4a27]">
                  Target Students in Cohort
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white border border-[#ecdacb] text-xs font-black text-[#8d4a27]">
                  {cohortSummary.studentsCount}
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                Active students in <strong>{selectedDept?.name}</strong> (
                {selectedLevel === 'ALL' ? 'All Levels' : `${selectedLevel} Level`}).
              </p>

              {cohortSummary.studentsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowStudentsPreview((v) => !v)}
                  className="text-[11px] font-bold text-[#8d4a27] hover:underline"
                >
                  {showStudentsPreview ? 'Hide student list' : 'View students in cohort'}
                </button>
              )}

              {showStudentsPreview && cohortSummary.students.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 pt-1 border-t border-[#ecdacb]/70">
                  {cohortSummary.students.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1 rounded-lg border border-[#ecdacb]/60"
                    >
                      <span className="font-semibold text-slate-800 truncate">
                        {st.fullName}
                      </span>
                      <span className="font-mono text-[#8d4a27] shrink-0 ml-2">
                        {st.matricNumber} ({st.currentLevel}L)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Selectable Course List */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#8d4a27]" />
              <span>
                2. Select Courses Offered ({selectedCourseIds.length} selected)
              </span>
            </h3>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectDeptCore}
                className="px-2.5 py-1 rounded-lg bg-[#fbf5ef] border border-[#ecdacb] text-[#8d4a27] text-[11px] font-bold hover:bg-[#f4e7da] transition"
              >
                + Dept Core
              </button>
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold hover:bg-slate-200 transition"
              >
                Select Visible
              </button>
              <button
                type="button"
                onClick={() => setSelectedCourseIds([])}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search course code, title, or department (e.g. CSC 201, MTH 201)..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none"
              />
            </div>

            <select
              value={courseDeptScope}
              onChange={(e) =>
                setCourseDeptScope(
                  e.target.value as 'ALL' | 'SELECTED_DEPT' | 'SHARED_OTHER'
                )
              }
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none"
            >
              <option value="ALL">All University Courses</option>
              <option value="SELECTED_DEPT">{selectedDept?.code || 'Dept'} Courses Only</option>
              <option value="SHARED_OTHER">Shared / Other Depts Only</option>
            </select>

            <select
              value={courseLevelFilter}
              onChange={(e) => setCourseLevelFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-none"
            >
              <option value="ALL">All Course Levels</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
              <option value="500">500 Level</option>
            </select>
          </div>

          {/* Course Selection Grid */}
          <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {filteredCourses.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No courses match your current search or filter.
              </div>
            ) : (
              filteredCourses.map((course) => {
                const isChecked = selectedCourseIds.includes(course.id);
                const enrolledCount =
                  cohortSummary.courseEnrollmentCounts[course.id] || 0;
                const totalStudents = cohortSummary.studentsCount;
                const isFullCohort =
                  totalStudents > 0 && enrolledCount === totalStudents;

                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    className={`w-full text-left p-3 sm:p-3.5 flex items-start sm:items-center justify-between gap-3 transition ${
                      isChecked
                        ? 'bg-[#fbf5ef]/70 hover:bg-[#fbf5ef]'
                        : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 text-[#8d4a27] shrink-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-extrabold text-xs text-[#8d4a27]">
                            {course.code}
                          </span>
                          <span className="text-xs font-bold text-slate-900 break-words">
                            {course.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                            {course.creditUnits}U • {course.level}L •{' '}
                            {course.semesterType === 'SECOND' ? '2nd Sem' : '1st Sem'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {course.departmentName} • Lecturer:{' '}
                          {course.assignedLecturers.join(', ') || 'Unassigned'}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {totalStudents > 0 ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isFullCohort
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : enrolledCount > 0
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          {enrolledCount}/{totalStudents} enrolled
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          0 students in cohort
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
