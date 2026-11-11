'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { Department, Faculty } from '@/types';
import {
  createCourseAction,
  updateCourseAction,
  toggleCourseAction,
  deleteCourseAction,
  bulkImportCoursesAction,
  getCoursesDetailedAction,
  getFacultiesAndDepartmentsAction,
  getLecturersAction,
  getAcademicTermsAction,
  syncCourseEnrollmentsAction,
  ensureDepartmentAction,
} from '@/actions/academic';
import {
  Plus,
  Search,
  BookOpen,
  Edit,
  Trash2,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  X,
  RefreshCw,
  Clock,
  Users,
} from 'lucide-react';

type DetailedCourse = Awaited<ReturnType<typeof getCoursesDetailedAction>>[number];
type LecturerItem = Awaited<ReturnType<typeof getLecturersAction>>[number];

interface BulkCsvCourseRow {
  code: string;
  title: string;
  creditUnits: number;
  departmentName: string;
  level: 100 | 200 | 300 | 400 | 500;
  semesterType: 'FIRST' | 'SECOND';
  lecturerEmailOrName: string;
}

type BulkImportSummary = NonNullable<Awaited<ReturnType<typeof bulkImportCoursesAction>>['summary']>;

interface CourseManagementTabProps {
  actorId?: string;
  adminUserId?: string;
  facultyId?: string;
  facultyName?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'No fixed schedule yet' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const CourseManagementTab: React.FC<CourseManagementTabProps> = ({
  actorId,
  adminUserId,
  facultyId,
  facultyName,
}) => {
  const effectiveActorId = actorId || adminUserId || 'admin';
  const isFacultyScoped = Boolean(facultyId);

  const [courses, setCourses] = React.useState<DetailedCourse[]>(() => {
    const all = custechDb.getCoursesWithDetails();
    return facultyId ? all.filter((c) => c.facultyId === facultyId) : all;
  });
  const [faculties, setFaculties] = React.useState<Faculty[]>(custechDb.getFaculties());
  const [departments, setDepartments] = React.useState<Department[]>(custechDb.getDepartments());
  const [lecturers, setLecturers] = React.useState<LecturerItem[]>(custechDb.getLecturers());
  const [currentSessionName, setCurrentSessionName] = React.useState('2026/2027');

  const scopedFaculties = React.useMemo(
    () => (facultyId ? faculties.filter((f) => f.id === facultyId) : faculties),
    [faculties, facultyId]
  );

  const scopedDepartments = React.useMemo(
    () => (facultyId ? departments.filter((d) => d.facultyId === facultyId) : departments),
    [departments, facultyId]
  );

  // Filters
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedFaculty, setSelectedFaculty] = React.useState(facultyId || 'ALL');
  const [selectedDept, setSelectedDept] = React.useState('ALL');
  const [selectedLevel, setSelectedLevel] = React.useState('ALL');
  const [selectedSemester, setSelectedSemester] = React.useState<'ALL' | 'FIRST' | 'SECOND'>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [editCourse, setEditCourse] = React.useState<DetailedCourse | null>(null);

  // Add Form State
  const [addCode, setAddCode] = React.useState('');
  const [addTitle, setAddTitle] = React.useState('');
  const [addUnits, setAddUnits] = React.useState<number>(2);
  const [addDeptId, setAddDeptId] = React.useState(
    scopedDepartments[0]?.id || departments[0]?.id || 'dept-csc'
  );
  const [useCustomAddDept, setUseCustomAddDept] = React.useState(false);
  const [addCustomDeptName, setAddCustomDeptName] = React.useState('');
  const [addCustomFacultyId, setAddCustomFacultyId] = React.useState(
    facultyId || faculties[0]?.id || 'fac-comp'
  );
  const [addLevel, setAddLevel] = React.useState<100 | 200 | 300 | 400 | 500>(100);
  const [addSemesterType, setAddSemesterType] = React.useState<'FIRST' | 'SECOND'>('FIRST');
  const [addLecturerId, setAddLecturerId] = React.useState('');
  const [addDescription, setAddDescription] = React.useState('');
  const [addScheduleDay, setAddScheduleDay] = React.useState<number>(0);
  const [addScheduleStart, setAddScheduleStart] = React.useState('10:00');
  const [addScheduleEnd, setAddScheduleEnd] = React.useState('12:00');
  const [addScheduleVenue, setAddScheduleVenue] = React.useState('LH 101');
  const [addAutoEnroll, setAddAutoEnroll] = React.useState(true);

