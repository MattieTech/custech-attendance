'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, AttendanceSession, ExamDocket } from '@/types';
import { PercentageRing } from '../analytics/PercentageRing';
import { QrScannerModal } from '../attendance/QrScannerModal';
import { ExamDocketModal } from '../docket/ExamDocketModal';
import { AttendanceForecast } from '../analytics/AttendanceForecast';
import { submitAttendanceCorrection } from '@/actions/attendance';
import {
  getDatabaseSnapshotAction,
  getAvailableCoursesForRegistrationAction,
  submitStudentCourseRegistrationAction,
} from '@/actions/academic';
import { getStudentFaceStatusAction, enrollStudentFaceAction } from '@/actions/biometric';
import { FacialVerificationScanner } from '../attendance/FacialVerificationScanner';
import { formatDate, formatTime, getStatusBadgeVariant } from '@/lib/utils';
import { OfflineSyncBanner } from '../layout/OfflineSyncBanner';
import {
  Clock,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Award,
  HeartPulse,
  Radio,
  Key,
  ScanFace,
  ShieldCheck,
  X,
  Calendar,
  MapPin,
  BookOpen,
  Lock,
  Plus,
  Search,
  AlertCircle,
  MessageSquareWarning,
} from 'lucide-react';

interface StudentDashboardProps {
  user: UserProfile;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const syncFromServer = React.useCallback(async () => {
    try {
      const snapshot = await getDatabaseSnapshotAction();
      if (snapshot) {
        custechDb.syncClientSnapshot(snapshot);
        setRefreshTrigger((prev) => prev + 1);
      }
    } catch {
      // Offline fallback uses local custechDb
    }
  }, []);

  React.useEffect(() => {
    const handleSynced = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('custech-db-synced', handleSynced);
    // Poll periodically so lecturer opening/closing attendance updates dynamically
    const interval = setInterval(() => {
      void syncFromServer();
    }, 6000);
    return () => {
      window.removeEventListener('custech-db-synced', handleSynced);
      clearInterval(interval);
    };
  }, [syncFromServer]);

  void refreshTrigger;
  const student = custechDb.getStudentByProfileId(user.id);
  const departments = custechDb.getDepartments();
  const faculties = custechDb.getFaculties();
  const currentSession = custechDb.getCurrentAcademicSession();
  const currentSemester = custechDb.getCurrentSemester();

  const studentDept = departments.find(
    (d) =>
      d.id === user.departmentId ||
      (user.departmentId === 'dept-se' && d.id === 'dept-sen')
  );
  const studentFaculty = faculties.find(
    (f) => f.id === user.facultyId || f.id === studentDept?.facultyId
  );

  // Strict per-student enrolled offerings for current semester
  const enrolledOfferings = student ? custechDb.getStudentOfferings(student.id) : [];
  const enrolledOfferingIds = new Set(enrolledOfferings.map((o) => o.id));
  const attendanceRecords = student ? custechDb.getRecordsForStudent(student.id) : [];
  const allSessions = custechDb.getSessions();
  const timetables = custechDb.getTimetableEntries();

  // Only show ACTIVE sessions belonging to this student's registered courses
  const activeEnrolledSessions = allSessions.filter(
    (s) => s.status === 'ACTIVE' && enrolledOfferingIds.has(s.courseOfferingId)
  );
  const enrolledSessionsList = allSessions.filter((s) =>
    enrolledOfferingIds.has(s.courseOfferingId)
  );

  const [selectedSessionForScan, setSelectedSessionForScan] = React.useState<AttendanceSession | null>(null);
  const [isManualEntryOpen, setIsManualEntryOpen] = React.useState(false);
  const [manualCourseDefault, setManualCourseDefault] = React.useState<string>('');
  const [successToast, setSuccessToast] = React.useState<string | null>(null);
  const [docket, setDocket] = React.useState<ExamDocket | null>(null);
  const [forecastOfferingId, setForecastOfferingId] = React.useState<string>('');

