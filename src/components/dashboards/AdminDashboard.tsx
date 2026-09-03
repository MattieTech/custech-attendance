'use client';

import React from 'react';
import { custechDb } from '@/lib/db/repository';
import { UserProfile, SystemSettings } from '@/types';
import { updateSystemSettingsAction } from '@/actions/academic';
import { formatTime } from '@/lib/utils';
import {
  ShieldCheck,
  Settings,
  Sliders,
  FileText,
  Users,
  Building2,
  Lock,
  CheckCircle2,
} from 'lucide-react';

interface AdminDashboardProps {
  user: UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [settings, setSettings] = React.useState<SystemSettings>(custechDb.getSystemSettings());
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const auditLogs = custechDb.getAuditLogs();
  const faculties = custechDb.getFaculties();
  const departments = custechDb.getDepartments();

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateSystemSettingsAction(
        {
          examEligibilityThreshold: Number(settings.examEligibilityThreshold),
          minimumAttendanceWarningThreshold: Number(settings.minimumAttendanceWarningThreshold),
          qrRotationSeconds: Number(settings.qrRotationSeconds),
          lateThresholdMinutes: Number(settings.lateThresholdMinutes),
        },
        user.id
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Super Admin Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
              Institutional Administration
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">Vice Chancellor's Office / ICT Directorate</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mt-1">
            CUSTECH Central Academic Presence System
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            System Administrator: Engr. {user.firstName} {user.lastName}. Full university-wide governance, policies, and immutable security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
            Root Authority: Active
          </span>
        </div>
      </div>

      {/* University Directory Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition">
          <div className="text-xs text-slate-500 font-semibold">Faculties</div>
          <p className="text-3xl font-black text-slate-900 mt-1">{faculties.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Computing, Engineering, Science</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition">
          <div className="text-xs text-slate-500 font-semibold">Departments</div>
          <p className="text-3xl font-black text-slate-900 mt-1">{departments.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">CSC, SEN, CYS</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition">
          <div className="text-xs text-slate-500 font-semibold">Audited Events</div>
          <p className="text-3xl font-black text-slate-900 mt-1">{auditLogs.length}</p>
          <p className="text-[11px] text-slate-400 mt-1">Tamper-proof record trail</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-sm transition">
          <div className="text-xs text-slate-500 font-semibold">Campus Coverage</div>
          <p className="text-3xl font-black text-slate-900 mt-1">100%</p>
          <p className="text-[11px] text-slate-400 mt-1">Dual QR + Kiosk Active</p>
        </div>
      </div>

      {/* SYSTEM SETTINGS & POLICY CONFIGURATOR */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900">
              Institutional Policy & Attendance Parameters
            </h3>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-bold text-[#8d4a27]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Policies Updated & Audited</span>
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Exam Eligibility Threshold (%)
            </label>
            <input
              type="number"
              min={50}
              max={100}
              value={settings.examEligibilityThreshold}
              onChange={(e) =>
                setSettings({ ...settings, examEligibilityThreshold: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Statutory attendance requirement (default 75%)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Warning Notice Threshold (%)
            </label>
            <input
              type="number"
              min={40}
              max={90}
              value={settings.minimumAttendanceWarningThreshold}
              onChange={(e) =>
                setSettings({ ...settings, minimumAttendanceWarningThreshold: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Triggers student portal alert (default 70%)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              QR Code Rotation Interval (Seconds)
            </label>
            <input
              type="number"
              min={10}
              max={60}
              value={settings.qrRotationSeconds}
              onChange={(e) =>
                setSettings({ ...settings, qrRotationSeconds: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Anti-proxy refresh period (default 20s)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Late Status Grace Period (Minutes)
            </label>
            <input
              type="number"
              min={5}
              max={45}
              value={settings.lateThresholdMinutes}
              onChange={(e) =>
                setSettings({ ...settings, lateThresholdMinutes: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 font-mono"
            />
            <p className="text-[10px] text-zinc-400 mt-1">Classes after this are marked LATE (default 15m)</p>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold shadow-xs transition"
            >
              {isSaving ? 'Applying Changes...' : 'Save & Publish Policy Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* IMMUTABLE AUDIT LOG EXPLORER */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#8d4a27]" />
            <h3 className="text-sm font-bold text-slate-900">
              Immutable Security & System Audit Trail ({auditLogs.length} Events)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400">PostgreSQL Append-Only</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Actor</th>
                <th className="pb-2.5">Role</th>
                <th className="pb-2.5">Action</th>
                <th className="pb-2.5">Target Entity</th>
                <th className="pb-2.5">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 font-mono text-[11px] text-slate-400">
                    {formatTime(log.createdAt)}
                  </td>
                  <td className="py-2.5 font-semibold text-slate-800">
                    {log.actorName}
                  </td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-slate-900 font-bold">
                    {log.action}
                  </td>
                  <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                    {log.entityType}
                  </td>
                  <td className="py-2.5 text-slate-400 text-[11px] max-w-xs truncate">
                    {JSON.stringify(log.details || {})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