  const [formError, setFormError] = React.useState<string | null>(null);
  const [formSuccess, setFormSuccess] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Edit Form State
  const [editCode, setEditCode] = React.useState('');
  const [editTitle, setEditTitle] = React.useState('');
  const [editUnits, setEditUnits] = React.useState<number>(2);
  const [editDeptId, setEditDeptId] = React.useState('');
  const [editLevel, setEditLevel] = React.useState<100 | 200 | 300 | 400 | 500>(100);
  const [editSemesterType, setEditSemesterType] = React.useState<'FIRST' | 'SECOND'>('FIRST');
  const [editLecturerId, setEditLecturerId] = React.useState('');
  const [editIsActive, setEditIsActive] = React.useState(true);
  const [editScheduleDay, setEditScheduleDay] = React.useState<number>(0);
  const [editScheduleStart, setEditScheduleStart] = React.useState('10:00');
  const [editScheduleEnd, setEditScheduleEnd] = React.useState('12:00');
  const [editScheduleVenue, setEditScheduleVenue] = React.useState('LH 101');

  // Bulk Upload State
  const [csvContent, setCsvContent] = React.useState('');
  const [bulkParsed, setBulkParsed] = React.useState<BulkCsvCourseRow[]>([]);
  const [bulkErrors, setBulkErrors] = React.useState<string[]>([]);
  const [bulkResult, setBulkResult] = React.useState<BulkImportSummary | null>(null);

  const refreshCourses = React.useCallback(async () => {
    try {
      const [latestCourses, facDept, latestLecturers, terms] = await Promise.all([
        getCoursesDetailedAction(facultyId),
        getFacultiesAndDepartmentsAction(),
        getLecturersAction(),
        getAcademicTermsAction(),
      ]);
      setCourses(latestCourses);
      setFaculties(facDept.faculties);
      setDepartments(facDept.departments);
      setLecturers(latestLecturers);
      if (terms.currentSession?.name) {
        setCurrentSessionName(terms.currentSession.name);
      }
    } catch {
      const all = custechDb.getCoursesWithDetails();
      setCourses(facultyId ? all.filter((c) => c.facultyId === facultyId) : all);
    }
  }, [facultyId]);

