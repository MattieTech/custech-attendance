'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, AttendanceSession, CourseOffering, Course, TimetableEntry } from '@/types';
import { DynamicQrDisplay } from '../attendance/DynamicQrDisplay';
import { KioskTerminal } from '../attendance/KioskTerminal';
import { LiveCounter } from '../attendance/LiveCounter';
import { FraudMonitoringModal } from '../fraud/FraudMonitoringModal';
import { MedicalWaiverModal } from '../medical/MedicalWaiverModal';
import {
  startNewLectureSessionAction,
  reviewAttendanceCorrection,
} from '@/actions/attendance';
import { toggleSyllabusStatus } from '@/actions/academic';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  Users,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  HeartPulse,
  History,
  X,
  ChevronRight,
  ChevronDown,
  Layers,
  GraduationCap,
  Award,
} from 'lucide-react';

interface LecturerDashboardProps {
  user: UserProfile;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ user }) => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // Offerings assigned to this lecturer
  const offerings = React.useMemo(() => {
    const list = custechDb.getLecturerOfferings(user.id);
    if (list.length > 0) return list;
    // Fallback: all offerings if none explicitly linked to user id (for testing flexibility)
    return custechDb.getCourseOfferings();
  }, [user.id, refreshTrigger]);

  const timetableEntries = React.useMemo(() => {
    return custechDb.getTimetableEntries().filter((tt) =>
      offerings.some((o) => o.id === tt.courseOfferingId)
    );
  }, [offerings, refreshTrigger]);

  // Active session detection (dynamic, not hardcoded!)
  const activeSessions = custechDb.getSessions().filter((s) => s.status === 'ACTIVE');
  const lecturerActiveSession = activeSessions.find(
    (s) => s.lecturerId === user.id || offerings.some((o) => o.id === s.courseOfferingId)
  ) || activeSessions[0];

  const [activeSession, setActiveSession] = React.useState<AttendanceSession | undefined>(
    lecturerActiveSession
  );

  // Modals state
  const [isKioskOpen, setIsKioskOpen] = React.useState(false);
  const [isFraudOpen, setIsFraudOpen] = React.useState(false);
  const [isMedicalOpen, setIsMedicalOpen] = React.useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = React.useState<string | null>(null);

  // Start Session Modal State
  const [startModalOffering, setStartModalOffering] = React.useState<{
    offering: CourseOffering & { course?: Course; primaryLecturer?: UserProfile };
    timetable?: TimetableEntry;
  } | null>(null);
  const [startWeekNumber, setStartWeekNumber] = React.useState<number>(1);
  const [startTopicTitle, setStartTopicTitle] = React.useState<string>('');
  const [startVenue, setStartVenue] = React.useState<string>('Lecture Hall 101');
  const [startDuration, setStartDuration] = React.useState<number>(120);
  const [isStartingSession, setIsStartingSession] = React.useState(false);

  // Attendance History Modal State
  const [historyModalOffering, setHistoryModalOffering] = React.useState<{
    offering: CourseOffering & { course?: Course; primaryLecturer?: UserProfile };
  } | null>(null);
  const [expandedSessionId, setExpandedSessionId] = React.useState<string | null>(null);

  // Anti-Proxy Alerts & Corrections
  const corrections = custechDb.getCorrections().filter((c) => c.status === 'PENDING');
  const syllabusTopics = custechDb.getSyllabusForCourse('course-csc201');
  const collisionAlerts = custechDb.getDeviceCollisionAlerts();
  const unreviewedAlertsCount = collisionAlerts.filter((a) => !a.isReviewed).length;

  // Active Session Details
  const activeOffering = activeSession
    ? custechDb.getOfferingById(activeSession.courseOfferingId)
    : undefined;
  const activeCourse = activeOffering?.course;
  const activeDept = custechDb.getDepartments().find((d) => d.id === activeCourse?.departmentId);

  const enrolledStudents = activeSession
    ? custechDb.getEnrolledStudentsForOffering(activeSession.courseOfferingId)
    : [];
  const sessionRecords = activeSession ? custechDb.getRecordsForSession(activeSession.id) : [];

  // Open Start Session Modal
  const handleOpenStartModal = (offering: CourseOffering & { course?: Course; primaryLecturer?: UserProfile }) => {
    const tt = timetableEntries.find((t) => t.courseOfferingId === offering.id);
    const existingSessions = custechDb.getSessionsForOffering(offering.id);
    const nextWeek = existingSessions.length + 1;

    setStartModalOffering({ offering, timetable: tt });
    setStartWeekNumber(nextWeek);
    setStartTopicTitle(`Week ${nextWeek} Lecture Session`);
    setStartVenue(tt?.venue || tt?.classroom?.code || 'Lecture Hall 101');
    setStartDuration(120);
  };

  // Execute Start Session
  const handleConfirmStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startModalOffering) return;

    try {
      setIsStartingSession(true);
      const res = await startNewLectureSessionAction({
        courseOfferingId: startModalOffering.offering.id,
        lecturerId: user.id,
        venue: startVenue.trim() || 'Lecture Hall 101',
        weekNumber: startWeekNumber,
        topicTitle: startTopicTitle.trim() || `Week ${startWeekNumber} Lecture`,
        durationMinutes: startDuration || 120,
        forceNew: true,
      });

      if (res.success && res.session) {
        setActiveSession(res.session);
        setRefreshTrigger((prev) => prev + 1);
        setStartModalOffering(null);
        setActionSuccessMsg(`Week ${startWeekNumber} attendance session started for ${startModalOffering.offering.course?.code}.`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
      } else {
        alert(res.error || 'Failed to start lecture session');
      }
    } catch {
      alert('Error initiating attendance session');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleResolveCorrection = async (correctionId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await reviewAttendanceCorrection(correctionId, user.id, status, 'Reviewed by lecturer');
      setRefreshTrigger((prev) => prev + 1);
      setActionSuccessMsg(`Correction request ${status.toLowerCase()}.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch {
      alert('Error reviewing correction');
    }
  };

  const handleToggleSyllabus = async (topicId: string, currentVal: boolean) => {
    try {
      await toggleSyllabusStatus(topicId, !currentVal, user.id);
      setRefreshTrigger((prev) => prev + 1);
    } catch {
      alert('Error updating syllabus progress');
    }
  };

  return (
    <div className="space-y-6">
      {/* Lecturer Greeting Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Faculty of Computing and Mathematical Sciences
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">First Semester 2026/2027</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Welcome, Dr. {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your officially assigned courses, recurring weekly lecture timetables, and dynamic attendance sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsFraudOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Anti-Proxy Alerts</span>
            {unreviewedAlertsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                {unreviewedAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setIsMedicalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition shadow-sm"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Clinic Waivers</span>
          </button>

          {activeSession && (
            <button
              onClick={() => setIsKioskOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold bg-[#8d4a27] hover:bg-[#743c22] text-white shadow-sm transition"
            >
              <span>Launch Kiosk</span>
            </button>
          )}
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 bg-[#8d4a27] text-white text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn shadow-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ACTIVE ATTENDANCE CONSOLE (DYNAMIC QR & LIVE ROSTER MONITORING) */}
      {activeSession && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Live Attendance Console — {activeCourse?.code || 'CSC 201'} (Week {activeSession.weekNumber || 1})
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Venue: {activeSession.venue || 'LH 101'}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <DynamicQrDisplay
              session={activeSession}
              courseCode={activeCourse?.code || 'CSC 201'}
              courseTitle={activeCourse?.title || 'Data Structures and Algorithms'}
              creditUnits={activeCourse?.creditUnits || 2}
              lecturerName={`Dr. ${user.firstName} ${user.lastName}`}
              departmentName={activeDept?.name || 'Computer Science'}
              academicLevel={activeCourse?.level ? `${activeCourse.level}L` : '200L'}
              classroomCode={activeSession.venue || 'LH 101'}
              venue={activeSession.venue || 'LH 101'}
              weekNumber={activeSession.weekNumber || 1}
              lecturerId={user.id}
              onOpenKiosk={() => setIsKioskOpen(true)}
              onSessionUpdate={(updated) => {
                setActiveSession(updated);
                setRefreshTrigger((prev) => prev + 1);
              }}
            />

            <LiveCounter
              records={sessionRecords}
              totalEnrolled={enrolledStudents.length || 4}
            />
          </div>
        </div>
      )}

      {/* PHASE 4: ASSIGNED COURSES & WEEKLY TIMETABLE CARDS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Assigned Courses & Weekly Lecture Schedules
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {offerings.length} Course{offerings.length !== 1 ? 's' : ''} Assigned
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offerings.map((offering) => {
            const course = offering.course;
            const tt = timetableEntries.find((t) => t.courseOfferingId === offering.id);
            const dept = custechDb.getDepartments().find((d) => d.id === course?.departmentId);
            const isSessionLive = activeSession?.courseOfferingId === offering.id && activeSession?.status === 'ACTIVE';
            const pastSessions = custechDb.getSessionsForOffering(offering.id);

            const dayNames = ['Sun', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sat'];
            const scheduleDisplay = tt ? `Every ${dayNames[tt.dayOfWeek]}, ${tt.startTime} – ${tt.endTime}` : 'Schedule TBD';
            const venueDisplay = tt?.venue || tt?.classroom?.code || 'Lecture Hall';

            return (
              <div
                key={offering.id}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                  isSessionLive
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Course Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900 tracking-tight">
                          {course?.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                          {course?.creditUnits || 2} Units
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-1 line-clamp-1">
                        {course?.title}
                      </h4>
                    </div>

                    {isSessionLive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 animate-pulse shrink-0">
                        ● LIVE NOW
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 shrink-0">
                        {course?.level || 200}L
                      </span>
                    )}
                  </div>

                  {/* Course Attributes (Phase 4 Spec) */}
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Department:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                        {dept?.name || 'Computer Science'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Weekly Schedule:</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{scheduleDisplay}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Lecture Venue:</span>
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{venueDisplay}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Sessions Held:</span>
                      <span className="font-semibold text-slate-700">
                        {pastSessions.length} Weekly Session{pastSessions.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  {isSessionLive ? (
                    <button
                      onClick={() => setActiveSession(activeSession)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
                    >
                      <span>Viewing Live Session</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenStartModal(offering)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition shadow-xs"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Start Attendance</span>
                    </button>
                  )}

                  <button
                    onClick={() => setHistoryModalOffering({ offering })}
                    title="View weekly lecture attendance history"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  >
                    <History className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KIOSK MODAL FOR LECTURER / REP */}
      {isKioskOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl">
            <KioskTerminal
              sessionId={activeSession.id}
              courseCode={activeCourse?.code || 'CSC 201'}
              courseTitle={activeCourse?.title || 'Data Structures and Algorithms'}
              operatorProfileId={user.id}
              operatorName={`Dr. ${user.firstName} ${user.lastName}`}
              operatorRoleTitle="Course Lecturer"
              onClose={() => setIsKioskOpen(false)}
              onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
            />
          </div>
        </div>
      )}

      {/* SYLLABUS & ATTENDANCE DISPUTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Syllabus Progress */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#8d4a27]" />
              <h3 className="text-sm font-bold text-slate-900">
                Course Delivery & Syllabus Progress
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">CSC 201</span>
          </div>

          <div className="space-y-2.5">
            {syllabusTopics.map((topic) => (
              <div
                key={topic.id}
                className="p-3.5 rounded-xl border border-slate-100 flex items-start justify-between gap-3 hover:bg-slate-50 transition"
              >
                <div className="text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-[#8d4a27]">
                      Week {topic.weekNumber}:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {topic.topicTitle}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {topic.learningObjectives}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleSyllabus(topic.id, !!topic.isCompleted)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                    topic.isCompleted
                      ? 'bg-slate-100 text-slate-800 border border-slate-200'
                      : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {topic.isCompleted ? '✓ Taught' : 'Mark Taught'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Disputes / Correction Queue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Pending Attendance Corrections
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {corrections.length} Pending
            </span>
          </div>

          {corrections.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
              <span>No outstanding attendance disputes or correction requests.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {corrections.map((c) => {
                const s = custechDb.getStudentById(c.studentId);
                return (
                  <div key={c.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-800">
                        {s?.matricNumber} • {s?.profile?.firstName} {s?.profile?.lastName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(c.createdAt || (c as any).submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                      "{c.reason}"
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleResolveCorrection(c.id, 'REJECTED')}
                        className="px-2.5 py-1 rounded text-xs font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleResolveCorrection(c.id, 'APPROVED')}
                        className="px-2.5 py-1 rounded text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition"
                      >
                        Approve Presence
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* START ATTENDANCE CONFIRMATION MODAL (PHASE 3 & 4) */}
      {startModalOffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Confirm Lecture Details
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Start Attendance: {startModalOffering.offering.course?.code}
                </h3>
              </div>
              <button
                onClick={() => setStartModalOffering(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmStartSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Course Title
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                  {startModalOffering.offering.course?.title}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Semester Week
                  </label>
                  <select
                    value={startWeekNumber}
                    onChange={(e) => {
                      const wk = Number(e.target.value);
                      setStartWeekNumber(wk);
                      setStartTopicTitle(`Week ${wk} Lecture Session`);
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((wk) => (
                      <option key={wk} value={wk}>
                        Week {wk} Lecture
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Session Duration (Mins)
                  </label>
                  <select
                    value={startDuration}
                    onChange={(e) => setStartDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                  >
                    <option value={60}>1 Hour (60 mins)</option>
                    <option value={120}>2 Hours (120 mins)</option>
                    <option value={180}>3 Hours (180 mins)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lecture Topic Title
                </label>
                <input
                  type="text"
                  required
                  value={startTopicTitle}
                  onChange={(e) => setStartTopicTitle(e.target.value)}
                  placeholder="e.g. Introduction to Binary Search Trees"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Permitted Lecture Venue
                </label>
                <input
                  type="text"
                  required
                  value={startVenue}
                  onChange={(e) => setStartVenue(e.target.value)}
                  placeholder="e.g. LLT 1, Mathematics Hall, LH 101"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#8d4a27] outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Verify or update the lecture hall where this session is taking place.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStartModalOffering(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStartingSession}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold rounded-xl shadow-sm transition"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isStartingSession ? 'Starting...' : 'Launch Attendance Session'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDANCE HISTORY MODAL (PHASE 2 & 3: ORGANIZED BY WEEK & DATE) */}
      {historyModalOffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Weekly Attendance History
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {historyModalOffering.offering.course?.code} — {historyModalOffering.offering.course?.title}
                </h3>
              </div>
              <button
                onClick={() => setHistoryModalOffering(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {(() => {
                const sessions = custechDb.getSessionsForOffering(historyModalOffering.offering.id);
                if (sessions.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <span>No lecture attendance sessions recorded yet for this course.</span>
                    </div>
                  );
                }

                return sessions.map((sess) => {
                  const records = custechDb.getRecordsForSession(sess.id);
                  const isExpanded = expandedSessionId === sess.id;
                  const enrolled = custechDb.getEnrolledStudentsForOffering(sess.courseOfferingId);
                  const totalPossible = enrolled.length || 4;
                  const pct = Math.round((records.length / totalPossible) * 100);

                  return (
                    <div
                      key={sess.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-900">
                              Week {sess.weekNumber || 1}
                            </span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-semibold text-slate-600">
                              {sess.date}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                sess.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {sess.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5">
                            {sess.topicTitle || 'Regular Lecture'}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>Venue: <strong className="text-slate-600">{sess.venue || 'LH 101'}</strong></span>
                            <span>•</span>
                            <span>Code: <strong className="text-slate-600 font-mono">{sess.currentTempCode}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-slate-900 block">
                              {records.length} / {totalPossible} Present
                            </span>
                            <span className="text-[11px] font-bold text-[#8d4a27]">
                              {pct}% Attendance
                            </span>
                          </div>
                          <button
                            onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Student Attendance Roster for this session */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Verified Attendees ({records.length})
                          </span>
                          {records.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">No attendance records submitted for this session.</span>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {records.map((r) => (
                                <div
                                  key={r.id}
                                  className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 block">
                                      {r.student?.matricNumber}
                                    </span>
                                    <span className="text-[11px] text-slate-500">
                                      {r.student?.profile?.firstName} {r.student?.profile?.lastName}
                                    </span>
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      r.status === 'PRESENT'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-amber-50 text-amber-700'
                                    }`}
                                  >
                                    {r.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryModalOffering(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FRAUD & MEDICAL MODALS */}
      {isFraudOpen && (
        <FraudMonitoringModal
          alerts={custechDb.getDeviceCollisionAlerts()}
          reviewerId={user.id}
          onClose={() => setIsFraudOpen(false)}
          onUpdate={() => {}}
        />
      )}
      {isMedicalOpen && (
        <MedicalWaiverModal
          reviewerProfileId={user.id}
          onClose={() => setIsMedicalOpen(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};
