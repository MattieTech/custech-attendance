'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile } from '@/types';
import { KioskTerminal } from '../attendance/KioskTerminal';
import { getDatabaseSnapshotAction } from '@/actions/academic';
import { PhoneOff, ShieldCheck, CheckCircle2, Search, UserCheck } from 'lucide-react';

interface CourseRepDashboardProps {
  user: UserProfile;
}

export const CourseRepDashboard: React.FC<CourseRepDashboardProps> = ({ user }) => {
  const [isKioskActive, setIsKioskActive] = React.useState(false);
  const [coSignDone, setCoSignDone] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [assistTargetMatric, setAssistTargetMatric] = React.useState<string | undefined>(undefined);

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

  void refreshTrigger;
  const activeSession =
    custechDb.getSessions().find((s) => s.status === 'ACTIVE') ||
    custechDb.getSessionById('sess-today-csc');
  const activeOfferingId = activeSession?.courseOfferingId || 'offering-csc201';
  const enrolledStudents = custechDb.getEnrolledStudentsForOffering(activeOfferingId);
  const records = activeSession ? custechDb.getRecordsForSession(activeSession.id) : [];

  const filteredStudents = enrolledStudents.filter((st) => {
    const q = searchQuery.toLowerCase();
    const name = `${st.profile?.firstName} ${st.profile?.lastName}`.toLowerCase();
    const matric = st.matricNumber.toLowerCase();
    return name.includes(q) || matric.includes(q);
  });

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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs shadow-sm transition"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Launch In-Class Assisted Kiosk</span>
        </button>
      </div>

      {/* CO-SIGNING BANNER */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-amber-950">
              Session Verification & Co-Signing
            </h4>
            <p className="text-xs text-amber-900">
              Confirm physical lecture commencement for CSC 201 (Room LH 101, Dr. John Doe).
            </p>
          </div>
        </div>

        {coSignDone ? (
          <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#8d4a27] text-white text-xs font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Co-Signed</span>
          </span>
        ) : (
          <button
            onClick={handleCoSign}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition"
          >
            Confirm Class Held
          </button>
        )}
      </div>

      {/* CLASS ROSTER & TODAY'S ASSISTANCE OVERVIEW */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Assigned Class Roster (CSC 201 - 200 Level)
            </h3>
            <p className="text-xs text-slate-500">
              {records.length} of {enrolledStudents.length} students logged in current lecture
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search classmate by name or matric..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No classmates matched your search.</p>
          ) : (
            filteredStudents.map((st) => {
              const hasAttended = records.some((r) => r.studentId === st.id);
              const record = records.find((r) => r.studentId === st.id);

              return (
                <div key={st.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {st.profile?.firstName} {st.profile?.lastName}
                    </p>
                    <p className="text-xs font-mono text-slate-500">
                      {st.matricNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasAttended ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                        Logged ({record?.method.replace('_', ' ')})
                      </span>
                    ) : (
                      <>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Not Yet Logged
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAssistTargetMatric(st.matricNumber);
                            setIsKioskActive(true);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#8d4a27] hover:bg-[#743c22] text-white rounded-lg text-[11px] font-bold shadow-xs transition"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>Assist</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* KIOSK MODAL */}
      {isKioskActive && activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl">
            <KioskTerminal
              sessionId={activeSession.id}
              courseCode={custechDb.getOfferingById(activeSession.courseOfferingId)?.course?.code || 'CSC 201'}
              courseTitle={custechDb.getOfferingById(activeSession.courseOfferingId)?.course?.title || 'Data Structures and Algorithms'}
              operatorProfileId={user.id}
              operatorName={`${user.firstName} ${user.lastName}`}
              operatorRoleTitle="Course Representative"
              initialMatric={assistTargetMatric}
              onClose={() => {
                setIsKioskActive(false);
                setAssistTargetMatric(undefined);
              }}
              onSuccess={() => {
                void syncFromServer();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