  React.useEffect(() => {
    let cancelled = false;
    Promise.all([
      getCoursesDetailedAction(facultyId),
      getFacultiesAndDepartmentsAction(),
      getLecturersAction(),
      getAcademicTermsAction(),
    ])
      .then(([latestCourses, facDept, latestLecturers, terms]) => {
        if (cancelled) return;
        setCourses(latestCourses);
        setFaculties(facDept.faculties);
        setDepartments(facDept.departments);
        setLecturers(latestLecturers);
        if (terms.currentSession?.name) {
          setCurrentSessionName(terms.currentSession.name);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const all = custechDb.getCoursesWithDetails();
          setCourses(facultyId ? all.filter((c) => c.facultyId === facultyId) : all);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [facultyId]);

  React.useEffect(() => {
    if (scopedDepartments.length > 0 && !scopedDepartments.some((d) => d.id === addDeptId)) {
      setAddDeptId(scopedDepartments[0].id);
    }
  }, [scopedDepartments, addDeptId]);

  // Filter courses
  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.departmentName?.toLowerCase().includes(q) ||
      c.facultyName?.toLowerCase().includes(q) ||
      c.assignedLecturers.some((l) => l.toLowerCase().includes(q));

    const matchesFaculty = selectedFaculty === 'ALL' || c.facultyId === selectedFaculty;
    const matchesDept = selectedDept === 'ALL' || c.departmentId === selectedDept;
    const matchesLevel = selectedLevel === 'ALL' || c.level.toString() === selectedLevel;
    const matchesSemester =
      selectedSemester === 'ALL' || (c.semesterType || 'FIRST') === selectedSemester;
    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'ACTIVE' && c.isActive !== false) ||
      (selectedStatus === 'INACTIVE' && c.isActive === false);

    return (
      matchesSearch &&
      matchesFaculty &&
      matchesDept &&
      matchesLevel &&
      matchesSemester &&
      matchesStatus
    );
  });

  const renderGroupedDepartmentOptions = () =>
    scopedFaculties.map((fac) => {
      const facDepts = scopedDepartments.filter((d) => d.facultyId === fac.id);
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

  // Handle Add Course
  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      let targetDeptId = addDeptId;
      if (useCustomAddDept && addCustomDeptName.trim()) {
        const deptRes = await ensureDepartmentAction({
          name: addCustomDeptName.trim(),
          facultyId: facultyId || addCustomFacultyId,
        });
        if (!deptRes.success || !deptRes.department) {
          setFormError(deptRes.error || 'Failed to create custom department.');
          setIsSubmitting(false);
          return;
        }
        targetDeptId = deptRes.department.id;
      }

      const res = await createCourseAction(
        {
          code: addCode.trim().toUpperCase(),
          title: addTitle.trim(),
          creditUnits: Number(addUnits),
          departmentId: targetDeptId,
          level: addLevel,
          semesterType: addSemesterType,
          primaryLecturerId: addLecturerId || undefined,
          description: addDescription.trim(),
          scheduleDay: addScheduleDay > 0 ? addScheduleDay : undefined,
          scheduleStartTime: addScheduleDay > 0 ? addScheduleStart : undefined,
          scheduleEndTime: addScheduleDay > 0 ? addScheduleEnd : undefined,
          scheduleVenue: addScheduleDay > 0 ? addScheduleVenue : undefined,
          autoEnrollStudents: addAutoEnroll,
        },
        effectiveActorId
      );

      if (res.success && res.course) {
        await refreshCourses();
        setIsAddModalOpen(false);
        setAddCode('');
        setAddTitle('');
        setAddDescription('');
        setAddScheduleDay(0);
        setUseCustomAddDept(false);
        setAddCustomDeptName('');
        setFormSuccess(
          `Course ${res.course.code} successfully registered and eligible students enrolled.`
        );
        setTimeout(() => setFormSuccess(null), 4000);
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
  const handleOpenEdit = (course: DetailedCourse) => {
    setFormError(null);
    setEditCourse(course);
    setEditCode(course.code);
    setEditTitle(course.title);
    setEditUnits(course.creditUnits || 2);
    setEditDeptId(course.departmentId);
    setEditLevel(course.level || 100);
    setEditSemesterType(course.semesterType || 'FIRST');
    setEditLecturerId(course.primaryOffering?.primaryLecturerId || '');
    setEditIsActive(course.isActive !== false);
    setEditScheduleDay(course.timetable?.dayOfWeek || 0);
    setEditScheduleStart(course.timetable?.startTime || '10:00');
    setEditScheduleEnd(course.timetable?.endTime || '12:00');
    setEditScheduleVenue(course.timetable?.venue || course.venueLabel || 'LH 101');
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
          semesterType: editSemesterType,
          isActive: editIsActive,
          primaryLecturerId: editLecturerId,
          scheduleDay: editScheduleDay > 0 ? editScheduleDay : undefined,
          scheduleStartTime: editScheduleDay > 0 ? editScheduleStart : undefined,
          scheduleEndTime: editScheduleDay > 0 ? editScheduleEnd : undefined,
          scheduleVenue: editScheduleDay > 0 ? editScheduleVenue : undefined,
        },
        effectiveActorId
      );

      if (res.success) {
        await refreshCourses();
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
      const res = await toggleCourseAction(courseId, !currentActive, effectiveActorId);
      if (res.success) {
        await refreshCourses();
        setFormSuccess('Course status updated.');
        setTimeout(() => setFormSuccess(null), 3000);
      } else {
        setFormError(res.error || 'Error updating course status');
      }
    } catch {
      alert('Error updating course status');
    }
  };

  // Handle Sync Eligible Students
  const handleSyncEnrollments = async (courseId: string, courseCode: string) => {
    try {
      const res = await syncCourseEnrollmentsAction(courseId);
      if (res.success) {
        await refreshCourses();
        setFormSuccess(
          res.newlyEnrolled
            ? `Synced ${res.newlyEnrolled} eligible student(s) into ${courseCode}.`
            : `All matching department & level students are already enrolled in ${courseCode}.`
        );
        setTimeout(() => setFormSuccess(null), 3500);
      } else {
        alert(res.error || 'Could not sync enrollments');
      }
    } catch {
      alert('Error syncing enrollments');
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
        await refreshCourses();
        setFormSuccess(`Course ${courseCode} deleted.`);
        setTimeout(() => setFormSuccess(null), 3000);
      } else {
        alert(res.error || 'Could not delete course');
      }
    } catch {
      alert('Error deleting course');
    }
  };

  // Download CSV Template
  const handleDownloadCourseCsvTemplate = () => {
    const defaultDept = scopedDepartments[0]?.name || 'Computer Science';
    const header =
      'Course Code,Course Title,Credit Units,Department,Level,Semester,Lecturer Email or Name\n';
    const sample = [
      `CSC 205,Operating Systems I,3,${defaultDept},200,FIRST,doe@custech.edu.ng`,
      `CSC 207,Discrete Mathematics,2,${defaultDept},200,FIRST,hod.csc@custech.edu.ng`,
      `SEN 204,Software Architecture,3,Software Engineering,200,SECOND,zainab.idris@custech.edu.ng`,
    ].join('\n');
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'custech_course_upload_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    const records: BulkCsvCourseRow[] = [];
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
      const dept = cols[3] || scopedDepartments[0]?.name || 'Computer Science';
      const level = (Number(cols[4]) || 100) as 100 | 200 | 300 | 400 | 500;

      // Support optional Semester column (5th index) OR direct Lecturer column
      let semesterType: 'FIRST' | 'SECOND' = 'FIRST';
      let lecturer = '';
      if (cols[5] && ['FIRST', 'SECOND', '1', '2'].includes(cols[5].toUpperCase())) {
        semesterType = cols[5].toUpperCase() === 'SECOND' || cols[5] === '2' ? 'SECOND' : 'FIRST';
        lecturer = cols[6] || '';
      } else {
        lecturer = cols[5] || '';
      }

      records.push({
        code,
        title,
        creditUnits,
        departmentName: dept,
        level,
        semesterType,
        lecturerEmailOrName: lecturer,
      });
    });

