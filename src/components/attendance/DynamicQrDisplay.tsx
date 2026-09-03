'use client';

import React from 'react';
import QRCode from 'qrcode';
import { getRotatingQrToken, pauseSession, resumeSession, closeSession } from '@/actions/attendance';
import { AttendanceSession, RotatingQrPayload } from '@/types';
import { Pause, Play, Square, Key, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

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
      // Generate SVG string
      const svg = await QRCode.toString(JSON.stringify(res), {
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
  }, [session.id, session.status, session.qrRotationSeconds]);

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
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col items-center text-center relative">
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
          <div className="relative p-4 bg-white rounded-2xl shadow-xs border border-slate-200">
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

            {/* Micro Badge inside QR frame */}
            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#8d4a27] text-white text-[10px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Rotates Every {session.qrRotationSeconds}s</span>
            </div>
          </div>

          {/* Countdown Ring Indicator */}
          <div className="w-full max-w-xs mt-5">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
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

          {/* Large Alphanumeric Temporary Attendance Code */}
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 w-full max-w-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-center gap-1">
              <Key className="w-3 h-3 text-slate-400" />
              Temporary Attendance Code
            </p>
            <div className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-widest my-1 font-mono">
              {session.currentTempCode}
            </div>
            <p className="text-[10px] text-zinc-400">
              For students with low camera resolution or scanning difficulty
            </p>
          </div>
        </div>
      ) : session.status === 'PAUSED' ? (
        <div className="py-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 flex items-center justify-center mb-3">
            <Pause className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Attendance Session Paused
          </h4>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">
            QR codes and temporary codes are temporarily frozen. Click Resume to re-enable token generation.
          </p>
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center mb-3">
            <Square className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            Attendance Session Closed
          </h4>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">
            Attendance capture for this lecture has concluded. Final records are locked for review.
          </p>
        </div>
      )}

      {/* Control Buttons for Lecturer */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 w-full">
        {session.status === 'ACTIVE' ? (
          <button
            onClick={handlePause}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition shadow-xs"
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause QR</span>
          </button>
        ) : session.status === 'PAUSED' ? (
          <button
            onClick={handleResume}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#8d4a27] text-white hover:bg-[#a6572e] transition shadow-xs"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Resume Attendance</span>
          </button>
        ) : null}

        {session.status !== 'CLOSED' && (
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-xs"
          >
            <Square className="w-3.5 h-3.5" />
            <span>Close Session</span>
          </button>
        )}

        {/* Kiosk Mode Launcher */}
        <button
          onClick={onOpenKiosk}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 transition shadow-xs"
        >
          <span>Open Kiosk Mode</span>
          <span className="px-1.5 py-0.2 text-[9px] rounded bg-[#8d4a27] text-white font-bold">
            No-Phone
          </span>
        </button>
      </div>
    </div>
  );
};
