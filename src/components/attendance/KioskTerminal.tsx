'use client';

import React from 'react';
import { submitKioskAttendance } from '@/actions/attendance';
import { enqueueOfflineAttendance } from '@/lib/offline/dexie-db';
import { generateClientEventId } from '@/lib/crypto';
import { AssistedReason } from '@/types';
import { ShieldCheck, UserCheck, AlertTriangle, ArrowRight, Lock, PhoneOff } from 'lucide-react';

interface KioskTerminalProps {
  sessionId: string;
  courseCode: string;
  courseTitle: string;
  operatorProfileId: string;
  operatorName: string;
  operatorRoleTitle: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

const ASSISTED_REASONS: AssistedReason[] = [
  'No smartphone',
  'Phone battery dead',
  'No internet / mobile data',
  'Device malfunction',
  'Lost / stolen device',
  'Other approved reason',
];

export const KioskTerminal: React.FC<KioskTerminalProps> = ({
  sessionId,
  courseCode,
  courseTitle,
  operatorProfileId,
  operatorName,
  operatorRoleTitle,
  onClose,
  onSuccess,
}) => {
  const [matricNumber, setMatricNumber] = React.useState('');
  const [attendancePin, setAttendancePin] = React.useState('');
  const [assistedReason, setAssistedReason] = React.useState<AssistedReason>('No smartphone');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successInfo, setSuccessInfo] = React.useState<{
    studentName?: string;
    message: string;
    isOffline?: boolean;
  } | null>(null);

  const resetForm = React.useCallback(() => {
    setMatricNumber('');
    setAttendancePin('');
    setErrorMessage(null);
    setSuccessInfo(null);
  }, []);

  // Handle Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMatric = matricNumber.trim().toUpperCase();
    const cleanPin = attendancePin.trim();

    if (!cleanMatric) {
      setErrorMessage('Please enter the student Matriculation Number.');
      return;
    }
    if (cleanPin.length !== 4) {
      setErrorMessage('Please enter the confidential 4-digit Attendance PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const clientEventId = generateClientEventId(sessionId, cleanMatric);

    // If offline, write directly to Dexie IndexedDB queue
    if (!navigator.onLine) {
      try {
        await enqueueOfflineAttendance({
          clientEventId,
          sessionId,
          matricNumber: cleanMatric,
          attendancePin: cleanPin,
          assistedReason,
          operatorProfileId,
        });

        setSuccessInfo({
          studentName: cleanMatric,
          message: 'Saved locally in offline queue. Will synchronize when network is restored.',
          isOffline: true,
        });
        onSuccess?.();

        // Auto-clear for next student after 3 seconds
        setTimeout(resetForm, 3200);
      } catch {
        setErrorMessage('Failed to queue offline attendance.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // If online, call Server Action
    try {
      const res = await submitKioskAttendance({
        sessionId,
        matricNumber: cleanMatric,
        attendancePin: cleanPin,
        assistedReason,
        operatorProfileId,
        clientEventId,
      });

      if (!res.success) {
        setErrorMessage(res.message);
      } else {
        setSuccessInfo({
          studentName: res.studentName,
          message: res.message,
          isOffline: false,
        });
        onSuccess?.();
        // Auto-clear for next student after 3 seconds
        setTimeout(resetForm, 3200);
      }
    } catch {
      // If server request fails due to network drop mid-flight, fallback to Dexie
      try {
        await enqueueOfflineAttendance({
          clientEventId,
          sessionId,
          matricNumber: cleanMatric,
          attendancePin: cleanPin,
          assistedReason,
          operatorProfileId,
        });
        setSuccessInfo({
          studentName: cleanMatric,
          message: 'Network interrupted. Saved locally in offline queue.',
          isOffline: true,
        });
        onSuccess?.();
        setTimeout(resetForm, 3200);
      } catch {
        setErrorMessage('Network connection lost and offline store failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden max-w-xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#743c22] text-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#5f321d] flex items-center justify-center font-black text-sm">
              <PhoneOff className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">
                Assisted Attendance Terminal
              </h3>
              <p className="text-xs text-[#eed7c3]">
                CUSTECH Accessibility Kiosk • {courseCode}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-xs px-2.5 py-1 rounded-lg bg-[#5f321d] hover:bg-[#432211] text-[#eed7c3] transition"
            >
              Exit Terminal
            </button>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-[#5f321d] flex items-center justify-between text-xs text-[#eed7c3]">
          <span className="truncate max-w-[280px]">{courseTitle}</span>
          <span className="font-medium text-xs bg-white/15 px-2.5 py-0.5 rounded-full text-white">
            Operator: {operatorName} ({operatorRoleTitle})
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-6">
        {successInfo ? (
          <div className="py-8 flex flex-col items-center text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] flex items-center justify-center mb-4">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-900">
              {successInfo.studentName || 'Student'}
            </h4>
            <p className="text-sm font-bold text-[#8d4a27] mt-1">
              Attendance Recorded
            </p>
            <p className="text-xs text-slate-500 mt-2 max-w-sm">
              {successInfo.message}
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <span>Readying terminal for next student...</span>
              <button
                onClick={resetForm}
                className="underline font-semibold text-slate-700 ml-2"
              >
                Next Student Now
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-500 font-medium">
              Designed for students without smartphones, with depleted batteries, or lacking mobile connectivity.
            </p>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Matriculation Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Student Matriculation Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. 25L1CS1045 or DE 25L2CS1028"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-xs text-slate-400">Quick fill matric:</span>
                <button
                  type="button"
                  onClick={() => {
                    setMatricNumber('25L1CS1045');
                    setAttendancePin('1234');
                  }}
                  className="text-xs text-[#8d4a27] hover:underline font-semibold"
                >
                  Maryam (25L1CS1045)
                </button>
                <span className="text-xs text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setMatricNumber('25L1CS1014');
                    setAttendancePin('1234');
                  }}
                  className="text-xs text-[#8d4a27] hover:underline font-semibold"
                >
                  Amina (25L1CS1014)
                </button>
              </div>
            </div>

            {/* Confidential 4-Digit PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Confidential 4-Digit Attendance PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={attendancePin}
                  onChange={(e) => setAttendancePin(e.target.value.replace(/\D/g, ''))}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Protected against proxy attendance. Managed separately from portal login password.
              </p>
            </div>

            {/* Assisted Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assisted Reason
              </label>
              <select
                value={assistedReason}
                onChange={(e) => setAssistedReason(e.target.value as AssistedReason)}
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
              >
                {ASSISTED_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-sm tracking-wide shadow-sm transition disabled:opacity-50"
            >
              {isLoading ? (
                <span>Validating PIN & Registry...</span>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>MARK ATTENDANCE</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
