'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, AttendanceSession, CourseOffering, Course, TimetableEntry, SyllabusTopic } from '@/types';
import { DynamicQrDisplay } from '../attendance/DynamicQrDisplay';
import { KioskTerminal } from '../attendance/KioskTerminal';
import { LiveCounter } from '../attendance/LiveCounter';
import { FraudMonitoringModal } from '../fraud/FraudMonitoringModal';
import { MedicalWaiverModal } from '../medical/MedicalWaiverModal';
import {
  startNewLectureSessionAction,
  reviewAttendanceCorrection,
} from '@/actions/attendance';
import {
  toggleSyllabusStatus,
  ensureCourseSyllabusAction,
  addSyllabusTopicAction,
  getDatabaseSnapshotAction,
} from '@/actions/academic';
import { formatDate, formatTime } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  HeartPulse,
  History,
  X,
  ChevronDown,
  Search,
  Layers,
  Users,
  Radio,
  Plus,
} from 'lucide-react';

interface LecturerDashboardProps {
  user: UserProfile;
}

const DAY_NAMES = ['Sun', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Sat'];

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ user }) => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [selectedOfferingId, setSelectedOfferingId] = React.useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null);
  const [courseSearch, setCourseSearch] = React.useState('');

  // Syllabus management state
  const [syllabusOverride, setSyllabusOverride] = React.useState<Record<string, SyllabusTopic[]>>({});
  const [isAddingTopic, setIsAddingTopic] = React.useState(false);
  const [newTopicWeek, setNewTopicWeek] = React.useState(5);
  const [newTopicTitle, setNewTopicTitle] = React.useState('');
  const [newTopicObj, setNewTopicObj] = React.useState('');
  const [isSavingSyllabus, setIsSavingSyllabus] = React.useState(false);

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
    const interval = setInterval(() => {
      void syncFromServer();
    }, 6000);
    return () => {
      window.removeEventListener('custech-db-synced', handleSynced);
      clearInterval(interval);
    };
  }, [syncFromServer]);

  // Strictly ONLY offerings assigned to this lecturer
  const offerings = (() => {
    void refreshTrigger;
    return custechDb.getLecturerOfferings(user.id);
  })();

  const assignedOfferingIds = new Set(offerings.map((o) => o.id));

  const timetableEntries = custechDb
    .getTimetableEntries()
    .filter((tt) => assignedOfferingIds.has(tt.courseOfferingId));

  const allSessions = custechDb.getSessions();
  const lecturerSessions = allSessions.filter(
    (s) => assignedOfferingIds.has(s.courseOfferingId) || s.lecturerId === user.id
  );
  const lecturerActiveSessions = lecturerSessions.filter(
    (s) => s.status === 'ACTIVE' || s.status === 'PAUSED'
  );

  // Derive valid selectedOffering (UI-only selection; never auto-opens an old session)
  const selectedOffering =
    offerings.find((o) => o.id === selectedOfferingId) ||
    offerings[0];
  const selectedCourse = selectedOffering?.course;
  const selectedCourseDept = custechDb
    .getDepartments()
    .find((d) => d.id === selectedCourse?.departmentId);

  // Active live session for the currently selected course (only shown in console if lecturer explicitly opens/starts it)
  const selectedCourseLiveSession = selectedOffering
    ? lecturerActiveSessions.find((s) => s.courseOfferingId === selectedOffering.id)
    : undefined;

  const activeSession: AttendanceSession | undefined = selectedSessionId
    ? lecturerSessions.find(
        (s) =>
          s.id === selectedSessionId &&
          (s.status === 'ACTIVE' || s.status === 'PAUSED') &&
          (!selectedOffering || s.courseOfferingId === selectedOffering.id)
      )
    : undefined;

  // Initialize syllabus topics for selected course if empty
  React.useEffect(() => {
    if (!selectedCourse?.id) return;
    const localTopics = custechDb.getSyllabusForCourse(selectedCourse.id);
    if (localTopics.length > 0) return;
    let cancelled = false;
    ensureCourseSyllabusAction(selectedCourse.id)
      .then((topics) => {
        if (!cancelled && topics.length > 0) {
          setSyllabusOverride((prev) => ({ ...prev, [selectedCourse.id]: topics }));
          void syncFromServer();
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedCourse?.id, syncFromServer]);

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

  // Active Session Details
  const activeOffering = activeSession
    ? custechDb.getOfferingById(activeSession.courseOfferingId)
    : undefined;
  const activeCourse = activeOffering?.course;
  const activeDept = custechDb
    .getDepartments()
    .find((d) => d.id === activeCourse?.departmentId);

  // Corrections & Alerts scoped to this lecturer's courses
  const lecturerSessionIds = new Set(lecturerSessions.map((s) => s.id));
  const corrections = custechDb
    .getCorrections()
    .filter((c) => c.status === 'PENDING' && lecturerSessionIds.has(c.sessionId));
  const collisionAlerts = custechDb
    .getDeviceCollisionAlerts()
    .filter((a) => lecturerSessionIds.has(a.sessionId));
  const unreviewedAlertsCount = collisionAlerts.filter((a) => !a.isReviewed).length;

  const enrolledStudents = activeSession
    ? custechDb.getEnrolledStudentsForOffering(activeSession.courseOfferingId)
    : selectedOffering
    ? custechDb.getEnrolledStudentsForOffering(selectedOffering.id)
    : [];
  const sessionRecords = activeSession ? custechDb.getRecordsForSession(activeSession.id) : [];

  // Syllabus topics strictly for the selected course
  const syllabusTopics: SyllabusTopic[] = selectedCourse
    ? (custechDb.getSyllabusForCourse(selectedCourse.id).length > 0
        ? custechDb.getSyllabusForCourse(selectedCourse.id)
        : syllabusOverride[selectedCourse.id] || [])
    : [];
  const completedTopicsCount = syllabusTopics.filter((t) => t.isCompleted).length;
  const syllabusPercent =
    syllabusTopics.length > 0
      ? Math.round((completedTopicsCount / syllabusTopics.length) * 100)
      : 0;

  // Filtered assigned courses for selector
  const filteredOfferings = offerings.filter((o) => {
    const q = courseSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      o.course?.code?.toLowerCase().includes(q) ||
      o.course?.title?.toLowerCase().includes(q)
    );
  });

  const handleSelectOffering = (offeringId: string) => {
    setSelectedOfferingId(offeringId);
    setSelectedSessionId(null);
    setIsAddingTopic(false);
  };

  // Open Start Session Modal (only for assigned courses)
  const handleOpenStartModal = (
    offering: CourseOffering & { course?: Course; primaryLecturer?: UserProfile }
  ) => {
    if (!assignedOfferingIds.has(offering.id)) {
      alert('Unauthorized: You can only start attendance for courses assigned to you.');
      return;
    }
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
        custechDb.upsertClientSession(res.session);
        setSelectedOfferingId(startModalOffering.offering.id);
        setSelectedSessionId(res.session.id);
        setRefreshTrigger((prev) => prev + 1);
        setStartModalOffering(null);
        setActionSuccessMsg(
          `Week ${startWeekNumber} attendance session started for ${startModalOffering.offering.course?.code}.`
        );
        setTimeout(() => setActionSuccessMsg(null), 4000);
        void syncFromServer();
      } else {
        alert(res.error || 'Failed to start lecture session');
      }
    } catch {
      alert('Error initiating attendance session');
    } finally {
      setIsStartingSession(false);
    }
  };

  const handleResolveCorrection = async (
    correctionId: string,
    status: 'APPROVED' | 'REJECTED'
  ) => {
    try {
      await reviewAttendanceCorrection(correctionId, user.id, status, 'Reviewed by lecturer');
      await syncFromServer();
      setActionSuccessMsg(`Correction request ${status.toLowerCase()}.`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch {
      alert('Error reviewing correction');
    }
  };

  const handleToggleSyllabus = async (topicId: string, currentVal: boolean) => {
    try {
      setIsSavingSyllabus(true);
      const updated = await toggleSyllabusStatus(topicId, !currentVal, user.id);
      if (selectedCourse) {
        setSyllabusOverride((prev) => ({
          ...prev,
          [selectedCourse.id]: (prev[selectedCourse.id] || syllabusTopics).map((t) =>
            t.id === topicId ? updated : t
          ),
        }));
      }
      await syncFromServer();
    } catch {
      alert('Error updating syllabus progress');
    } finally {
      setIsSavingSyllabus(false);
    }
  };

  const handleAddSyllabusTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse || !newTopicTitle.trim()) return;
    try {
      setIsSavingSyllabus(true);
      const res = await addSyllabusTopicAction({
        courseId: selectedCourse.id,
        weekNumber: newTopicWeek,
        topicTitle: newTopicTitle.trim(),
        learningObjectives: newTopicObj.trim(),
      });
      if (res.success && res.topic) {
        setSyllabusOverride((prev) => ({
          ...prev,
          [selectedCourse.id]: [...(prev[selectedCourse.id] || syllabusTopics), res.topic!],
        }));
        setNewTopicTitle('');
        setNewTopicObj('');
        setNewTopicWeek((w) => w + 1);
        setIsAddingTopic(false);
        await syncFromServer();
      } else {
        alert(res.error || 'Failed to add syllabus topic');
      }
    } finally {
      setIsSavingSyllabus(false);
    }
  };

  const selectedTimetable = selectedOffering
    ? timetableEntries.find((t) => t.courseOfferingId === selectedOffering.id)
    : undefined;
  const selectedSessionsCount = selectedOffering
    ? custechDb.getSessionsForOffering(selectedOffering.id).length
    : 0;
  const selectedEnrolledCount = selectedOffering
    ? custechDb.getEnrolledStudentsForOffering(selectedOffering.id).length
    : 0;

  const userDept = custechDb.getDepartments().find((d) => d.id === user.departmentId);
  const userFaculty = custechDb
    .getFaculties()
    .find((f) => f.id === user.facultyId || f.id === userDept?.facultyId);

  return (
    <div className="space-y-6">
      {/* Lecturer Greeting Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              {userFaculty?.name || 'Academic Faculty'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">
              First Semester 2026/2027
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Welcome, {user.firstName.startsWith('Dr.') || user.firstName.startsWith('Prof.') ? '' : 'Dr. '}
            {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select your active course to manage attendance, project rotating QR codes, and track syllabus delivery.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setIsFraudOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition shadow-sm flex-1 sm:flex-none"
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
            type="button"
            onClick={() => setIsMedicalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold border border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 transition shadow-sm flex-1 sm:flex-none"
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Clinic Waivers</span>
          </button>

          {activeSession && (
            <button
              type="button"
              onClick={() => setIsKioskOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold bg-[#8d4a27] hover:bg-[#743c22] text-white shadow-sm transition flex-1 sm:flex-none"
            >
              <span>Launch Kiosk</span>
            </button>
          )}
        </div>
      </div>

      {/* Dashboard Overview KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Assigned Courses</span>
            <Layers className="w-4 h-4 text-[#8d4a27]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {offerings.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Active this semester</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Live Sessions</span>
            <Radio className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1.5">
            {lecturerActiveSessions.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Currently accepting scans</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Scheduled Lectures</span>
            <Calendar className="w-4 h-4 text-[#8d4a27]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {timetableEntries.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Weekly timetable slots</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Pending Corrections</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-1.5">
            {corrections.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Student dispute requests</p>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 bg-[#8d4a27] text-white text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn shadow-sm">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* MAIN BALANCED 2-COLUMN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Course Selector, Selected Course Details, Live QR Console, Syllabus Progress */}
        <div className="lg:col-span-7 space-y-6">
          {/* COURSE SELECTION INTERFACE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#8d4a27]" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Select Course Currently Teaching
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {offerings.length} Assigned Course{offerings.length !== 1 ? 's' : ''}
              </span>
            </div>

            {offerings.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No courses are currently assigned to your lecturer profile. Please contact your HOD or Administrator.
              </div>
            ) : (
              <>
                {/* Searchable Dropdown Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="relative sm:col-span-5">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Filter courses (e.g. CSC 201)..."
                      className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-[#8d4a27] outline-none"
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <select
                      value={selectedOffering?.id || ''}
                      onChange={(e) => handleSelectOffering(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-xl focus:border-[#8d4a27] outline-none text-slate-900"
                    >
                      {filteredOfferings.length === 0 ? (
                        <option value="">No assigned courses match &ldquo;{courseSearch}&rdquo;</option>
                      ) : (
                        filteredOfferings.map((off) => {
                          const isLive = lecturerActiveSessions.some(
                            (s) => s.courseOfferingId === off.id
                          );
                          return (
                            <option key={off.id} value={off.id}>
                              {isLive ? '● [LIVE] ' : ''}
                              {off.course?.code} — {off.course?.title} ({off.course?.level}L)
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>
                </div>

                {/* Compact Quick-Pick Course Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {filteredOfferings.slice(0, 14).map((off) => {
                    const isSelected = off.id === selectedOffering?.id;
                    const isLive = lecturerActiveSessions.some(
                      (s) => s.courseOfferingId === off.id
                    );
                    return (
                      <button
                        key={off.id}
                        type="button"
                        onClick={() => handleSelectOffering(off.id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition flex items-center gap-1.5 shrink-0 border ${
                          isSelected
                            ? 'bg-[#8d4a27] text-white border-[#8d4a27] shadow-xs'
                            : isLive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isLive && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? 'bg-emerald-300' : 'bg-emerald-600'
                            } animate-pulse`}
                          />
                        )}
                        <span>{off.course?.code}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Course Details Card */}
                {selectedOffering && selectedCourse && (
                  <div className="p-4 rounded-2xl bg-[#fbf5ef] border border-[#ecdacb] space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-lg font-black text-slate-900">
                            {selectedCourse.code}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-[#8d4a27] border border-[#ecdacb]">
                            {selectedCourse.creditUnits || 2} Units
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                            {selectedCourse.level} Level
                          </span>
                          {selectedCourseLiveSession && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                              ● LIVE SESSION
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 mt-1">
                          {selectedCourse.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => setHistoryModalOffering({ offering: selectedOffering })}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shrink-0 self-start"
                      >
                        <History className="w-3.5 h-3.5 text-[#8d4a27]" />
                        <span>History ({selectedSessionsCount})</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#ecdacb]/70 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Users className="w-3.5 h-3.5 text-[#8d4a27] shrink-0" />
                        <span>
                          <strong>{selectedEnrolledCount}</strong> Registered
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-[#8d4a27] shrink-0" />
                        <span className="truncate">
                          {selectedTimetable
                            ? `${DAY_NAMES[selectedTimetable.dayOfWeek]}, ${selectedTimetable.startTime}–${selectedTimetable.endTime}`
                            : 'Schedule TBD'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-[#8d4a27] shrink-0" />
                        <span className="truncate">
                          {selectedTimetable?.venue ||
                            selectedTimetable?.classroom?.code ||
                            selectedCourseDept?.name ||
                            'Lecture Hall'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {selectedCourseLiveSession ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedSessionId(selectedCourseLiveSession.id)}
                            className="flex-1 min-w-[170px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>
                              {activeSession?.id === selectedCourseLiveSession.id
                                ? 'Managing Live Attendance Below'
                                : 'Resume Live Attendance Session'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenStartModal(selectedOffering)}
                            className="py-2.5 px-4 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Start New Session</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenStartModal(selectedOffering)}
                          className="flex-1 min-w-[180px] py-2.5 px-4 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Attendance for {selectedCourse.code}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ACTIVE ATTENDANCE CONSOLE (QR GENERATOR & SESSION CONTROLS) */}
          {activeSession && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      activeSession.status === 'ACTIVE'
                        ? 'bg-emerald-500 animate-ping'
                        : 'bg-amber-500'
                    }`}
                  />
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Attendance Console — {activeCourse?.code} (Week {activeSession.weekNumber || 1})
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Venue: {activeSession.venue || 'LH 101'}
                </span>
              </div>

              <DynamicQrDisplay
                session={activeSession}
                courseCode={activeCourse?.code || 'COURSE'}
                courseTitle={activeCourse?.title || 'Lecture Session'}
                creditUnits={activeCourse?.creditUnits || 2}
                lecturerName={`${user.firstName} ${user.lastName}`}
                departmentName={activeDept?.name || 'Academic Department'}
                academicLevel={activeCourse?.level ? `${activeCourse.level}L` : '200L'}
                classroomCode={activeSession.venue || 'LH 101'}
                venue={activeSession.venue || 'LH 101'}
                weekNumber={activeSession.weekNumber || 1}
                lecturerId={user.id}
                onOpenKiosk={() => setIsKioskOpen(true)}
                onSessionUpdate={(updated) => {
                  custechDb.upsertClientSession(updated);
                  if (updated.status === 'CLOSED' || updated.status === 'CANCELLED') {
                    setSelectedSessionId(null);
                  } else {
                    setSelectedSessionId(updated.id);
                  }
                  setRefreshTrigger((prev) => prev + 1);
                  void syncFromServer();
                }}
              />
            </div>
          )}

          {/* COURSE DELIVERY & SYLLABUS PROGRESS (BOUND TO SELECTED COURSE) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#8d4a27]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Course Delivery &amp; Syllabus Progress
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {selectedCourse
                      ? `${selectedCourse.code} — ${selectedCourse.title}`
                      : 'Select an assigned course'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                  {completedTopicsCount}/{syllabusTopics.length} Taught ({syllabusPercent}%)
                </span>
                {selectedCourse && (
                  <button
                    type="button"
                    onClick={() => setIsAddingTopic(!isAddingTopic)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Topic</span>
                  </button>
                )}
              </div>
            </div>

            {/* Syllabus Progress Bar */}
            {syllabusTopics.length > 0 && (
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-[#8d4a27] rounded-full transition-all duration-300"
                  style={{ width: `${syllabusPercent}%` }}
                />
              </div>
            )}

            {/* Add Syllabus Topic Form */}
            {isAddingTopic && selectedCourse && (
              <form
                onSubmit={handleAddSyllabusTopic}
                className="mb-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Week
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={16}
                      value={newTopicWeek}
                      onChange={(e) => setNewTopicWeek(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Topic Title
                    </label>
                    <input
                      type="text"
                      required
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                      placeholder="e.g. Graph Traversal Algorithms"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    value={newTopicObj}
                    onChange={(e) => setNewTopicObj(e.target.value)}
                    placeholder="Learning objectives (optional)"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingTopic(false)}
                    className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSyllabus}
                    className="px-3 py-1.5 rounded-lg bg-[#8d4a27] text-white font-bold hover:bg-[#743c22]"
                  >
                    Save Topic
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2.5">
              {syllabusTopics.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Loading syllabus outline for {selectedCourse?.code || 'selected course'}...
                </p>
              ) : (
                syllabusTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="p-3.5 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="text-xs min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-[#8d4a27]">
                          Week {topic.weekNumber}:
                        </span>
                        <span className="font-semibold text-slate-800 break-words">
                          {topic.topicTitle}
                        </span>
                      </div>
                      {topic.learningObjectives && (
                        <p className="text-xs text-slate-500 mt-1 break-words">
                          {topic.learningObjectives}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isSavingSyllabus}
                      onClick={() => void handleToggleSyllabus(topic.id, !!topic.isCompleted)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition self-start sm:self-center ${
                        topic.isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {topic.isCompleted ? '✓ Taught' : 'Mark Taught'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Live Monitor, Weekly Lecture Schedule, Recent Activities & Corrections */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Attendance Counter when a session is active/selected */}
          {activeSession && (
            <LiveCounter
              records={sessionRecords}
              totalEnrolled={enrolledStudents.length || 1}
            />
          )}

          {/* Weekly Lecture Schedule */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#8d4a27]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Weekly Lecture Schedule
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {timetableEntries.length} slot{timetableEntries.length !== 1 ? 's' : ''}
              </span>
            </div>

            {timetableEntries.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No timetable slots configured yet for your assigned courses.
              </p>
            ) : (
              <div className="space-y-2">
                {timetableEntries.map((tt) => {
                  const isSelected = tt.courseOfferingId === selectedOffering?.id;
                  return (
                    <button
                      key={tt.id}
                      type="button"
                      onClick={() => handleSelectOffering(tt.courseOfferingId)}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#fbf5ef] border-[#8d4a27]'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="font-black text-xs text-slate-900 block">
                          {tt.courseOffering?.course?.code} — {tt.courseOffering?.course?.title}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 block">
                          {DAY_NAMES[tt.dayOfWeek]}, {tt.startTime} – {tt.endTime} •{' '}
                          {tt.venue || tt.classroom?.code || 'Lecture Hall'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-[#8d4a27] shrink-0">
                        Select
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Attendance Activities */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#8d4a27]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Recent Attendance Activities
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {lecturerSessions.length} total
              </span>
            </div>

            {lecturerSessions.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No lecture sessions started yet.
              </p>
            ) : (
              <div className="space-y-2">
                {lecturerSessions.slice(0, 5).map((sess) => {
                  const recs = custechDb.getRecordsForSession(sess.id);
                  return (
                    <button
                      key={sess.id}
                      type="button"
                      onClick={() => {
                        setSelectedOfferingId(sess.courseOfferingId);
                        setSelectedSessionId(sess.id);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">
                            {sess.courseOffering?.course?.code || 'COURSE'}
                          </span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500">Wk {sess.weekNumber || 1}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {formatDate(sess.date)} • {recs.length} marked
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                          sess.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : sess.status === 'PAUSED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {sess.status}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Attendance Corrections */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
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
              <div className="py-8 text-center text-slate-400 text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <span>No outstanding attendance disputes for your courses.</span>
              </div>
            ) : (
              <div className="space-y-3">
                {corrections.map((c) => {
                  const s = custechDb.getStudentById(c.studentId);
                  return (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-slate-800">
                          {s?.matricNumber} • {s?.profile?.firstName} {s?.profile?.lastName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200">
                        &ldquo;{c.reason}&rdquo;
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void handleResolveCorrection(c.id, 'REJECTED')}
                          className="px-2.5 py-1 rounded text-xs font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 transition"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleResolveCorrection(c.id, 'APPROVED')}
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
      </div>

      {/* KIOSK MODAL FOR LECTURER */}
      {isKioskOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <KioskTerminal
              sessionId={activeSession.id}
              courseCode={activeCourse?.code || 'COURSE'}
              courseTitle={activeCourse?.title || 'Lecture Session'}
              operatorProfileId={user.id}
              operatorName={`${user.firstName} ${user.lastName}`}
              operatorRoleTitle="Course Lecturer"
              onClose={() => setIsKioskOpen(false)}
              onSuccess={() => {
                void syncFromServer();
              }}
            />
          </div>
        </div>
      )}

      {/* START ATTENDANCE CONFIRMATION MODAL */}
      {startModalOffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-6">
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
                type="button"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* ATTENDANCE HISTORY MODAL */}
      {historyModalOffering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col p-5 sm:p-6">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[#8d4a27] uppercase tracking-wider">
                  Weekly Attendance History
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                  {historyModalOffering.offering.course?.code} —{' '}
                  {historyModalOffering.offering.course?.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOffering(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {(() => {
                const sessions = custechDb.getSessionsForOffering(
                  historyModalOffering.offering.id
                );
                if (sessions.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      <span>
                        No lecture attendance sessions recorded yet for this course.
                      </span>
                    </div>
                  );
                }

                return sessions.map((sess) => {
                  const records = custechDb.getRecordsForSession(sess.id);
                  const isExpanded = expandedSessionId === sess.id;
                  const enrolled = custechDb.getEnrolledStudentsForOffering(
                    sess.courseOfferingId
                  );
                  const totalPossible = enrolled.length || 1;
                  const pct = Math.min(100, Math.round((records.length / totalPossible) * 100));

                  return (
                    <div
                      key={sess.id}
                      className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
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
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span>
                              Venue:{' '}
                              <strong className="text-slate-600">
                                {sess.venue || 'LH 101'}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Code:{' '}
                              <strong className="text-slate-600 font-mono">
                                {sess.currentTempCode}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-extrabold text-slate-900 block">
                              {records.length} / {totalPossible} Present
                            </span>
                            <span className="text-[11px] font-bold text-[#8d4a27]">
                              {pct}% Attendance
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSessionId(isExpanded ? null : sess.id)
                            }
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

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            Verified Attendees ({records.length})
                          </span>
                          {records.length === 0 ? (
                            <span className="text-xs text-slate-400 italic">
                              No attendance records submitted for this session.
                            </span>
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
                                      {r.student?.profile?.firstName}{' '}
                                      {r.student?.profile?.lastName}
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
                type="button"
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
          alerts={collisionAlerts}
          reviewerId={user.id}
          onClose={() => setIsFraudOpen(false)}
          onUpdate={() => {
            void syncFromServer();
          }}
        />
      )}
      {isMedicalOpen && (
        <MedicalWaiverModal
          reviewerProfileId={user.id}
          onClose={() => setIsMedicalOpen(false)}
          onSuccess={() => {
            void syncFromServer();
          }}
        />
      )}
    </div>
  );
};