  // Student Course Registration Request State
  const [isCourseRegOpen, setIsCourseRegOpen] = React.useState(false);
  const [availableCourses, setAvailableCourses] = React.useState<
    Array<{
      id: string;
      code: string;
      title: string;
      creditUnits: number;
      departmentId: string;
      departmentName: string;
      level: number;
      semesterType: 'FIRST' | 'SECOND';
      assignedLecturers: string[];
    }>
  >([]);
  const [regCourseSearch, setRegCourseSearch] = React.useState('');
  const [regSelectedIds, setRegSelectedIds] = React.useState<string[]>([]);
  const [regNote, setRegNote] = React.useState('');
  const [regLoading, setRegLoading] = React.useState(false);
  const [regSubmitting, setRegSubmitting] = React.useState(false);
  const [regError, setRegError] = React.useState<string | null>(null);

  const myRegRequests = student
    ? custechDb.getCourseRegistrationRequests({ studentId: student.id })
    : [];
  const latestRegRequest = myRegRequests[0];

  const openCourseRegModal = async () => {
    setRegError(null);
    setRegCourseSearch('');
    setRegNote(latestRegRequest?.studentNote || '');
    const initialIds =
      latestRegRequest &&
      (latestRegRequest.status === 'PENDING' ||
        latestRegRequest.status === 'CHANGES_REQUESTED' ||
        latestRegRequest.status === 'REJECTED')
        ? latestRegRequest.courseIds
        : enrolledOfferings.map((o) => o.courseId);
    setRegSelectedIds(initialIds);
    setIsCourseRegOpen(true);
    setRegLoading(true);
    try {
      const res = await getAvailableCoursesForRegistrationAction();
      if (res.success) {
        setAvailableCourses(res.courses);
      } else {
        setRegError(res.error || 'Could not load course catalogue.');
      }
    } catch {
      setRegError('Error loading course catalogue.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleSubmitCourseReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regSelectedIds.length === 0) {
      setRegError('Please select at least one course to submit for approval.');
      return;
    }
    setRegSubmitting(true);
    setRegError(null);
    try {
      const res = await submitStudentCourseRegistrationAction({
        courseIds: regSelectedIds,
        studentNote: regNote,
      });
      if (!res.success) {
        setRegError(res.error || 'Failed to submit course registration.');
        return;
      }
      await syncFromServer();
      setIsCourseRegOpen(false);
      setSuccessToast(
        'Course registration submitted! Awaiting HOD / Level Adviser or Admin approval.'
      );
      setTimeout(() => setSuccessToast(null), 5000);
    } catch {
      setRegError('Unexpected error submitting course registration.');
    } finally {
      setRegSubmitting(false);
    }
  };

  // Face ID Biometric Enrollment state
  const [faceStatus, setFaceStatus] = React.useState<{
    loaded: boolean;
    enrolled: boolean;
    enrolledAt?: string;
    isLocked?: boolean;
  }>({ loaded: false, enrolled: false });
  const [isFaceEnrollOpen, setIsFaceEnrollOpen] = React.useState(false);

  const targetStudentId = student?.id || user.id;

  const loadFaceStatus = async () => {
    try {
      const res = await getStudentFaceStatusAction(targetStudentId);
      setFaceStatus({
        loaded: true,
        enrolled: res.enrolled,
        enrolledAt: res.enrolledAt,
        isLocked: res.isLocked,
      });
    } catch {
      setFaceStatus((prev) => ({ ...prev, loaded: true }));
    }
  };

  React.useEffect(() => {
    let active = true;
    getStudentFaceStatusAction(targetStudentId)
      .then((res) => {
        if (!active) return;
        setFaceStatus({
          loaded: true,
          enrolled: res.enrolled,
          enrolledAt: res.enrolledAt,
          isLocked: res.isLocked,
        });
      })
      .catch(() => {
        if (!active) return;
        setFaceStatus((prev) => ({ ...prev, loaded: true }));
      });
    return () => {
      active = false;
    };
  }, [targetStudentId]);

  // Correction Dispute Modal state
  const [isDisputeOpen, setIsDisputeOpen] = React.useState(false);
  const [disputeSessionId, setDisputeSessionId] = React.useState('');
  const [disputeReason, setDisputeReason] = React.useState('');
  const [disputeFeedback, setDisputeFeedback] = React.useState<string | null>(null);

  // Medical Waivers
  const studentWaivers = student
    ? custechDb.getMedicalWaivers().filter((w) => w.studentId === student.id)
    : [];

  // Overall Attendance KPI Calculation strictly across enrolled courses
  const enrolledRecords = attendanceRecords.filter((r) =>
    enrolledSessionsList.some((s) => s.id === r.sessionId)
  );
  const presentCount = enrolledRecords.filter((r) => r.status === 'PRESENT').length;
  const lateCount = enrolledRecords.filter((r) => r.status === 'LATE').length;
  const closedEnrolledSessions = enrolledSessionsList.filter(
    (s) => s.status === 'CLOSED' || s.status === 'FINALIZED'
  );
  const attendedSessionIds = new Set(enrolledRecords.map((r) => r.sessionId));
  const absentCount = closedEnrolledSessions.filter((s) => !attendedSessionIds.has(s.id)).length;

  const handleGenerateDocket = () => {
    if (!student) return;
    const doc = custechDb.generateExamDocket(student.id);
    setDocket(doc);
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || !disputeSessionId || !disputeReason) return;
    try {
      await submitAttendanceCorrection(disputeSessionId, student.id, disputeReason);
      await syncFromServer();
      setDisputeFeedback('Attendance correction request submitted to Course Lecturer.');
      setTimeout(() => {
        setIsDisputeOpen(false);
        setDisputeReason('');
        setDisputeFeedback(null);
      }, 2000);
    } catch (err: unknown) {
      setDisputeFeedback(err instanceof Error ? err.message : 'Error submitting request');
    }
  };

