'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Smartphone,
  Eye,
  Filter,
  Search,
  RefreshCw,
  Building2,
  User,
  Calendar,
  Layers,
  FileCheck,
  X,
  Check,
  Flame,
  ScanFace,
} from 'lucide-react';
import {
  getAllSessionsDetailedAction,
  getSessionRecordsAction,
  getDeviceCollisionAlertsAction,
  investigateDeviceAlertAction,
} from '@/actions/academic';
import { DeviceCollisionAlert } from '@/types';

interface AttendanceMonitoringTabProps {
  adminUserId: string;
}

export const AttendanceMonitoringTab: React.FC<AttendanceMonitoringTabProps> = ({ adminUserId }) => {
  const [subTab, setSubTab] = useState<'SESSIONS' | 'ALERTS'>('SESSIONS');
  const [sessions, setSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<DeviceCollisionAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');

  // Modal for Viewing Session Attendees Roster
  const [inspectingSession, setInspectingSession] = useState<any | null>(null);
  const [sessionRecords, setSessionRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Modal for Investigating an Alert
  const [investigatingAlert, setInvestigatingAlert] = useState<DeviceCollisionAlert | null>(null);
  const [investigationDecision, setInvestigationDecision] = useState<'CLEARED' | 'FLAGGED_FRAUD'>('CLEARED');
  const [investigationNotes, setInvestigationNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sessList, alertsList] = await Promise.all([
        getAllSessionsDetailedAction(),
        getDeviceCollisionAlertsAction(),
      ]);
      setSessions(sessList);
      setAlerts(alertsList);
    } catch (err) {
      console.error('Failed to load monitoring data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInspectSession = async (sess: any) => {
    setInspectingSession(sess);
    setIsLoadingRecords(true);
    try {
      const recs = await getSessionRecordsAction(sess.id);
      setSessionRecords(recs);
    } catch {
      setSessionRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleOpenInvestigateModal = (alert: DeviceCollisionAlert) => {
    setInvestigatingAlert(alert);
    setInvestigationDecision(alert.riskLevel === 'HIGH' ? 'FLAGGED_FRAUD' : 'CLEARED');
    setInvestigationNotes(alert.reviewNotes || '');
    setReviewSuccessMsg(null);
  };

  const handleConfirmInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investigatingAlert) return;
    setIsSubmittingReview(true);
    try {
      const res = await investigateDeviceAlertAction(
        investigatingAlert.id,
        adminUserId,
        investigationDecision,
        investigationNotes.trim() || undefined
      );
      if (res.success) {
        setReviewSuccessMsg(
          investigationDecision === 'CLEARED'
            ? 'Alert cleared as authorized shared device.'
            : 'Alert marked as disciplinary review / proxy attempt.'
        );
        await loadData();
        setTimeout(() => setInvestigatingAlert(null), 1200);
      } else {
        alert(res.error || 'Failed to update alert review status.');
      }
    } catch {
      alert('Error updating alert review status.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const activeSessionsCount = sessions.filter((s) => s.status === 'ACTIVE').length;
  const unreviewedAlertsCount = alerts.filter((a) => !a.isReviewed).length;

  const filteredSessions = sessions.filter((s) => {
    const code = s.courseOffering?.course?.code?.toLowerCase() || '';
    const title = s.courseOffering?.course?.title?.toLowerCase() || '';
    const lecturer = s.lecturer ? `${s.lecturer.firstName} ${s.lecturer.lastName}`.toLowerCase() : '';
    const query = searchQuery.toLowerCase();

    const matchesSearch = code.includes(query) || title.includes(query) || lecturer.includes(query);
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredAlerts = alerts.filter((a) => {
    const course = (a.courseCode || '').toLowerCase();
    const students = (a.matchedStudentNames || []).join(' ').toLowerCase();
    const matrics = (a.matchedMatricNumbers || a.studentIds || []).join(' ').toLowerCase();
    const query = searchQuery.toLowerCase();

    return course.includes(query) || students.includes(query) || matrics.includes(query);
  });

  return (
    <div className="space-y-6">
      {/* Header and Telemetry Stats */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8d4a27]">
                Live Attendance &amp; Security Surveillance
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">Anti-Proxy &amp; Integrity Console</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-1">
              Campus Attendance Monitor &amp; Fraud Telemetry
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live inspection of active lecture sessions across departments, cryptographic session codes, and hardware fingerprint collision detection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase text-emerald-800 tracking-wider">
                Active Live Lectures
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-0.5">{activeSessionsCount}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                Total Sessions Recorded
              </div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{sessions.length}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-700">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>

          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              unreviewedAlertsCount > 0
                ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Device Collision Alerts
              </div>
              <div className="text-2xl font-black mt-0.5">
                {alerts.length} <span className="text-xs font-semibold text-slate-500">({unreviewedAlertsCount} unreviewed)</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Subtab Toggle */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-sm">
        <button
          onClick={() => setSubTab('SESSIONS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition ${
            subTab === 'SESSIONS'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4 text-[#8d4a27]" />
          <span>Lecture Attendance Sessions ({sessions.length})</span>
        </button>

        <button
          onClick={() => setSubTab('ALERTS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition ${
            subTab === 'ALERTS'
              ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span>Anti-Proxy &amp; Hardware Collisions ({alerts.length})</span>
          {unreviewedAlertsCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          )}
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              subTab === 'SESSIONS'
                ? 'Filter by course code, title, or lecturer...'
                : 'Filter by student name, matric number, or course...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
          />
        </div>

        {subTab === 'SESSIONS' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
          >
            <option value="ALL">All Session States</option>
            <option value="ACTIVE">Live Active Sessions</option>
            <option value="CLOSED">Archived / Closed Sessions</option>
          </select>
        )}
      </div>

      {/* SUBTAB 1: LECTURE SESSIONS LIST */}
      {subTab === 'SESSIONS' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              Loading university attendance sessions...
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="p-12 text-center">
              <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">No Lecture Sessions Found</p>
              <p className="text-xs text-slate-400 mt-1">
                Sessions created by faculty members will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Session &amp; Week</th>
                    <th className="py-3 px-4">Course</th>
                    <th className="py-3 px-4">Lecturer &amp; Venue</th>
                    <th className="py-3 px-4">Attendance Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Roster</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredSessions.map((sess) => {
                    const courseCode = sess.courseOffering?.course?.code || 'N/A';
                    const courseTitle = sess.courseOffering?.course?.title || 'Course';
                    const lecturerName = sess.lecturer
                      ? `${sess.lecturer.firstName} ${sess.lecturer.lastName}`
                      : 'Lecturer';
                    const venue = sess.venue || sess.classroom?.code || 'Lecture Hall';
                    const date = sess.startTime ? new Date(sess.startTime).toLocaleDateString() : 'Today';

                    return (
                      <tr key={sess.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px]">
                              Week {sess.weekNumber || 1}
                            </span>
                            <span>{sess.topicTitle || 'Scheduled Lecture'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{date}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[#8d4a27] bg-[#fbf5ef] px-2 py-0.5 rounded text-[11px] border border-[#ecdacb]">
                              {courseCode}
                            </span>
                            <span className="font-semibold text-slate-800">{courseTitle}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 text-slate-800 font-medium">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{lecturerName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{venue}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                              {sess.currentTempCode}
                            </span>
                            {sess.isCodeActive === false && (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Deactivated
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {sess.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Radio className="w-3 h-3 animate-pulse text-emerald-600" />
                              Active Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Closed
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleInspectSession(sess)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#8d4a27] bg-[#fbf5ef] hover:bg-[#ecdacb] border border-[#ecdacb] rounded-lg transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect Roster</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: ANTI-PROXY DEVICE COLLISION ALERTS */}
      {subTab === 'ALERTS' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              Loading anti-proxy surveillance logs...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-700">Zero Device Conflicts Detected</p>
              <p className="text-xs text-slate-400 mt-1">
                All student attendance records exhibit authentic single-device hardware telemetry.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Risk Level &amp; Reason</th>
                    <th className="py-3 px-4">Students Involved</th>
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Device &amp; Telemetry</th>
                    <th className="py-3 px-4">Review Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredAlerts.map((alert) => {
                    const isHigh = alert.riskLevel === 'HIGH';
                    const isMedium = alert.riskLevel === 'MEDIUM';

                    return (
                      <tr key={alert.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {isHigh ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Flame className="w-3 h-3 text-rose-600" />
                                HIGH RISK
                              </span>
                            ) : isMedium ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                MEDIUM
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Smartphone className="w-3 h-3 text-blue-600" />
                                LOW / SHARED
                              </span>
                            )}
                            {(alert.alertType === 'BIOMETRIC_PROXY_ATTEMPT' ||
                              alert.alertType === 'BIOMETRIC_MISMATCH') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                                <ScanFace className="w-3 h-3" />
                                BIOMETRIC
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1 font-medium">
                            {alert.riskReason || 'Multiple students submitted attendance from this device.'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {alert.matchedStudentNames && alert.matchedStudentNames.length > 0 ? (
                              alert.matchedStudentNames.map((name, i) => (
                                <div key={i} className="font-semibold text-slate-800 flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-400" />
                                  <span>{name}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-slate-500 font-mono text-[11px]">
                                {(alert.matchedMatricNumbers || alert.studentIds || []).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-[#8d4a27] bg-[#fbf5ef] px-2 py-0.5 rounded text-[11px] border border-[#ecdacb]">
                            {alert.courseCode || 'CSC 201'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[11px] text-slate-600 truncate max-w-[180px]">
                            {alert.deviceFingerprintHash.slice(0, 16)}...
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {alert.browser || 'Browser'} • {alert.os || 'OS'} ({alert.deviceType || 'Mobile'})
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {alert.isReviewed ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Reviewed ({alert.actionTaken || 'CLEARED'})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Awaiting Review
                            </span>
                          )}
                          {alert.reviewNotes && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5">
                              "{alert.reviewNotes}"
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenInvestigateModal(alert)}
                            className="px-3 py-1.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-lg transition shadow-xs"
                          >
                            Investigate
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INSPECT ROSTER MODAL */}
      {inspectingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Attendance Roster: {inspectingSession.courseOffering?.course?.code || 'Course'}
                </h3>
                <p className="text-xs text-slate-500">
                  Week {inspectingSession.weekNumber || 1} • {inspectingSession.topicTitle || 'Lecture'} • Venue: {inspectingSession.venue || 'Lecture Hall'}
                </p>
              </div>
              <button
                onClick={() => setInspectingSession(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6">
              {isLoadingRecords ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading attendees roster...</div>
              ) : sessionRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-medium">
                  No student has submitted attendance for this lecture session yet.
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        <th className="py-2 px-3">Student Name</th>
                        <th className="py-2 px-3">Matric Number</th>
                        <th className="py-2 px-3">Method</th>
                        <th className="py-2 px-3">Biometric</th>
                        <th className="py-2 px-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {sessionRecords.map((rec) => {
                        const name = rec.student?.profile
                          ? `${rec.student.profile.firstName} ${rec.student.profile.lastName}`
                          : 'Student';
                        const matric = rec.student?.matricNumber || 'Unknown';
                        const time = rec.recordedAt ? new Date(rec.recordedAt).toLocaleTimeString() : 'N/A';

                        return (
                          <tr key={rec.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{name}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{matric}</td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                                {rec.method}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {rec.facialVerified ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <ScanFace className="w-3 h-3" />
                                  <span>
                                    Verified{rec.facialConfidence ? ` (${rec.facialConfidence}%)` : ''}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">{time}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setInspectingSession(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVESTIGATE ALERT MODAL */}
      {investigatingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Investigate Device Collision Alert
                </h3>
                <p className="text-xs text-slate-500">
                  Device Hash: {investigatingAlert.deviceFingerprintHash.slice(0, 16)}...
                </p>
              </div>
              <button
                onClick={() => setInvestigatingAlert(null)}
                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmInvestigation} className="p-6 space-y-4">
              {reviewSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{reviewSuccessMsg}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                <div className="font-bold text-slate-800">Telemetry &amp; Matched Records:</div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-500">Students:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {investigatingAlert.matchedStudentNames?.join(', ') || (investigatingAlert.matchedMatricNumbers || investigatingAlert.studentIds || []).join(', ')}
                  </span>
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-500">Course Code:</span>{' '}
                  <span className="font-mono font-bold text-[#8d4a27]">{investigatingAlert.courseCode || 'CSC 201'}</span>
                </div>
                <div className="text-slate-600">
                  <span className="font-medium text-slate-500">Reason:</span> {investigatingAlert.riskReason}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Institutional Resolution Decision *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setInvestigationDecision('CLEARED')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      investigationDecision === 'CLEARED'
                        ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Clear Flag</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2">
                      Legitimate phone share (e.g., student phone battery/data died in class).
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInvestigationDecision('FLAGGED_FRAUD')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      investigationDecision === 'FLAGGED_FRAUD'
                        ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800">Flag as Fraud</span>
                      <Flame className="w-4 h-4 text-rose-600" />
                    </div>
                    <span className="text-[11px] text-slate-500 mt-2">
                      Proxy attendance attempt. Forward to academic disciplinary board.
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Investigation &amp; Decision Notes
                </label>
                <textarea
                  rows={3}
                  value={investigationNotes}
                  onChange={(e) => setInvestigationNotes(e.target.value)}
                  placeholder="Record justification, student interview notes, or disciplinary case references..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInvestigatingAlert(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-60"
                >
                  {isSubmittingReview ? 'Recording Decision...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
