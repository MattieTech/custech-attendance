'use client';

import React from 'react';
import {
  submitQrAttendance,
  submitCodeAttendance,
  submitAttendanceByCourseAndCode,
  submitAttendanceFromUrl,
} from '@/actions/attendance';
import { RotatingQrPayload } from '@/types';
import { enqueueOfflineAttendance } from '@/lib/offline/dexie-db';
import { QrCode, Key, Camera, AlertCircle, CheckCircle2, X, BookOpen, Link as LinkIcon, WifiOff } from 'lucide-react';

interface QrScannerModalProps {
  sessionId?: string;
  courseCode?: string;
  studentProfileId: string;
  onClose: () => void;
  onSuccess: (statusMessage: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  sessionId,
  courseCode: initialCourseCode = '',
  studentProfileId,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = React.useState<'CODE' | 'SCANNER'>('CODE');
  const [courseCode, setCourseCode] = React.useState(initialCourseCode);
  const [tempCode, setTempCode] = React.useState('');
  const [scannedUrlInput, setScannedUrlInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ isError: boolean; message: string } | null>(null);

  // Submit Course Code + 6-digit session code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCourse = courseCode.trim().toUpperCase();
    const cleanCode = tempCode.trim().toUpperCase();

    if (!cleanCourse) {
      setFeedback({ isError: true, message: 'Please enter the course code (e.g. CSC 201).' });
      return;
    }

    if (!cleanCode) {
      setFeedback({ isError: true, message: 'Please enter the 6-character code displayed on screen.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      let res;
      if (sessionId) {
        // If tied directly to a session
        res = await submitCodeAttendance(sessionId, cleanCode, studentProfileId);
      } else {
        // Find session dynamically by course code
        res = await submitAttendanceByCourseAndCode(cleanCourse, cleanCode, studentProfileId);
      }

      if (res.success) {
        setFeedback({ isError: false, message: res.message });
        setTimeout(() => {
          onSuccess(res.message);
          onClose();
        }, 1200);
      } else {
        setFeedback({ isError: true, message: res.message });
      }
    } catch {
      // If offline or network connection fails, store securely in Dexie IndexedDB
      try {
        const clientEventId = `off_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        await enqueueOfflineAttendance({
          clientEventId,
          sessionId: sessionId || 'offline_session',
          matricNumber: studentProfileId,
          attendancePin: cleanCode,
          assistedReason: 'No internet / mobile data',
          operatorProfileId: studentProfileId,
          courseCode: cleanCourse,
        });

        setFeedback({
          isError: false,
          message: 'Saved Offline! Recorded in local device storage and will automatically upload once internet connects.',
        });
        setTimeout(() => {
          onSuccess('Recorded offline in device storage');
          onClose();
        }, 1800);
      } catch {
        setFeedback({ isError: true, message: 'Network error submitting attendance. Please try again.' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Scanned Camera URL or Code
  const handleUrlOrCodeSubmit = async (inputStr: string) => {
    const raw = inputStr.trim();
    if (!raw) return;

    setIsLoading(true);
    setFeedback(null);

    try {
      // 1. If it's a direct URL (/attend?...)
      if (raw.includes('/attend') || raw.startsWith('http')) {
        const urlObj = new URL(raw, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000');
        const sId = urlObj.searchParams.get('sessionId') || urlObj.searchParams.get('session');
        const cCode = urlObj.searchParams.get('course') || urlObj.searchParams.get('courseCode') || courseCode;
        const tw = urlObj.searchParams.get('tw') || urlObj.searchParams.get('timestampWindow');
        const nonce = urlObj.searchParams.get('nonce');
        const sig = urlObj.searchParams.get('sig') || urlObj.searchParams.get('signature');
        const code = urlObj.searchParams.get('code');

        if (!sId) {
          setFeedback({ isError: true, message: 'Invalid attendance link format.' });
          setIsLoading(false);
          return;
        }

        const res = await submitAttendanceFromUrl({
          sessionId: sId,
          courseCode: cCode || undefined,
          timestampWindow: tw ? Number(tw) : undefined,
          nonce: nonce || undefined,
          signature: sig || undefined,
          code: code || undefined,
          studentProfileId,
        });

        if (res.success) {
          setFeedback({ isError: false, message: res.message });
          setTimeout(() => {
            onSuccess(res.message);
            onClose();
          }, 1200);
        } else {
          setFeedback({ isError: true, message: res.message });
        }
        return;
      }

      // 2. If user pasted a 6-digit code into this box
      if (raw.length <= 8 && !raw.includes('{')) {
        const targetCourse = courseCode.trim() || initialCourseCode || 'CSC 201';
        const res = await submitAttendanceByCourseAndCode(targetCourse, raw, studentProfileId);
        if (res.success) {
          setFeedback({ isError: false, message: res.message });
          setTimeout(() => {
            onSuccess(res.message);
            onClose();
          }, 1200);
        } else {
          setFeedback({ isError: true, message: res.message });
        }
        return;
      }

      // 3. Fallback: If legacy JSON token was somehow pasted
      if (raw.startsWith('{') && raw.endsWith('}')) {
        const parsed: RotatingQrPayload = JSON.parse(raw);
        const res = await submitQrAttendance(parsed, studentProfileId);
        if (res.success) {
          setFeedback({ isError: false, message: res.message });
          setTimeout(() => {
            onSuccess(res.message);
            onClose();
          }, 1200);
        } else {
          setFeedback({ isError: true, message: res.message });
        }
        return;
      }

      setFeedback({ isError: true, message: 'Unrecognized attendance code or link. Please check your input.' });
    } catch {
      setFeedback({ isError: true, message: 'Invalid attendance input.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#fbf5ef]">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900">
              Record Attendance
            </h3>
            <p className="text-xs text-[#8d4a27] font-medium">
              CUSTECH Academic Presence System
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 m-4 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('CODE');
              setFeedback(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'CODE'
                ? 'bg-white text-[#743c22] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Enter Lecture Code</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('SCANNER');
              setFeedback(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'SCANNER'
                ? 'bg-white text-[#743c22] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera QR Scan</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-4 mb-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.isError
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold'
            }`}
          >
            {feedback.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: Course Code & 6-Character Temporary Code */}
        {activeTab === 'CODE' && (
          <form onSubmit={handleCodeSubmit} className="p-4 pt-0 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#8d4a27]" />
                Course Code
              </label>
              <input
                type="text"
                list="custech-course-list"
                placeholder="e.g. CSC 201 or SEN 201"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-bold text-sm tracking-wide uppercase focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                autoFocus
              />
              <datalist id="custech-course-list">
                <option value="CSC 201">CSC 201: Data Structures and Algorithms</option>
                <option value="SEN 201">SEN 201: Software Requirements & Architecture</option>
                <option value="MTH 201">MTH 201: Linear Algebra</option>
                <option value="PHY 201">PHY 201: General Physics</option>
                <option value="SWE 201">SWE 201: Software Engineering Fundamentals</option>
                <option value="GST 111">GST 111: Communication in English</option>
              </datalist>
              <p className="text-xs text-slate-400 mt-1">
                Type the code of the course you are currently attending.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#8d4a27]" />
                6-Character Lecture Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 7K4P92"
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-900 font-mono text-center text-2xl font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
              />
              <p className="text-xs text-slate-400 mt-1 text-center">
                Check the lecturer’s screen or projector for today’s active code.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !courseCode.trim() || tempCode.trim().length < 4}
              className="w-full py-3 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs tracking-wider uppercase transition shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Verifying with CUSTECH Database...' : 'Mark Me Present'}
            </button>
          </form>
        )}

        {/* Tab 2: Camera Scanner Guidance & Direct URL Scan */}
        {activeTab === 'SCANNER' && (
          <div className="p-4 pt-0 space-y-4">
            <div className="p-6 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-48 h-48 border-2 border-[#8d4a27] border-dashed rounded-xl flex flex-col items-center justify-center p-4 relative">
                <QrCode className="w-16 h-16 text-[#8d4a27] animate-pulse" />
                <span className="text-xs text-slate-300 font-medium mt-2">
                  Scan Projected Dynamic QR Code
                </span>
                <span className="text-[10px] text-slate-400">
                  Using your regular phone camera
                </span>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#8d4a27]/90 shadow-[0_0_8px_#8d4a27] animate-bounce" />
              </div>
            </div>

            <div className="bg-[#fbf5ef] p-3 rounded-xl border border-[#ecdacb] text-xs text-slate-700 space-y-1">
              <p className="font-bold text-[#8d4a27] flex items-center gap-1">
                <span>Direct Camera Scan:</span>
              </p>
              <p className="text-xs text-slate-600">
                1. Open your regular phone camera (no special app needed).
              </p>
              <p className="text-xs text-slate-600">
                2. Point at the projected QR code on the lecture screen.
              </p>
              <p className="text-xs text-slate-600">
                3. Tap the link that appears to automatically mark your attendance!
              </p>
            </div>

            {/* Quick URL or Link Verification */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-[#8d4a27]" />
                Paste Attendance Link or Code:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste URL or 6-digit lecture code"
                  value={scannedUrlInput}
                  onChange={(e) => setScannedUrlInput(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 font-sans focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
                />
                <button
                  type="button"
                  onClick={() => handleUrlOrCodeSubmit(scannedUrlInput)}
                  disabled={!scannedUrlInput.trim() || isLoading}
                  className="px-4 py-2 bg-[#8d4a27] hover:bg-[#743c22] text-white rounded-lg text-xs font-bold shadow-sm transition disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
