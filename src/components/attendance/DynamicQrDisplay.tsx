'use client';

import React from 'react';
import QRCode from 'qrcode';
import { getRotatingQrToken, pauseSession, resumeSession, closeSession } from '@/actions/attendance';
import { AttendanceSession, RotatingQrPayload } from '@/types';
import { Pause, Play, Square, Key, ShieldAlert, Sparkles, RefreshCw, Copy, Check, ExternalLink, Maximize2, Minimize2, Monitor } from 'lucide-react';

interface DynamicQrDisplayProps {
  session: AttendanceSession;
  courseCode: string;
  courseTitle: string;
  classroomCode: string;
  lecturerId: string;
  onOpenKiosk: () => void;
  onSessionUpdate?: (updatedSession: AttendanceSession) => void;
}

export const DynamicQrDisplay: React.FC<DynamicQrDisplayProps> = ({
  session: initialSession,
  courseCode,
  courseTitle,
  classroomCode,
  lecturerId,
  onOpenKiosk,
  onSessionUpdate,
}) => {
  const [session, setSession] = React.useState<AttendanceSession>(initialSession);
  const [qrSvg, setQrSvg] = React.useState<string>('');
  const [currentPayload, setCurrentPayload] = React.useState<RotatingQrPayload | null>(null);
  const [secondsRemaining, setSecondsRemaining] = React.useState<number>(initialSession.qrRotationSeconds || 20);
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [isProjectorMode, setIsProjectorMode] = React.useState(false);

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

  // Sync state if initialSession changes
  React.useEffect(() => {
    setSession(initialSession);
  }, [initialSession]);

  // Fetch or rotate QR token
  const fetchNewToken = React.useCallback(async () => {
    if (session.status !== 'ACTIVE') return;
    try {
      const res = await getRotatingQrToken(session.id);
      if ('error' in res) {
        setActionError(res.error);
        return;
      }
      setCurrentPayload(res);
      
      // Generate Direct Mobile Camera Redirect URL
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000';
      const attendUrl = `${origin}/attend?sessionId=${encodeURIComponent(session.id)}&course=${encodeURIComponent(courseCode)}&tw=${res.timestampWindow}&nonce=${encodeURIComponent(res.nonce)}&sig=${encodeURIComponent(res.signature)}&code=${encodeURIComponent(session.currentTempCode)}`;

      // Generate SVG string from the direct URL
      const svg = await QRCode.toString(attendUrl, {
        type: 'svg',
        margin: 1,
        color: {
          dark: '#743c22', // CUSTECH official brown
          light: '#ffffff',
        },
      });
      setQrSvg(svg);
      setSecondsRemaining(session.qrRotationSeconds || 20);
      setActionError(null);
    } catch {
      setActionError('Error generating dynamic token');
    }
  }, [session.id, session.status, session.qrRotationSeconds, session.currentTempCode, courseCode]);

  // Timer interval for countdown and token rotation
  React.useEffect(() => {
    if (session.status !== 'ACTIVE') return;

    fetchNewToken();

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          fetchNewToken();
          return session.qrRotationSeconds || 20;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session.status, session.qrRotationSeconds, fetchNewToken]);

  // Session Lifecycle handlers
  const handlePause = async () => {
    try {
      setIsLoading(true);
      const updated = await pauseSession(session.id, lecturerId);
      setSession(updated);
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
      setSession(updated);
      onSessionUpdate?.(updated);
      fetchNewToken();
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
      setSession(updated);
      onSessionUpdate?.(updated);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to close session');
    } finally {
      setIsLoading(false);
    }
  };

  const rotationInterval = session.qrRotationSeconds || 20;
  const progressPercent = ((rotationInterval - secondsRemaining) / rotationInterval) * 100;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center relative">
      {/* Course Header Banner */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
        <div className="text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-black text-slate-900 tracking-tight">
              {courseCode}
            </span>
            <span className="text-xs text-slate-300">•</span>
            <span className="text-xs font-semibold text-slate-600">
              {classroomCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium truncate max-w-[280px] sm:max-w-md">
            {courseTitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              session.status === 'ACTIVE'
                ? 'bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] animate-pulse'
                : session.status === 'PAUSED'
                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {session.status}
          </span>
        </div>
      </div>

      {actionError && (
        <div className="w-full mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
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
                className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-[#8d4a27]" />
              </div>
            )}

            {/* Hover Full Screen Overlay Hint */}
            <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white gap-1 backdrop-blur-2xs">
              <Maximize2 className="w-8 h-8" />
              <span className="text-xs font-bold">Classroom Projector Mode</span>
            </div>

            {/* Micro Badge inside QR frame */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#8d4a27] text-white text-xs font-bold tracking-wider uppercase shadow-sm flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Rotates Every {session.qrRotationSeconds}s</span>
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
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 w-full max-w-sm text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Key className="w-3.5 h-3.5 text-[#8d4a27]" />
              Manual Student Entry
            </p>
            <div className="flex items-center justify-center gap-2 my-2">
              <div className="bg-[#fbf5ef] border border-[#ecdacb] px-3 py-1.5 rounded-lg text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Course Code</span>
                <span className="text-base font-extrabold text-[#8d4a27] font-mono">{courseCode}</span>
              </div>
              <div className="bg-white border border-slate-300 px-4 py-1.5 rounded-lg text-center shadow-xs">
                <span className="block text-[10px] uppercase font-bold text-slate-400">Lecture Code</span>
                <span className="text-xl font-black text-slate-900 tracking-widest font-mono">{session.currentTempCode}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Phone camera automatically redirects to mark presence upon scanning. Students can also enter Course Code <strong className="text-slate-800">{courseCode}</strong> + Code <strong className="text-slate-800">{session.currentTempCode}</strong>.
            </p>

            {/* Quick Link Copy for Testing */}
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-center gap-2">
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
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Attendance Link'}</span>
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
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-4">
              <div className="bg-[#8d4a27] text-white px-4 py-2 rounded-xl font-mono text-xl sm:text-2xl font-black shadow-lg">
                {courseCode}
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{courseTitle}</h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Classroom / Venue: <span className="font-semibold text-slate-200">{classroomCode}</span> • Session Status:{' '}
                  <span className="font-bold text-emerald-400 uppercase tracking-wider">{session.status}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsProjectorMode(false)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-bold border border-slate-700 transition"
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
                  className="w-72 h-72 sm:w-96 sm:h-96 md:w-[440px] md:h-[440px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center">
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
                <Sparkles className="w-5 h-5 text-[#eed7c3] shrink-0" />
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
