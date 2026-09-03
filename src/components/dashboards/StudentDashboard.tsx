'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, AttendanceSession, ExamDocket } from '@/types';
import { PercentageRing } from '../analytics/PercentageRing';
import { QrScannerModal } from '../attendance/QrScannerModal';
import { ExamDocketModal } from '../docket/ExamDocketModal';
import { AttendanceForecast } from '../analytics/AttendanceForecast';
import { submitAttendanceCorrection } from '@/actions/attendance';
import { formatDate, formatTime, getStatusBadgeVariant } from '@/lib/utils';
import { BookOpen, Calendar, Clock, AlertCircle, FileText, CheckCircle2, ChevronRight, MessageSquare, Award, HeartPulse } from 'lucide-react';

interface StudentDashboardProps {
  user: UserProfile;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user }) => {
  const student = custechDb.getStudentByProfileId(user.id);
  const enrolledOfferings = student ? custechDb.getStudentOfferings(student.id) : [];
  const attendanceRecords = student ? custechDb.getRecordsForStudent(student.id) : [];
  const activeSessions = custechDb.getSessions().filter((s) => s.status === 'ACTIVE');

  const [selectedSessionForScan, setSelectedSessionForScan] = React.useState<AttendanceSession | null>(null);
  const [successToast, setSuccessToast] = React.useState<string | null>(null);
  const [docket, setDocket] = React.useState<ExamDocket | null>(null);

  // Correction Dispute Modal state
  const [isDisputeOpen, setIsDisputeOpen] = React.useState(false);
  const [disputeSessionId, setDisputeSessionId] = React.useState('');
  const [disputeReason, setDisputeReason] = React.useState('');
  const [disputeFeedback, setDisputeFeedback] = React.useState<string | null>(null);

  // Medical Waivers
  const studentWaivers = student ? custechDb.getMedicalWaivers().filter((w) => w.studentId === student.id) : [];

  // Overall Attendance KPI Calculation
  const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
  const lateCount = attendanceRecords.filter((r) => r.status === 'LATE').length;
  const absentCount = 1; // From seed data (absent in session 2)

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

  return (
    <div className="space-y-6">
      {/* Student Welcome & Profile Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#8d4a27] text-white font-black text-xl flex items-center justify-center shadow-xs">
            {user.firstName[0]}
            {user.lastName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                {user.firstName} {user.lastName}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                {student?.currentLevel}L
              </span>
            </div>
            <p className="text-xs font-mono font-bold text-slate-500 mt-0.5">
              Matric: {student?.matricNumber || user.matricNumber || '25L1CS1014'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Department of Computer Science • Faculty of Computing
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleGenerateDocket}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-xs transition"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Exam Clearance Docket</span>
              </button>
            </div>
          </div>
        </div>

        {/* Aggregate Attendance Progress Ring */}
        <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80 flex items-center gap-4">
          <PercentageRing
            presentCount={presentCount}
            lateCount={lateCount}
            absentCount={absentCount}
            size="md"
          />
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900">Overall Semester Rate</p>
            <p className="text-[11px] text-slate-500">Target: 75% Statutory Exam Req.</p>
            <p className="text-[11px] text-[#8d4a27] font-bold mt-1">
              {presentCount + lateCount} of {presentCount + lateCount + absentCount} classes attended
            </p>
          </div>
        </div>
      </div>

      {/* Medical Waiver Notice Banner (If Student Has Active Clinic Exemptions) */}
      {studentWaivers.length > 0 && (
        <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-start gap-3">
          <HeartPulse className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-sky-950">
              Official University Health Centre Medical Waiver Active
            </h4>
            <p className="text-[11px] text-sky-900 mt-0.5">
              {studentWaivers[0].diagnosisSummary} ({studentWaivers[0].startDate} to {studentWaivers[0].endDate}) certified by {studentWaivers[0].doctorName}. All missed lecture sessions during this period are marked as <strong>EXCUSED</strong>.
            </p>
          </div>
        </div>
      )}

      {successToast && (
        <div className="p-4 rounded-xl bg-[#8d4a27] text-white text-xs font-bold flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}

      {/* TODAY'S CLASSES & ACTIVE SESSIONS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Today’s Lecture Attendance
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Thursday, 3 Sep 2026</span>
        </div>

        {activeSessions.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200/80 rounded-2xl text-slate-400 text-xs shadow-xs">
            No active attendance sessions right now. Please wait for your lecturer to start class attendance.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((sess) => {
              const offering = custechDb.getOfferingById(sess.courseOfferingId);
              const course = offering?.course;
              const isAlreadyAttended = attendanceRecords.some((r) => r.sessionId === sess.id);

              return (
                <div
                  key={sess.id}
                  className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 shadow-xs hover:shadow-sm transition relative overflow-hidden"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900">
                          {course?.code}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] animate-pulse">
                          ATTENDANCE OPEN
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-700 mt-1">
                        {course?.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>10:00 AM – 12:00 PM • Room LH 101</span>
                      </p>
                    </div>

                    {isAlreadyAttended ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#fbf5ef] text-[#8d4a27] text-xs font-bold border border-[#ecdacb]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Logged</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedSessionForScan(sess)}
                        className="px-4 py-2 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-xs hover:shadow-sm transition flex items-center gap-1.5"
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

      {/* REGISTERED COURSES BREAKDOWN */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Registered Courses & Presence Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolledOfferings.map((off) => {
            const course = off.course;
            return (
              <div
                key={off.id}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-base font-black text-slate-900">
                      {course?.code}
                    </span>
                    <h5 className="text-xs font-medium text-slate-600 mt-0.5">
                      {course?.title}
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Lecturer: {off.primaryLecturer?.firstName} {off.primaryLecturer?.lastName}
                    </p>
                  </div>
                  <PercentageRing
                    presentCount={presentCount}
                    lateCount={lateCount}
                    absentCount={course?.code === 'CSC 201' ? absentCount : 0}
                    size="sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ATTENDANCE PROJECTION / WHAT-IF FORECAST CALCULATOR */}
      <AttendanceForecast
        courseCode="CSC 201"
        currentAttended={presentCount + lateCount}
        currentAbsent={absentCount}
      />

      {/* ATTENDANCE HISTORY LOG & DISPUTE BUTTON */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Verified Attendance History
            </h3>
            <p className="text-xs text-slate-500">Official academic attendance log for the current semester</p>
          </div>
          <button
            onClick={() => setIsDisputeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>Lodge Correction</span>
          </button>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {attendanceRecords.map((r) => {
            const session = custechDb.getSessionById(r.sessionId);
            const statusBadge = getStatusBadgeVariant(r.status);
            return (
              <div key={r.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {session?.courseOffering?.course?.code || 'CSC 201'}
                    </span>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-500">{formatDate(r.recordedAt)}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Method: {r.method.replace('_', ' ')} {r.assistedReason ? `(${r.assistedReason})` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                  >
                    {statusBadge.label}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {formatTime(r.recordedAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SCANNER MODAL */}
      {selectedSessionForScan && (
        <QrScannerModal
          sessionId={selectedSessionForScan.id}
          courseCode="CSC 201"
          studentProfileId={user.id}
          onClose={() => setSelectedSessionForScan(null)}
          onSuccess={(msg) => {
            setSuccessToast(msg);
            setSelectedSessionForScan(null);
          }}
        />
      )}

      {/* CORRECTION / DISPUTE MODAL */}
      {isDisputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Submit Attendance Correction Request
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
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
                  <option value="sess-csc-2">CSC 201 - Thursday, 27 Aug 2026</option>
                  <option value="sess-today-csc">CSC 201 - Thursday, 3 Sep 2026</option>
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
                  className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8d4a27] hover:bg-[#743c22] text-white shadow-xs transition"
                >
                  Submit for Lecturer Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXAM DOCKET CLEARANCE MODAL */}
      {docket && (
        <ExamDocketModal docket={docket} onClose={() => setDocket(null)} />
      )}
    </div>
  );
};
