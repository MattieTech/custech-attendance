'use client';

import React from 'react';
import { AttendanceRecord, Student, UserProfile } from '@/types';
import { formatTime, getStatusBadgeVariant } from '@/lib/utils';
import { Users, QrCode, Key, PhoneOff, CheckCircle2, Clock, Download, Printer } from 'lucide-react';

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

  const handleExportSessionCsv = () => {
    const headers = ['Matric Number', 'Student Name', 'Status', 'Method', 'Timestamp'];
    const rows = records.map((r) => {
      const name = r.student?.profile ? `${r.student.profile.firstName} ${r.student.profile.lastName}` : 'Student';
      const matric = r.student?.matricNumber || 'CUSTECH';
      return [matric, `"${name}"`, r.status, r.method, `"${new Date(r.recordedAt).toLocaleTimeString()}"`];
    });
    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CUSTECH_Lecture_Session_Attendance_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'DYNAMIC_QR':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
            <QrCode className="w-2.5 h-2.5" />
            <span>QR</span>
          </span>
        );
      case 'TEMP_CODE':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Key className="w-2.5 h-2.5" />
            <span>Code</span>
          </span>
        );
      case 'KIOSK_PIN':
        return (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <PhoneOff className="w-2.5 h-2.5" />
            <span>Kiosk</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {method}
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#8d4a27]" />
          <h3 className="text-sm font-bold text-slate-900">
            Live Attendance Count
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            title="Print roll sheet"
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExportSessionCsv}
            title="Export session attendance CSV"
            className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <div className="text-xs font-bold text-slate-600 ml-1">
            {totalAttended} / {totalEnrolled} ({attendanceRate}%)
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#8d4a27]" />
            <span>Present</span>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {presentCount}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Late</span>
          </div>
          <p className="text-2xl font-black text-amber-900 mt-1">
            {lateCount}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-purple-50 border border-purple-200">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-800">
            <PhoneOff className="w-3.5 h-3.5 text-purple-600" />
            <span>Assisted</span>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-1">
            {assistedCount}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-xs font-semibold text-slate-500">Absent / Pending</div>
          <p className="text-2xl font-black text-slate-700 mt-1">
            {Math.max(0, totalEnrolled - totalAttended)}
          </p>
        </div>
      </div>

      {/* Live Attendees Feed Table */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Verified Student Roll ({records.length})
        </h4>

        {records.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            No students logged yet. Waiting for initial scans...
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
            {records.map((r) => {
              const studentName = r.student?.profile
                ? `${r.student.profile.firstName} ${r.student.profile.lastName}`
                : 'Student';
              const matric = r.student?.matricNumber || 'CUSTECH Student';
              const statusBadge = getStatusBadgeVariant(r.status);

              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] flex items-center justify-center font-bold text-xs shrink-0">
                      {studentName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {studentName}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{matric}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getMethodBadge(r.method)}
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
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
    </div>
  );
};