  // Forecast course computation
  const forecastOffering =
    enrolledOfferings.find((o) => o.id === forecastOfferingId) || enrolledOfferings[0];
  const forecastSessions = forecastOffering
    ? enrolledSessionsList.filter(
        (s) =>
          s.courseOfferingId === forecastOffering.id &&
          (s.status === 'CLOSED' || s.status === 'FINALIZED' || s.status === 'ACTIVE')
      )
    : [];
  const forecastAttended = forecastSessions.filter((s) => attendedSessionIds.has(s.id)).length;
  const forecastClosed = forecastSessions.filter(
    (s) => s.status === 'CLOSED' || s.status === 'FINALIZED'
  );
  const forecastAbsent = forecastClosed.filter((s) => !attendedSessionIds.has(s.id)).length;

  return (
    <div className="space-y-6">
      {/* Offline Mode & Auto-Sync Banner */}
      <OfflineSyncBanner />

      {/* Student Welcome & Profile Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 w-full lg:w-auto">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#8d4a27] text-white font-black text-lg sm:text-xl flex items-center justify-center shadow-sm shrink-0">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 break-words">
                {user.firstName} {user.lastName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                {student?.currentLevel || 200}L
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                {currentSemester?.semesterType === 'SECOND' ? 'Second' : 'First'} Semester •{' '}
                {currentSession?.name || '2026/2027'}
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-slate-500 mt-1">
              Matric: {student?.matricNumber || user.matricNumber}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 break-words">
              Department of {studentDept?.name || 'Academic Studies'} •{' '}
              {studentFaculty?.name || 'Confluence University of Science & Technology'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateDocket}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>Exam Clearance Docket</span>
              </button>

              {faceStatus.loaded &&
                (faceStatus.enrolled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Face ID Active &amp; Locked</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsFaceEnrollOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
                  >
                    <ScanFace className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Enroll Face ID</span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Aggregate Attendance Progress Ring */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-4 w-full lg:w-auto shrink-0">
          <PercentageRing
            presentCount={presentCount}
            lateCount={lateCount}
            absentCount={absentCount}
            size="md"
          />
          <div className="text-left min-w-0">
            <p className="text-xs font-bold text-slate-900">Overall Semester Rate</p>
            <p className="text-xs text-slate-500">Target: 75% Statutory Exam Req.</p>
            <p className="text-xs text-[#8d4a27] font-bold mt-1">
              {presentCount + lateCount} of {presentCount + lateCount + absentCount} classes attended
            </p>
          </div>
        </div>
      </div>

      {/* Face ID Enrollment Reminder Banner */}
      {faceStatus.loaded && !faceStatus.enrolled && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ScanFace className="w-5 h-5 text-[#8d4a27] shrink-0 mt-0.5" />
            <div className="text-xs">
              <h4 className="font-bold text-slate-900">
                Biometric Face ID Required for Academic Integrity
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Enroll your Face ID once to verify your identity during lecture check-ins and prevent proxy attendance.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFaceEnrollOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shrink-0 shadow-xs transition"
          >
            Register Face ID Now
          </button>
        </div>
      )}

      {/* Medical Waiver Notice Banner */}
      {studentWaivers.length > 0 && (
        <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-3">
          <HeartPulse className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sky-950">
              Official University Health Centre Medical Waiver Active
            </h4>
            <p className="text-xs text-sky-900 mt-0.5">
              {studentWaivers[0].diagnosisSummary} ({studentWaivers[0].startDate} to{' '}
              {studentWaivers[0].endDate}) certified by {studentWaivers[0].doctorName}. All missed
              lecture sessions during this period are marked as <strong>EXCUSED</strong>.
            </p>
          </div>
        </div>
      )}

      {successToast && (
        <div className="p-4 rounded-xl bg-[#8d4a27] text-white text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="break-words">{successToast}</span>
          </div>
          <button type="button" onClick={() => setSuccessToast(null)} className="underline text-xs shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* TODAY'S ACTIVE ATTENDANCE SESSIONS (ONLY FOR THIS STUDENT'S COURSES) */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#8d4a27] animate-pulse shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Live Attendance Sessions ({activeEnrolledSessions.length})
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setManualCourseDefault(enrolledOfferings[0]?.course?.code || '');
                setIsManualEntryOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#fbf5ef] hover:bg-[#ecdacb] text-[#8d4a27] border border-[#ecdacb] text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Enter Lecture Code</span>
            </button>
            <span className="text-xs text-slate-400 font-medium">
              {formatDate(new Date().toISOString())}
            </span>
          </div>
        </div>

        {activeEnrolledSessions.length === 0 ? (
          <div className="p-6 sm:p-8 text-center bg-white border border-slate-200 rounded-2xl text-slate-500 text-xs shadow-sm space-y-3">
            <p>
              No active attendance sessions for your registered courses right now. When your lecturer opens attendance, it will appear here automatically.
            </p>
            <button
              type="button"
              onClick={() => {
                setManualCourseDefault(enrolledOfferings[0]?.course?.code || '');
                setIsManualEntryOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition shadow-sm"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Enter Course Code &amp; Lecture Code Manually</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEnrolledSessions.map((sess) => {
              const offering = custechDb.getOfferingById(sess.courseOfferingId);
              const course = offering?.course;
              const isAlreadyAttended = attendanceRecords.some((r) => r.sessionId === sess.id);

              return (
                <div
                  key={sess.id}
                  className="bg-white border-2 border-emerald-400 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition relative overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-black text-slate-900">
                          {course?.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                          ● ATTENDANCE OPEN
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-700 mt-1 break-words">
                        {course?.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {sess.actualStart || sess.scheduledStart
                            ? `${formatTime(sess.actualStart || sess.scheduledStart)} – ${formatTime(sess.scheduledEnd)}`
                            : 'Ongoing'}{' '}
                          • {sess.venue || 'Lecture Hall'}
                        </span>
                      </p>
                    </div>

                    {isAlreadyAttended ? (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shrink-0 self-start">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Logged</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedSessionForScan(sess)}
                        className="px-4 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm hover:shadow-md transition flex items-center justify-center gap-1.5 shrink-0 w-full sm:w-auto"
                      >
                        <span>Mark Present</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REGISTERED COURSES & DYNAMIC ATTENDANCE STATUS */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Registered Courses — {currentSemester?.semesterType === 'SECOND' ? 'Second' : 'First'} Semester ({enrolledOfferings.length})
            </h3>
            <span className="text-xs text-slate-500">
              Showing courses for {studentDept?.name || 'your department'} ({student?.currentLevel || 200}L)
            </span>
          </div>

          <button
            type="button"
            onClick={() => void openCourseRegModal()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register / Update Courses</span>
          </button>
        </div>

        {latestRegRequest && (
          <div
            className={`mb-4 p-3.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              latestRegRequest.status === 'APPROVED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : latestRegRequest.status === 'CHANGES_REQUESTED'
                ? 'bg-amber-50 border-amber-200 text-amber-950'
                : latestRegRequest.status === 'REJECTED'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-sky-50 border-sky-200 text-sky-900'
            }`}
          >
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 font-bold">
                {latestRegRequest.status === 'APPROVED' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {latestRegRequest.status === 'CHANGES_REQUESTED' && <MessageSquareWarning className="w-4 h-4 text-amber-600 shrink-0" />}
                {latestRegRequest.status === 'REJECTED' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                {latestRegRequest.status === 'PENDING' && <Clock className="w-4 h-4 text-sky-600 shrink-0" />}
                <span>
                  Course Registration Status: {latestRegRequest.status.replace('_', ' ')} ({latestRegRequest.courseIds.length} courses)
                </span>
              </div>
              {latestRegRequest.status === 'PENDING' && (
                <p className="text-[11px] opacity-85">
                  Submitted {new Date(latestRegRequest.submittedAt).toLocaleString()}. Awaiting HOD / Level Adviser or Admin review.
                </p>
              )}
              {latestRegRequest.reviewerComment && (
                <p className="text-xs font-semibold bg-white/80 px-3 py-1.5 rounded-lg border border-black/10">
                  Reviewer Comment ({latestRegRequest.reviewedByName || 'Approver'}): {latestRegRequest.reviewerComment}
                </p>
              )}
            </div>

            {(latestRegRequest.status === 'CHANGES_REQUESTED' ||
              latestRegRequest.status === 'REJECTED' ||
              latestRegRequest.status === 'PENDING') && (
              <button
                type="button"
                onClick={() => void openCourseRegModal()}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-bold shrink-0 self-start sm:self-center"
              >
                {latestRegRequest.status === 'PENDING' ? 'Edit Submission' : 'Correct & Resubmit'}
              </button>
            )}
          </div>
        )}

        {enrolledOfferings.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl text-xs text-slate-500">
            <BookOpen className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">No courses registered for this semester yet.</p>
            <p className="mt-1 text-slate-400">
              Courses created for your department and academic level will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrolledOfferings.map((off) => {
              const course = off.course;
              const courseSessions = allSessions.filter((s) => s.courseOfferingId === off.id);
              const liveSession = courseSessions.find((s) => s.status === 'ACTIVE');
              const pausedSession = courseSessions.find((s) => s.status === 'PAUSED');
              const latestSession = courseSessions[0];
              const tt = timetables.find((t) => t.courseOfferingId === off.id);

              const heldOrActiveSessions = courseSessions.filter(
                (s) => s.status === 'CLOSED' || s.status === 'FINALIZED' || s.status === 'ACTIVE'
              );
              const courseAttendedCount = heldOrActiveSessions.filter((s) =>
                attendanceRecords.some(
                  (r) =>
                    r.sessionId === s.id &&
                    (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'EXCUSED')
                )
              ).length;
              const courseClosedCount = courseSessions.filter(
                (s) => s.status === 'CLOSED' || s.status === 'FINALIZED'
              );
              const courseAbsentCount = courseClosedCount.filter(
                (s) => !attendanceRecords.some((r) => r.sessionId === s.id)
              ).length;

              const isAlreadyMarkedLive = liveSession
                ? attendanceRecords.some((r) => r.sessionId === liveSession.id)
                : false;

              const scheduleText = liveSession
                ? `${formatDate(liveSession.date)} • ${formatTime(liveSession.actualStart || liveSession.scheduledStart)} – ${formatTime(liveSession.scheduledEnd)}`
                : tt
                ? `Every ${DAY_NAMES[tt.dayOfWeek]}, ${tt.startTime} – ${tt.endTime}`
                : latestSession
                ? `Last lecture: ${formatDate(latestSession.date)}`
                : 'Schedule TBD';

              const venueText =
                liveSession?.venue ||
                tt?.venue ||
                tt?.classroom?.code ||
                latestSession?.venue ||
                'Lecture Hall TBD';

              const lecturerName = off.primaryLecturer
                ? `${off.primaryLecturer.firstName} ${off.primaryLecturer.lastName}`
                : 'Lecturer Pending Assignment';

              return (
                <div
                  key={off.id}
                  className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-3 ${
                    liveSession ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-base font-black text-slate-900">
                            {course?.code}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                            {course?.creditUnits || 2} CU
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 mt-1 break-words">
                          {course?.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Lecturer: <strong className="text-slate-700">{lecturerName}</strong>
                        </p>
                      </div>

                      <div className="shrink-0">
                        <PercentageRing
                          presentCount={courseAttendedCount}
                          lateCount={0}
                          absentCount={courseAbsentCount}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Dynamic Open / Closed Status & Schedule */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium">Attendance Status:</span>
                        {liveSession ? (
                          <span className="px-2.5 py-0.5 rounded-full font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                            ● OPEN NOW
                          </span>
                        ) : pausedSession ? (
                          <span className="px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            PAUSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Lock className="w-2.5 h-2.5" />
                            CLOSED
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="break-words">{scheduleText}</span>
                      </div>

                      <div className="flex items-start gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="break-words">{venueText}</span>
                      </div>

                      <p className="text-[11px] text-slate-500 pt-1">
                        {liveSession
                          ? isAlreadyMarkedLive
                            ? 'Availability: Open • You have already marked present for this lecture.'
                            : 'Availability: Open now • Tap Mark Present to scan QR or verify.'
                          : pausedSession
                          ? 'Availability: Temporarily paused by lecturer.'
                          : `Availability: Closed • ${courseAttendedCount} of ${courseAttendedCount + courseAbsentCount} held sessions attended.`}
                      </p>
                    </div>
                  </div>

                  {liveSession && !isAlreadyMarkedLive && (
                    <button
                      type="button"
                      onClick={() => setSelectedSessionForScan(liveSession)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>Mark Present Now</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ATTENDANCE PROJECTION / WHAT-IF FORECAST CALCULATOR */}
      {forecastOffering && (
        <div className="space-y-2">
          {enrolledOfferings.length > 1 && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="text-xs font-bold text-slate-600">
                Simulate Course Forecast:
              </label>
              <select
                value={forecastOffering.id}
                onChange={(e) => setForecastOfferingId(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
              >
                {enrolledOfferings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.course?.code} — {o.course?.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <AttendanceForecast
            courseCode={forecastOffering.course?.code || 'COURSE'}
            currentAttended={forecastAttended}
            currentAbsent={forecastAbsent}
          />
        </div>
      )}

      {/* ATTENDANCE HISTORY LOG & DISPUTE BUTTON */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Verified Attendance History
            </h3>
            <p className="text-xs text-slate-500">
              Official academic attendance log for the current semester
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDisputeOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm w-full sm:w-auto"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>Lodge Correction</span>
          </button>
        </div>

        {enrolledRecords.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No attendance records logged yet for this semester.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {enrolledRecords.map((r) => {
              const session = custechDb.getSessionById(r.sessionId);
              const statusBadge = getStatusBadgeVariant(r.status);
              return (
                <div
                  key={r.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {session?.courseOffering?.course?.code || 'COURSE'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{formatDate(r.recordedAt)}</span>
                      {r.facialVerified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ScanFace className="w-3 h-3" />
                          <span>
                            Face Verified{r.facialConfidence ? ` (${r.facialConfidence}%)` : ''}
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Method: {r.method.replace('_', ' ')}{' '}
                      {r.assistedReason ? `(${r.assistedReason})` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {formatTime(r.recordedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SCANNER / MANUAL ATTENDANCE MODAL */}
      {(selectedSessionForScan || isManualEntryOpen) && (
        <QrScannerModal
          sessionId={selectedSessionForScan?.id}
          courseCode={
            selectedSessionForScan
              ? custechDb.getOfferingById(selectedSessionForScan.courseOfferingId)?.course?.code || ''
              : manualCourseDefault
          }
          studentProfileId={user.id}
          studentName={`${user.firstName} ${user.lastName}`}
          matricNumber={student?.matricNumber || user.matricNumber || ''}
          onClose={() => {
            setSelectedSessionForScan(null);
            setIsManualEntryOpen(false);
            void loadFaceStatus();
          }}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setSelectedSessionForScan(null);
            setIsManualEntryOpen(false);
            void loadFaceStatus();
            void syncFromServer();
          }}
        />
      )}

      {/* FACE ID BIOMETRIC ENROLLMENT MODAL */}
      {isFaceEnrollOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md relative max-h-[92vh] overflow-y-auto rounded-2xl shadow-xl">
            <button
              type="button"
              onClick={() => setIsFaceEnrollOpen(false)}
              className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full bg-white border border-[#ecdacb] shadow-xs flex items-center justify-center text-slate-500 hover:text-[#8d4a27] transition cursor-pointer"
              aria-label="Close Face ID Enrollment"
            >
              <X className="w-4 h-4" />
            </button>
            <FacialVerificationScanner
              mode="ENROLL"
              studentName={`${user.firstName} ${user.lastName}`}
              matricNumber={student?.matricNumber || user.matricNumber || ''}
              onEnrolled={async ({ descriptor, sampleCount, thumbnailDataUrl }) => {
                const res = await enrollStudentFaceAction({
                  studentIdOrProfileId: student?.id || user.id,
                  descriptor,
                  sampleCount,
                  actorProfileId: user.id,
                  thumbnailDataUrl,
                });
                if (res.success) {
                  await loadFaceStatus();
                  setSuccessToast(res.message);
                  setTimeout(() => setIsFaceEnrollOpen(false), 1200);
                }
                return res;
              }}
              onCancel={() => setIsFaceEnrollOpen(false)}
            />
          </div>
        </div>
      )}

      {/* CORRECTION / DISPUTE MODAL */}
      {isDisputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Submit Attendance Correction Request
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              If you attended a lecture but could not mark attendance due to device or network issues.
            </p>

            {disputeFeedback && (
              <div className="p-3 mb-4 rounded-xl bg-[#fbf5ef] border border-[#ecdacb] text-[#8d4a27] text-xs font-semibold">
                {disputeFeedback}
              </div>
            )}

            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Session
                </label>
                <select
                  value={disputeSessionId}
                  onChange={(e) => setDisputeSessionId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                >
                  <option value="">Select Missed Session</option>
                  {enrolledSessionsList.map((sess) => {
                    const code = sess.courseOffering?.course?.code || 'COURSE';
                    return (
                      <option key={sess.id} value={sess.id}>
                        {code} (Week {sess.weekNumber || 1}) - {sess.date}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Explanation / Reason
                </label>
                <textarea
                  rows={3}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="e.g. My phone battery died during lecture before the Kiosk could reach my row..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDisputeOpen(false)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-lg text-xs font-bold bg-[#8d4a27] hover:bg-[#743c22] text-white shadow-sm transition"
                >
                  Submit for Lecturer Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM DOCKET CLEARANCE MODAL */}
      {docket && <ExamDocketModal docket={docket} onClose={() => setDocket(null)} />}

      {/* STUDENT COURSE REGISTRATION MODAL */}
      {isCourseRegOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto">
            <div className="bg-[#743c22] text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#eed7c3]" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Register Semester Courses
                  </h3>
                  <p className="text-[11px] text-[#eed7c3]">
                    Select your courses and submit for HOD / Level Adviser or Admin approval
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCourseRegOpen(false)}
                className="p-1.5 rounded-lg text-[#eed7c3] hover:text-white hover:bg-[#5f321d] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCourseReg} className="p-4 sm:p-5 space-y-4">
              {latestRegRequest?.reviewerComment && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                  <strong>Reviewer Feedback ({latestRegRequest.reviewedByName || 'Approver'}):</strong>{' '}
                  {latestRegRequest.reviewerComment}
                </div>
              )}

              {regError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={regCourseSearch}
                  onChange={(e) => setRegCourseSearch(e.target.value)}
                  placeholder="Search course code, title, or department (e.g. CSC 201, MTH 201)..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none"
                />
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {regLoading ? (
                  <div className="py-10 text-center text-xs text-slate-400">
                    Loading university course catalogue...
                  </div>
                ) : (
                  availableCourses
                    .filter((c) => {
                      const q = regCourseSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (
                        c.code.toLowerCase().includes(q) ||
                        c.title.toLowerCase().includes(q) ||
                        c.departmentName.toLowerCase().includes(q)
                      );
                    })
                    .sort((a, b) => {
                      const aMine = a.departmentId === studentDept?.id ? 0 : 1;
                      const bMine = b.departmentId === studentDept?.id ? 0 : 1;
                      if (aMine !== bMine) return aMine - bMine;
                      return a.code.localeCompare(b.code);
                    })
                    .map((course) => {
                      const checked = regSelectedIds.includes(course.id);
                      return (
                        <label
                          key={course.id}
                          className={`flex items-start gap-2.5 p-3 text-xs cursor-pointer transition ${
                            checked ? 'bg-[#fbf5ef]/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setRegSelectedIds((prev) =>
                                prev.includes(course.id)
                                  ? prev.filter((id) => id !== course.id)
                                  : [...prev, course.id]
                              )
                            }
                            className="mt-0.5 accent-[#8d4a27]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-bold text-[#8d4a27]">
                                {course.code}
                              </span>
                              <span className="font-semibold text-slate-900">
                                {course.title}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                {course.creditUnits}U • {course.level}L
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {course.departmentName} • {course.assignedLecturers.join(', ') || 'Lecturer TBD'}
                            </p>
                          </div>
                        </label>
                      );
                    })
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Note to HOD / Level Adviser (Optional)
                </label>
                <input
                  type="text"
                  value={regNote}
                  onChange={(e) => setRegNote(e.target.value)}
                  placeholder="e.g. Added carryover course or core elective..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-[#8d4a27] outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-600">
                  {regSelectedIds.length} course(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCourseRegOpen(false)}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={regSubmitting || regSelectedIds.length === 0}
                    className="px-4 py-2 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] disabled:opacity-50 text-white text-xs font-bold shadow-sm transition"
                  >
                    {regSubmitting ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
