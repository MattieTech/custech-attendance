'use client';

import React from 'react';
import { AttendanceRecord, Student, UserProfile } from '@/types';
import { formatTime, getStatusBadgeVariant } from '@/lib/utils';
import { Users, QrCode, Key, PhoneOff, CheckCircle2, Clock } from 'lucide-react';

interface LiveCounterProps {
  records: (AttendanceRecord & { student?: Student & { profile?: UserProfile } })[];
  totalEnrolled: number;
}

export const LiveCounter: React.FC<LiveCounterProps> = ({ records, totalEnrolled }) => {
  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;
  const assistedCount = records.filter((r) => r.method === 'KIOSK_PIN').length;
  const totalAttended = records.length;
  const attendanceRate = totalEnrolled > 0 ? Math.round((totalAttended / totalEnrolled) * 100) : 0;

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'DYNAMIC_QR':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
            <QrCode className="w-2.5 h-2.5" />
            <span>QR</span>
          </span>
        );
      case 'TEMP_CODE':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            <Key className="w-2.5 h-2.5" />
            <span>Code</span>
          </span>
        );
      case 'KIOSK_PIN':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <PhoneOff className="w-2.5 h-2.5" />
            <span>Kiosk</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-700">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#8d4a27]" />
          <h3 className="text-sm font-bold text-slate-900">
            Live Attendance Count
          </h3>
        </div>
        <div className="text-xs font-bold text-slate-600">
          {totalAttended} / {totalEnrolled} Enrolled ({attendanceRate}%)
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8d4a27]" />
            <span>Present</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {presentCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Late</span>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {lateCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-800">
            <PhoneOff className="w-3.5 h-3.5 text-purple-600" />
            <span>Assisted</span>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-1">
            {assistedCount}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="text-[11px] font-semibold text-slate-500">Absent / Pending</div>
          <p className="text-2xl font-black text-slate-700 mt-1">
            {Math.max(0, totalEnrolled - totalAttended)}
          </p>
        </div>
      </div>

      {/* Live Attendees Feed Table */}
      <div>
        <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
          Verified Student Roll ({records.length})
        </h4>

        {records.length === 0 ? (
          <div className="py-6 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            No students logged yet. Waiting for initial scans...
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl">
            {records.map((r) => {
              const studentName = r.student?.profile
                ? `${r.student.profile.firstName} ${r.student.profile.lastName}`
                : 'Student';
              const matric = r.student?.matricNumber || 'CUSTECH Student';
              const statusBadge = getStatusBadgeVariant(r.status);

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] flex items-center justify-center font-bold text-[10px] shrink-0">
                      {studentName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {studentName}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">{matric}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getMethodBadge(r.method)}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                    >
                      {statusBadge.label}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {formatTime(r.recordedAt)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
