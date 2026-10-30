'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, AttendanceSession } from '@/types';
import { DynamicQrDisplay } from '../attendance/DynamicQrDisplay';
import { KioskTerminal } from '../attendance/KioskTerminal';
import { LiveCounter } from '../attendance/LiveCounter';
import { FraudMonitoringModal } from '../fraud/FraudMonitoringModal';
import { MedicalWaiverModal } from '../medical/MedicalWaiverModal';
import { startAttendanceSession, reviewAttendanceCorrection } from '@/actions/attendance';
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
} from 'lucide-react';

interface LecturerDashboardProps {
  user: UserProfile;
}

export const LecturerDashboard: React.FC<LecturerDashboardProps> = ({ user }) => {
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const offerings = custechDb.getLecturerOfferings(user.id);
  const timetableEntries = custechDb.getTimetableEntries().filter((tt) =>
    offerings.some((o) => o.id === tt.courseOfferingId)
  );

  // Default to today's active session for CSC 201
  const todaySession = custechDb.getSessionById('sess-today-csc');
  const [activeSession, setActiveSession] = React.useState<AttendanceSession | undefined>(todaySession);
  const [isKioskOpen, setIsKioskOpen] = React.useState(false);
  const [isFraudOpen, setIsFraudOpen] = React.useState(false);
  const [isMedicalOpen, setIsMedicalOpen] = React.useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = React.useState<string | null>(null);

  const corrections = custechDb.getCorrections().filter((c) => c.status === 'PENDING');
  const syllabusTopics = custechDb.getSyllabusForCourse('course-csc201');
  const collisionAlerts = custechDb.getDeviceCollisionAlerts();
  const unreviewedAlertsCount = collisionAlerts.filter((a) => !a.isReviewed).length;

  // Enrolled count & session records
  const enrolledStudents = activeSession
    ? custechDb.getEnrolledStudentsForOffering(activeSession.courseOfferingId)
    : [];
  const sessionRecords = activeSession ? custechDb.getRecordsForSession(activeSession.id) : [];

  const handleStartSession = async (offeringId: string) => {
    try {
      const sess = await startAttendanceSession(offeringId, user.id);
      setActiveSession(sess);
      setRefreshTrigger((prev) => prev + 1);
      setActionSuccessMsg('Attendance session successfully started.');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch {
      alert('Error starting attendance session');
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
              Department of Computer Science
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">First Semester 2026/2027</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Welcome, Dr. {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            You have 2 scheduled lectures today. Manage live dynamic QR and assisted kiosk attendance.
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

          <button
            onClick={() => setIsKioskOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-bold bg-[#8d4a27] hover:bg-[#743c22] text-white shadow-sm transition"
          >
            <span>Launch Kiosk</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-3.5 bg-[#8d4a27] text-white text-xs font-bold rounded-xl flex items-center gap-2 animate-fadeIn shadow-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* TODAY'S TIMETABLE / CLASSES */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Today's Scheduled Classes
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Thursday Timetable</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {timetableEntries.map((tt) => {
            const offering = tt.courseOffering;
            const course = offering?.course;
            const isSessionActive = activeSession?.courseOfferingId === offering?.id && activeSession?.status === 'ACTIVE';

            return (
              <div
                key={tt.id}
                className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition ${
                  isSessionActive
                    ? 'border-amber-400 ring-2 ring-amber-400/20'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">
                        {course?.code}
                      </span>
                      {isSessionActive && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                          LIVE NOW
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-semibold text-slate-700 mt-1">
                      {course?.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tt.startTime} – {tt.endTime}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tt.classroom?.code}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    {isSessionActive ? (
                      <span className="px-3 py-1.5 rounded-lg bg-[#fbf5ef] text-[#8d4a27] text-xs font-bold border border-[#ecdacb]">
                        Session Active
                      </span>
                    ) : (
                      <button
                        onClick={() => offering && handleStartSession(offering.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start Attendance</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ACTIVE ATTENDANCE CONSOLE (DYNAMIC QR & LIVE COUNTER) */}
      {activeSession && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <DynamicQrDisplay
            session={activeSession}
            courseCode="CSC 201"
            courseTitle="Data Structures and Algorithms"
            classroomCode="LH 101"
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
      )}

      {/* KIOSK MODAL FOR LECTURER / REP */}
      {isKioskOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl">
            <KioskTerminal
              sessionId={activeSession.id}
              courseCode="CSC 201"
              courseTitle="Data Structures and Algorithms"
              operatorProfileId={user.id}
              operatorName={`Dr. ${user.firstName} ${user.lastName}`}
              operatorRoleTitle="Course Lecturer"
              onClose={() => setIsKioskOpen(false)}
              onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
            />
          </div>
        </div>
      )}

      {/* SYLLABUS / COURSE DELIVERY & PENDING DISPUTES */}
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
                Pending Correction Requests ({corrections.length})
              </h3>
            </div>
          </div>

          {corrections.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No pending attendance disputes requiring lecturer review.
            </div>
          ) : (
            <div className="space-y-3">
              {corrections.map((c) => {
                const studentName = c.student?.profile
                  ? `${c.student.profile.firstName} ${c.student.profile.lastName}`
                  : 'Student';
                const matric = c.student?.matricNumber || 'Matric';

                return (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {studentName} ({matric})
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 italic">
                      "{c.reason}"
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/60">
                      <button
                        onClick={() => handleResolveCorrection(c.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleResolveCorrection(c.id, 'APPROVED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#8d4a27] hover:bg-[#743c22] transition shadow-sm"
                      >
                        Approve & Mark Present
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FRAUD & ANTI-PROXY TELEMETRY MODAL */}
      {isFraudOpen && (
        <FraudMonitoringModal
          alerts={collisionAlerts}
          reviewerId={user.id}
          onClose={() => setIsFraudOpen(false)}
          onUpdate={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}

      {/* CLINICAL MEDICAL WAIVER MODAL */}
      {isMedicalOpen && (
        <MedicalWaiverModal
          reviewerProfileId={user.id}
          onClose={() => setIsMedicalOpen(false)}
          onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
        />
      )}
    </div>
  );
};
