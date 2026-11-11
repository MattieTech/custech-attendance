'use client';

import React from 'react';
import QRCode from 'qrcode';
import {
  getRotatingQrToken,
  pauseSession,
  resumeSession,
  closeSession,
  regenerateSessionCodeAction,
  deactivateSessionCodeAction,
  reactivateSessionCodeAction,
} from '@/actions/attendance';
import { AttendanceSession } from '@/types';
import {
  Pause,
  Play,
  Square,
  Key,
  ShieldAlert,
  Camera,
  RefreshCw,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Monitor,
  RotateCcw,
  Power,
  PowerOff,
} from 'lucide-react';

interface DynamicQrDisplayProps {
  session: AttendanceSession;
  courseCode: string;
  courseTitle: string;
  creditUnits?: number;
  lecturerName?: string;
  departmentName?: string;
  academicLevel?: string | number;
  classroomCode?: string;
  venue?: string;
  weekNumber?: number;
  lecturerId: string;
  onOpenKiosk: () => void;
  onSessionUpdate?: (updatedSession: AttendanceSession) => void;
}

export const DynamicQrDisplay: React.FC<DynamicQrDisplayProps> = ({
  session,
  courseCode,
  courseTitle,
  creditUnits = 2,
  lecturerName = 'Course Lecturer',
  departmentName = 'Computer Science',
  academicLevel = '200L',
  classroomCode = 'LH 101',
  venue,
  weekNumber,
  lecturerId,
  onOpenKiosk,
  onSessionUpdate,
}) => {
  const [qrSvg, setQrSvg] = React.useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(session.qrRotationSeconds || 60);
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isProjectorMode, setIsProjectorMode] = React.useState(false);
  const [tokenRefreshNonce, setTokenRefreshNonce] = React.useState(0);

  // Keyboard shortcut listener for Esc key to exit projector mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProjectorMode) {
        setIsProjectorMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProjectorMode]);

  // Timer interval for countdown and token rotation
  React.useEffect(() => {
    if (session.status !== 'ACTIVE') return;

    let cancelled = false;

    const loadToken = async () => {
      try {
        const res = await getRotatingQrToken(session.id);
        if (cancelled) return;
        if ('error' in res) {
          setActionError(res.error);
          return;
        }

        const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
        const attendUrl = `${origin}/attend?sessionId=${encodeURIComponent(session.id)}&course=${encodeURIComponent(courseCode)}&tw=${res.timestampWindow}&nonce=${encodeURIComponent(res.nonce)}&sig=${encodeURIComponent(res.signature)}&code=${encodeURIComponent(session.currentTempCode)}`;

        const svg = await QRCode.toString(attendUrl, {
          type: 'svg',
          margin: 1,
          color: {
            dark: '#743c22', // CUSTECH official brown
            light: '#ffffff',
          },
        });
        if (cancelled) return;
        setQrSvg(svg);
        setSecondsRemaining(session.qrRotationSeconds || 60);
        setActionError(null);
      } catch {
        if (!cancelled) {
          setActionError('Error generating dynamic token');
        }
      }
    };

    void loadToken();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          void loadToken();
          return session.qrRotationSeconds || 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session.id, session.status, session.qrRotationSeconds, session.currentTempCode, courseCode, tokenRefreshNonce]);

  // Session Lifecycle handlers
  const handlePause = async () => {
    try {
      setIsLoading(true);
      const updated = await pauseSession(session.id, lecturerId);
      onSessionUpdate?.(updated);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to pause session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsLoading(true);
      const updated = await resumeSession(session.id, lecturerId);
      onSessionUpdate?.(updated);
      setTokenRefreshNonce((n) => n + 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to resume session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Are you sure you want to close this attendance session? Students will no longer be able to scan or use temporary codes.')) {
      return;
    }
    try {
      setIsLoading(true);
      const updated = await closeSession(session.id, lecturerId);
      onSessionUpdate?.(updated);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to close session');
    } finally {
      setIsLoading(false);
    }
  };

  // Phase 6: Attendance Code Lifecycle handlers
  const handleRegenerateCode = async () => {
    if (!confirm('Regenerating will immediately invalidate the current code and old codes. Students must enter the new code. Continue?')) {
      return;
    }
    try {
      setIsLoading(true);
      const res = await regenerateSessionCodeAction(session.id, lecturerId);
      if (res.success && res.newCode) {
        const updated: AttendanceSession = {
          ...session,
          currentTempCode: res.newCode,
          isCodeActive: true,
          tempCodeExpiresAt: res.expiresAt || session.tempCodeExpiresAt,
          previousCodes: [...(session.previousCodes || []), session.currentTempCode],
        };
        onSessionUpdate?.(updated);
        setActionSuccess(`New Code Generated: ${res.newCode}. Previous codes immediately invalidated.`);
        setTimeout(() => setActionSuccess(null), 4000);
        setTokenRefreshNonce((n) => n + 1);
      } else {
        setActionError(res.error || 'Failed to regenerate attendance code');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Error regenerating attendance code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCodeActive = async () => {
    const isCurrentlyActive = session.isCodeActive !== false;
    try {
      setIsLoading(true);
      if (isCurrentlyActive) {
        await deactivateSessionCodeAction(session.id, lecturerId);
        const updated = { ...session, isCodeActive: false };
        onSessionUpdate?.(updated);
        setActionSuccess('Attendance code deactivated. Submissions using code are now blocked.');
      } else {
        await reactivateSessionCodeAction(session.id, lecturerId);
        const updated = { ...session, isCodeActive: true };
        onSessionUpdate?.(updated);
        setActionSuccess('Attendance code reactivated. Students can now submit again.');
      }
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to toggle code status');
    } finally {
      setIsLoading(false);
    }
  };

  const rotationInterval = session.qrRotationSeconds || 60;
  const progressPercent = ((rotationInterval - secondsRemaining) / rotationInterval) * 100;
  const displayVenue = venue || session.venue || classroomCode;
  const displayWeek = weekNumber || session.weekNumber || 1;
  const displayStartTime = session.actualStart ? new Date(session.actualStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00 AM';
  const displayEndTime = session.scheduledEnd ? new Date(session.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM';
  const displayDate = session.date || new Date().toISOString().split('T')[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative">
      {/* Course Header Banner with Phase 5 Specifications */}
      <div className="w-full flex flex-col gap-3 pb-4 mb-4 border-b border-slate-100 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl font-black text-slate-900 tracking-tight">
                {courseCode}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb]">
                {creditUnits} Credit Units
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                Week {displayWeek}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-semibold text-slate-600">
                {displayVenue}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-800 mt-0.5">
              {courseTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                session.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 animate-pulse'
                  : session.status === 'PAUSED'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              Session: {session.status}
            </span>
          </div>
        </div>

        {/* Phase 5 Lecture Session Details Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Lecturer</span>
            <span className="font-semibold text-slate-800 truncate block">{lecturerName}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Department & Level</span>
            <span className="font-semibold text-slate-800 truncate block">{departmentName} ({academicLevel})</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Date</span>
            <span className="font-semibold text-slate-800 truncate block">{displayDate}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400">Schedule</span>
            <span className="font-semibold text-slate-800 truncate block">{displayStartTime} – {displayEndTime}</span>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="w-full mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="w-full mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left animate-fadeIn">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* QR Code Container or Inactive State */}
      {session.status === 'ACTIVE' ? (
        <div className="flex flex-col items-center">
          <div
            onClick={() => setIsProjectorMode(true)}
            title="Click to expand to full-screen projector mode"
            className="group relative p-4 bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:border-[#8d4a27] hover:shadow-md transition"
          >
            {qrSvg ? (
              <div
                className="w-44 h-44 sm:w-64 sm:h-64 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-[#8d4a27]" />
              </div>
            )}

            {/* Hover Full Screen Overlay Hint */}
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white gap-1 backdrop-blur-2xs">
              <Maximize2 className="w-8 h-8" />
              <span className="text-xs font-bold">Classroom Projector Mode</span>
            </div>

            {/* Micro Badge inside QR frame */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full bg-[#8d4a27] text-white text-xs font-bold tracking-wider uppercase shadow-sm flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Rotates Every {session.qrRotationSeconds || 60}s</span>
            </div>
          </div>

          {/* Countdown Ring Indicator */}
          <div className="w-full max-w-xs mt-5">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
              <span>Token Validity Window</span>
              <span className="font-bold text-[#8d4a27]">
                {secondsRemaining}s remaining
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8d4a27] rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Course Code & Temporary Attendance Code Display */}
          {/* Course Code & Dynamic Attendance Code Management (Phase 6) */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 w-full max-w-sm text-center">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-[#8d4a27]" />
                Attendance Code
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider ${
                  session.isCodeActive !== false
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {session.isCodeActive !== false ? '● Code Active' : '✕ Deactivated'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 my-2">
              <div className="bg-[#fbf5ef] border border-[#ecdacb] px-3 py-1.5 rounded-lg text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Course Code</span>
                <span className="text-base font-extrabold text-[#8d4a27] font-mono">{courseCode}</span>
              </div>
              <div
                className={`border px-4 py-1.5 rounded-lg text-center shadow-xs ${
                  session.isCodeActive !== false
                    ? 'bg-white border-slate-300'
                    : 'bg-slate-100 border-dashed border-rose-300 opacity-60'
                }`}
              >
                <span className="block text-[10px] uppercase font-bold text-slate-400">Session Code</span>
                <span className="text-xl font-black text-slate-900 tracking-widest font-mono">
                  {session.isCodeActive !== false ? session.currentTempCode : '------'}
                </span>
              </div>
            </div>

            {session.previousCodes && session.previousCodes.length > 0 && (
              <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 mt-1">
                Notice: {session.previousCodes.length} previous code(s) invalidated. Only current code accepted.
              </p>
            )}

            {/* Code Management Controls (Phase 6) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={handleRegenerateCode}
                disabled={isLoading}
                title="Generates a fresh 6-character code and immediately invalidates previous codes"
                className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#8d4a27]" />
                <span>Regenerate Code</span>
              </button>

              <button
                type="button"
                onClick={handleToggleCodeActive}
                disabled={isLoading}
                title={session.isCodeActive !== false ? 'Prevent further submissions using this code' : 'Reactivate submissions for this code'}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border shadow-2xs transition ${
                  session.isCodeActive !== false
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}
              >
                {session.isCodeActive !== false ? (
                  <>
                    <PowerOff className="w-3.5 h-3.5" />
                    <span>Deactivate Code</span>
                  </>
                ) : (
                  <>
                    <Power className="w-3.5 h-3.5" />
                    <span>Reactivate Code</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Link Copy for Testing */}
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
                  const attendUrl = `${origin}/attend?sessionId=${encodeURIComponent(session.id)}&course=${encodeURIComponent(courseCode)}&code=${encodeURIComponent(session.currentTempCode)}`;
                  navigator.clipboard?.writeText(attendUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="text-xs font-semibold text-[#8d4a27] hover:text-[#743c22] flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-100 transition"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Direct Link Copied!' : 'Copy Direct Attendance Link'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : session.status === 'PAUSED' ? (
        <div className="py-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <Pause className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-900">
            Attendance Session Paused
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            QR codes and temporary codes are temporarily frozen. Click Resume to re-enable token generation.
          </p>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
            <Square className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-slate-900">
            Attendance Session Closed
          </h4>
          <p className="text-xs text-slate-500 max-w-xs mt-1">
            Attendance capture for this lecture has concluded. Final records are locked for review.
          </p>
        </div>
      )}

      {/* Control Buttons for Lecturer */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-100 w-full">
        {session.status === 'ACTIVE' ? (
          <button
            onClick={handlePause}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition shadow-sm"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause QR</span>
          </button>
        ) : session.status === 'PAUSED' ? (
          <button
            onClick={handleResume}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#8d4a27] text-white hover:bg-[#743c22] transition shadow-sm"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Resume Attendance</span>
          </button>
        ) : null}

        {session.status !== 'CLOSED' && (
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-sm"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Close Session</span>
          </button>
        )}

        {/* Projector Mode Launcher */}
        {session.status === 'ACTIVE' && (
          <button
            onClick={() => setIsProjectorMode(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-[#8d4a27] text-white hover:bg-[#743c22] transition shadow-sm"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Projector Mode</span>
          </button>
        )}

        {/* Kiosk Mode Launcher */}
        <button
          onClick={onOpenKiosk}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition shadow-sm"
        >
          <span>Open Kiosk Mode</span>
          <span className="px-1.5 py-0.5 text-[10px] rounded bg-[#8d4a27] text-white font-bold">
            No-Phone
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* FULL-SCREEN CLASSROOM PROJECTOR OVERLAY                        */}
      {/* ============================================================== */}
      {isProjectorMode && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none animate-fadeIn overflow-y-auto">
          {/* Top Header with Full Phase 5 Details */}
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-3">
            <div className="flex items-center gap-4">
              <div className="bg-[#8d4a27] text-white px-4 py-2.5 rounded-xl font-mono text-xl sm:text-2xl font-black shadow-lg">
                {courseCode}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">{courseTitle}</h1>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#8d4a27]/30 text-[#eed7c3] border border-[#8d4a27]/50">
                    {creditUnits} Credit Units
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-slate-300">
                    Week {displayWeek}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
                  <span>Lecturer: <strong className="text-slate-200">{lecturerName}</strong></span>
                  <span>•</span>
                  <span>Dept/Level: <strong className="text-slate-200">{departmentName} ({academicLevel})</strong></span>
                  <span>•</span>
                  <span>Venue: <strong className="text-slate-200">{displayVenue}</strong></span>
                  <span>•</span>
                  <span>Status: <strong className="text-emerald-400 uppercase tracking-wider">{session.status}</strong></span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsProjectorMode(false)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition shrink-0 self-start md:self-auto"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Exit Projector (Esc)</span>
            </button>
          </div>

          {/* Center Projector QR */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 my-auto py-6">
            <div className="p-4 sm:p-6 bg-white rounded-3xl shadow-2xl flex items-center justify-center border-4 border-[#8d4a27]">
              {qrSvg ? (
                <div
                  className="w-56 h-56 sm:w-96 sm:h-96 md:w-[440px] md:h-[440px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center">
                  <RefreshCw className="w-12 h-12 animate-spin text-[#8d4a27]" />
                </div>
              )}
            </div>

            {/* Side Session Info & Backup Code */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Dynamic QR Security Token
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#eed7c3] font-mono">
                    {secondsRemaining}s
                  </span>
                  <span className="text-xs text-slate-400 font-medium">remaining until rotation</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full mt-3 overflow-hidden">
                  <div
                    className="h-full bg-[#8d4a27] rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-xl">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  6-Digit Manual Attendance Code
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-black text-white tracking-widest bg-slate-800/80 px-4 py-2.5 rounded-xl text-center border border-slate-700">
                  {session.currentTempCode}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  For students without cameras: Enter this code in CourseTaker attendance portal.
                </p>
              </div>

              <div className="text-slate-400 text-xs sm:text-sm max-w-sm flex items-center gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <Camera className="w-5 h-5 text-[#eed7c3] shrink-0" />
                <span>Open normal phone camera & scan QR code. Automatically signs student into lecture session.</span>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-3">
            <span>Confluence University of Science and Technology (CUSTECH) — Official Attendance Projector View</span>
            <span>Press [ESC] or click Exit to return to lecturer controls</span>
          </div>
        </div>
      )}
    </div>
  );
};
