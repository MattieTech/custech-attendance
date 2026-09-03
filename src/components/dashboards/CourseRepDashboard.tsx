'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile } from '@/types';
import { KioskTerminal } from '../attendance/KioskTerminal';
import { Users, PhoneOff, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CourseRepDashboardProps {
  user: UserProfile;
}

export const CourseRepDashboard: React.FC<CourseRepDashboardProps> = ({ user }) => {
  const [isKioskActive, setIsKioskActive] = React.useState(false);
  const [coSignDone, setCoSignDone] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  const activeSession = custechDb.getSessionById('sess-today-csc');
  const enrolledStudents = custechDb.getEnrolledStudentsForOffering('offering-csc201');
  const records = activeSession ? custechDb.getRecordsForSession(activeSession.id) : [];

  const handleCoSign = () => {
    custechDb.logAudit({
      actorId: user.id,
      actorName: `${user.firstName} ${user.lastName} (Course Rep)`,
      actorRole: 'COURSE_REP',
      action: 'COURSE_REP_CO_SIGNED_SESSION',
      entityType: 'attendance_sessions',
      entityId: activeSession?.id,
      details: {
        note: 'Course Rep confirmed physical class taking place in Room LH 101 with Dr. John Doe.',
      },
    });
    setCoSignDone(true);
  };

  return (
    <div className="space-y-6">
      {/* Course Rep Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Department of Computer Science • 200 Level
            </span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            Course Rep Terminal: {user.firstName} {user.lastName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Appointed Course Representative for CSC 201. Authorized to operate the Assisted Attendance Kiosk for students without smartphones.
          </p>
        </div>

        <button
          onClick={() => setIsKioskActive(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs shadow-xs transition"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Launch In-Class Assisted Kiosk</span>
        </button>
      </div>

      {/* CO-SIGNING BANNER */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-amber-950">
              Session Verification & Co-Signing
            </h4>
            <p className="text-[11px] text-amber-900">
              Confirm physical lecture commencement for CSC 201 (Room LH 101, Dr. John Doe).
            </p>
          </div>
        </div>

        {coSignDone ? (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8d4a27] text-white text-xs font-bold shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>Co-Signed</span>
          </span>
        ) : (
          <button
            onClick={handleCoSign}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
          >
            Confirm Class Held
          </button>
        )}
      </div>

      {/* CLASS ROSTER & TODAY'S ASSISTANCE OVERVIEW */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Assigned Class Roster (CSC 201 - 200 Level)
            </h3>
            <p className="text-xs text-slate-500">
              {records.length} of {enrolledStudents.length} students logged in current lecture
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {enrolledStudents.map((st) => {
            const hasAttended = records.some((r) => r.studentId === st.id);
            const record = records.find((r) => r.studentId === st.id);

            return (
              <div key={st.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {st.profile?.firstName} {st.profile?.lastName}
                  </p>
                  <p className="text-[11px] font-mono text-zinc-400">
                    {st.matricNumber}
                  </p>
                </div>

                <div>
                  {hasAttended ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                      Logged ({record?.method.replace('_', ' ')})
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      Not Yet Logged
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KIOSK MODAL */}
      {isKioskActive && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-xl">
            <KioskTerminal
              sessionId={activeSession.id}
              courseCode="CSC 201"
              courseTitle="Data Structures and Algorithms"
              operatorProfileId={user.id}
              operatorName={`${user.firstName} ${user.lastName}`}
              operatorRoleTitle="Course Representative"
              onClose={() => setIsKioskActive(false)}
              onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