    setBulkParsed(records);
    setBulkErrors(errors);
  };

  const handleCourseCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) handleParseCsv(text);
    };
    reader.readAsText(file);
  };

  // Execute Bulk Import
  const handleConfirmBulkImport = async () => {
    if (bulkParsed.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await bulkImportCoursesAction(bulkParsed, effectiveActorId);
      if (res.success && res.summary) {
        setBulkResult(res.summary);
        await refreshCourses();
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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              {isFacultyScoped ? `${facultyName || 'Faculty'} Course Catalogue` : 'Academic Catalogue'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              Session {currentSessionName}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Course Management &amp; Registration Catalogue
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Create, upload, schedule, and assign lecturers to courses. Students are automatically linked by department, level, and semester.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              setBulkResult(null);
              setIsBulkModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition flex-1 sm:flex-none"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bulk Upload (CSV)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {formSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, title, lecturer, or dept..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] focus:ring-2 focus:ring-[#8d4a27]/20 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isFacultyScoped && (
            <select
              value={selectedFaculty}
              onChange={(e) => {
                setSelectedFaculty(e.target.value);
                setSelectedDept('ALL');
              }}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-[#8d4a27] max-w-full"
            >
              <option value="ALL">All Faculties ({faculties.length})</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-[#8d4a27] max-w-[220px]"
          >
            <option value="ALL">All Departments ({scopedDepartments.length})</option>
            {renderGroupedDepartmentOptions()}
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
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value as 'ALL' | 'FIRST' | 'SECOND')}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl outline-none focus:border-[#8d4a27]"
          >
            <option value="ALL">All Semesters</option>
            <option value="FIRST">First Semester</option>
            <option value="SECOND">Second Semester</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
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
          <table className="w-full text-left text-xs border-collapse min-w-[820px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-extrabold text-[10px]">
                <th className="py-3 px-4">Course &amp; Units</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Department &amp; Faculty</th>
                <th className="py-3 px-4">Level / Sem</th>
                <th className="py-3 px-4">Assigned Lecturer</th>
                <th className="py-3 px-4">Schedule &amp; Enrolled</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <span>No courses found matching your filter criteria.</span>
                  </td>
                </tr>
              ) : (
                filteredCourses.map((c) => {
                  const isActive = c.isActive !== false;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-black text-slate-900 text-sm block">
                          {c.code}
                        </span>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded font-extrabold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] text-[10px]">
                          {c.creditUnits} CU
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800 max-w-[210px]">
                        <span className="line-clamp-2">{c.title}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                          {c.departmentName}
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[180px]">
                          {c.facultyName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] uppercase block w-fit">
                          {c.level} Level
                        </span>
                        <span className="text-[10px] font-semibold text-[#8d4a27] mt-0.5 block">
                          {c.semesterType === 'SECOND' ? '2nd Sem' : '1st Sem'} ({c.academicSessionName})
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-semibold block truncate max-w-[160px] ${
                            c.assignedLecturers.length > 0 ? 'text-slate-800' : 'text-amber-700 italic'
                          }`}
                        >
                          {c.assignedLecturers.length > 0
                            ? c.assignedLecturers.join(', ')
                            : 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                          <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[150px]">{c.scheduleLabel}</span>
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <Users className="w-3 h-3 text-[#8d4a27] shrink-0" />
                          <span>{c.enrolledCount} registered student{c.enrolledCount !== 1 ? 's' : ''}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => void handleToggleActive(c.id, isActive)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handleSyncEnrollments(c.id, c.code)}
                            title="Auto-enroll matching department & level students"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#fbf5ef] text-[#8d4a27] transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Course & Assign Lecturer"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteCourse(c.id, c.code)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Course Catalogue
                </span>
                <h3 className="text-lg font-black text-slate-900">Add New Official Course</h3>
              </div>
              <button
                type="button"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CSC 201"
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
                  placeholder="e.g. Data Structures and Algorithms"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700 uppercase">Department</label>
                    <button
                      type="button"
                      onClick={() => setUseCustomAddDept(!useCustomAddDept)}
                      className="text-[10px] font-bold text-[#8d4a27] hover:underline"
                    >
                      {useCustomAddDept ? 'Pick list' : '+ New'}
                    </button>
                  </div>
                  {useCustomAddDept ? (
                    <div className="space-y-1.5">
                      {!isFacultyScoped && (
                        <select
                          value={addCustomFacultyId}
                          onChange={(e) => setAddCustomFacultyId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-[11px]"
                        >
                          {faculties.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        required
                        value={addCustomDeptName}
                        onChange={(e) => setAddCustomDeptName(e.target.value)}
                        placeholder="Department name..."
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                      />
                    </div>
                  ) : (
                    <select
                      value={addDeptId}
                      onChange={(e) => setAddDeptId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                    >
                      {renderGroupedDepartmentOptions()}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Level</label>
                  <select
                    value={addLevel}
                    onChange={(e) => setAddLevel(Number(e.target.value) as 100 | 200 | 300 | 400 | 500)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Semester</label>
                  <select
                    value={addSemesterType}
                    onChange={(e) => setAddSemesterType(e.target.value as 'FIRST' | 'SECOND')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value="FIRST">First Semester</option>
                    <option value="SECOND">Second Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Assign Primary Lecturer
                </label>
                <select
                  value={addLecturerId}
                  onChange={(e) => setAddLecturerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                >
                  <option value="">-- Unassigned (Assign Later) --</option>
                  {lecturers.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      Dr. {lec.firstName} {lec.lastName} ({lec.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Lecture Schedule */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block font-bold text-slate-700 uppercase">
                  Weekly Lecture Schedule (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={addScheduleDay}
                    onChange={(e) => setAddScheduleDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={addScheduleVenue}
                    onChange={(e) => setAddScheduleVenue(e.target.value)}
                    disabled={addScheduleDay === 0}
                    placeholder="Venue e.g. LH 101"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none disabled:opacity-50"
                  />
                </div>
                {addScheduleDay > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Time</span>
                      <input
                        type="time"
                        value={addScheduleStart}
                        onChange={(e) => setAddScheduleStart(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">End Time</span>
                      <input
                        type="time"
                        value={addScheduleEnd}
                        onChange={(e) => setAddScheduleEnd(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Course Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="Outline syllabus overview or course objectives..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addAutoEnroll"
                  checked={addAutoEnroll}
                  onChange={(e) => setAddAutoEnroll(e.target.checked)}
                  className="w-4 h-4 accent-[#8d4a27] rounded cursor-pointer"
                />
                <label htmlFor="addAutoEnroll" className="font-semibold text-slate-700 cursor-pointer">
                  Automatically register eligible students in this department &amp; level
                </label>
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
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Update Catalogue
                </span>
                <h3 className="text-lg font-black text-slate-900">Edit {editCourse.code}</h3>
              </div>
              <button
                type="button"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Department</label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                  >
                    {renderGroupedDepartmentOptions()}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Level</label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value) as 100 | 200 | 300 | 400 | 500)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value={100}>100 Level</option>
                    <option value={200}>200 Level</option>
                    <option value={300}>300 Level</option>
                    <option value={400}>400 Level</option>
                    <option value={500}>500 Level</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Semester</label>
                  <select
                    value={editSemesterType}
                    onChange={(e) => setEditSemesterType(e.target.value as 'FIRST' | 'SECOND')}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none font-bold"
                  >
                    <option value="FIRST">First Semester</option>
                    <option value="SECOND">Second Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Primary Assigned Lecturer
                </label>
                <select
                  value={editLecturerId}
                  onChange={(e) => setEditLecturerId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                >
                  <option value="">-- Unassigned --</option>
                  {lecturers.map((lec) => (
                    <option key={lec.id} value={lec.id}>
                      Dr. {lec.firstName} {lec.lastName} ({lec.departmentName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label className="block font-bold text-slate-700 uppercase">
                  Weekly Lecture Schedule
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={editScheduleDay}
                    onChange={(e) => setEditScheduleDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={editScheduleVenue}
                    onChange={(e) => setEditScheduleVenue(e.target.value)}
                    disabled={editScheduleDay === 0}
                    placeholder="Venue e.g. LH 101"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none disabled:opacity-50"
                  />
                </div>
                {editScheduleDay > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Time</span>
                      <input
                        type="time"
                        value={editScheduleStart}
                        onChange={(e) => setEditScheduleStart(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-0.5">End Time</span>
                      <input
                        type="time"
                        value={editScheduleEnd}
                        onChange={(e) => setEditScheduleEnd(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 accent-[#8d4a27] rounded cursor-pointer"
                />
                <label htmlFor="editIsActive" className="font-semibold text-slate-700 cursor-pointer">
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
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV UPLOAD MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Bulk Registration
                </span>
                <h3 className="text-lg font-black text-slate-900">Import Courses via CSV</h3>
              </div>
              <button
                type="button"
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
                  <div className="p-3.5 bg-[#fbf5ef] border border-[#ecdacb] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#743c22]">
                        CUSTECH Course Import Template
                      </p>
                      <p className="text-[11px] text-[#8d4a27]">
                        Columns: Code, Title, Units, Department, Level, Semester, Lecturer
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadCourseCsvTemplate}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-[#8d4a27] text-[#8d4a27] hover:bg-[#8d4a27] hover:text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Template</span>
                    </button>
                  </div>

                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-[#8d4a27] rounded-xl cursor-pointer bg-slate-50 hover:bg-[#fbf5ef] transition text-center">
                    <Upload className="w-6 h-6 text-[#8d4a27] mb-1.5" />
                    <span className="text-xs font-bold text-slate-700">
                      Click to upload a .CSV file
                    </span>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCourseCsvFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">
                      Or Paste CSV Content Directly
                    </label>
                    <textarea
                      rows={5}
                      value={csvContent}
                      onChange={(e) => handleParseCsv(e.target.value)}
                      placeholder={`CSC 205, Operating Systems I, 3, Computer Science, 200, FIRST, doe@custech.edu.ng\nSEN 204, Software Architecture, 3, Software Engineering, 200, SECOND, zainab.idris@custech.edu.ng`}
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
                      <div className="max-h-48 overflow-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-[11px] min-w-[460px]">
                          <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                            <tr>
                              <th className="p-2">Code</th>
                              <th className="p-2">Title</th>
                              <th className="p-2">Units</th>
                              <th className="p-2">Department</th>
                              <th className="p-2">Level / Sem</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bulkParsed.map((rec, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2 font-mono font-bold text-slate-900">{rec.code}</td>
                                <td className="p-2 truncate max-w-[150px]">{rec.title}</td>
                                <td className="p-2">{rec.creditUnits} CU</td>
                                <td className="p-2 truncate max-w-[120px]">{rec.departmentName}</td>
                                <td className="p-2">
                                  {rec.level}L ({rec.semesterType})
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn text-slate-800">
                  <div className="flex items-center gap-2 text-emerald-800 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span>Import Completed Successfully</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Imported
                      </span>
                      <span className="text-base font-extrabold text-emerald-700">
                        {bulkResult.successful}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Skipped
                      </span>
                      <span className="text-base font-extrabold text-amber-700">
                        {bulkResult.skipped}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Failed
                      </span>
                      <span className="text-base font-extrabold text-rose-700">
                        {bulkResult.failed}
                      </span>
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
                      {bulkResult.errors.map((e, i: number) => (
                        <div key={i}>
                          • {e.code}: {e.error}
                        </div>
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
                  onClick={() => void handleConfirmBulkImport()}
                  disabled={isSubmitting || bulkParsed.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#8d4a27] hover:bg-[#743c22] disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isSubmitting ? 'Importing...' : `Import ${bulkParsed.length} Courses`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
