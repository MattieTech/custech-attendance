'use client';

import React from 'react';
import { UserProfile } from '@/types';
import { custechDb } from '@/lib/db/repository';
import { KioskTerminal } from '../attendance/KioskTerminal';
import {
  Users,
  ShieldCheck,
  QrCode,
  CheckCircle2,
} from 'lucide-react';

interface AssistantRepDashboardProps {
  user: UserProfile;
}

export const AssistantRepDashboard: React.FC<AssistantRepDashboardProps> = ({ user }) => {
  const [showKiosk, setShowKiosk] = React.useState(false);
  const [coSignedSessions, setCoSignedSessions] = React.useState<string[]>([]);
  const activeSession =
    custechDb.getSessions().find((s) => s.status === 'ACTIVE') ||
    custechDb.getSessionById('sess-today-csc');
  const activeCourse = activeSession
    ? custechDb.getOfferingById(activeSession.courseOfferingId)?.course
    : custechDb.getCourses().find((c) => c.code === 'CSC 201');
  const allStudents = custechDb.getAllStudentsDetailed();

  const handleCoSign = (sessionId: string) => {
    if (!coSignedSessions.includes(sessionId)) {
      setCoSignedSessions([...coSignedSessions, sessionId]);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Assistant Rep Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
              Assistant Course Representative
            </span>
            <span className="text-xs font-mono text-slate-400">
              {user.matricNumber}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {user.firstName} {user.lastName} • Class Co-Management Console
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Department of Computer Science • 200 Level • CSC 201 Class Roster & Assisted Station
          </p>
        </div>

        <button
          onClick={() => setShowKiosk(!showKiosk)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-sm transition shrink-0"
        >
          <QrCode className="w-4 h-4" />
          <span>{showKiosk ? 'Close Kiosk Terminal' : 'Launch Delegated Assisted Kiosk'}</span>
        </button>
      </div>

      {/* Assistant Rep Co-Signing Alert */}
      <div className="bg-[#fbf5ef] border border-[#ecdacb] rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#8d4a27] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900">
              Session Co-Signing Authority (Dual Representative Protocol)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              When the primary Course Representative is unavailable or handling overflow halls, you can verify and co-sign ongoing sessions with the course lecturer.
            </p>
          </div>
        </div>

        <button
          onClick={() => handleCoSign('sess-csc-today')}
          disabled={coSignedSessions.includes('sess-csc-today')}
          className={`px-4 py-2.5 rounded-lg text-xs font-bold transition shrink-0 ${
            coSignedSessions.includes('sess-csc-today')
              ? 'bg-white text-slate-500 border border-slate-200 cursor-not-allowed'
              : 'bg-[#8d4a27] text-white hover:bg-[#743c22] shadow-sm'
          }`}
        >
          {coSignedSessions.includes('sess-csc-today') ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#8d4a27]" />
              Co-Signed as Assistant Rep
            </span>
          ) : (
            'Co-Sign Today’s Lecture (CSC 201)'
          )}
        </button>
      </div>

      {/* In-Class Assisted Kiosk (Delegated Station) */}
      {showKiosk && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Delegated In-Class Assisted Kiosk Terminal
              </h3>
              <p className="text-xs text-slate-500">
                Assist classmates without functional smartphones to log attendance securely using Matric No + 4-digit PIN.
              </p>
            </div>
          </div>
          <KioskTerminal
            sessionId={activeSession?.id || 'sess-today-csc'}
            courseCode={activeCourse?.code || 'CSC 201'}
            courseTitle={activeCourse?.title || 'Data Structures and Algorithms'}
            operatorProfileId={user.id}
            operatorName={`${user.firstName} ${user.lastName}`}
            operatorRoleTitle="Assistant Course Representative"
            onClose={() => setShowKiosk(false)}
          />
        </div>
      )}

      {/* Class Overview Roster */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900">
              Enrolled Classmates in {activeCourse?.code || 'CSC 201'} ({activeCourse?.title || 'Data Structures and Algorithms'})
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Classmates: {allStudents.length} Students
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Matriculation No</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Level / Program</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Station Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allStudents.map((st) => {
                const p = st.profile;
                const isSelf = st.profileId === user.id;
                return (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {st.matricNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {p ? `${p.firstName} ${p.lastName}` : 'Student'}
                      {isSelf && (
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-xs font-bold">
                          You (Asst Rep)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{st.currentLevel}L • {st.departmentName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                        {p?.primaryRole || 'STUDENT'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500">
                      Eligible for Kiosk
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
