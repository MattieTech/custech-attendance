'use client';

import React from 'react';
import { submitQrAttendance, submitCodeAttendance } from '@/actions/attendance';
import { RotatingQrPayload } from '@/types';
import { QrCode, Key, Camera, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface QrScannerModalProps {
  sessionId: string;
  courseCode: string;
  studentProfileId: string;
  onClose: () => void;
  onSuccess: (statusMessage: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  sessionId,
  courseCode,
  studentProfileId,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = React.useState<'SCANNER' | 'CODE'>('CODE');
  const [tempCode, setTempCode] = React.useState('');
  const [simulatedTokenInput, setSimulatedTokenInput] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<{ isError: boolean; message: string } | null>(null);

  // Submit 6-digit session code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempCode.trim()) {
      setFeedback({ isError: true, message: 'Please enter the 6-digit code shown on screen.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    try {
      const res = await submitCodeAttendance(sessionId, tempCode.trim(), studentProfileId);
      if (res.success) {
        setFeedback({ isError: false, message: res.message });
        setTimeout(() => {
          onSuccess(res.message);
          onClose();
        }, 1500);
      } else {
        setFeedback({ isError: true, message: res.message });
      }
    } catch {
      setFeedback({ isError: true, message: 'Network error submitting attendance code.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Scanned QR Token (or pasted payload from camera stream)
  const handleTokenSubmit = async (tokenString: string) => {
    try {
      setIsLoading(true);
      setFeedback(null);
      const parsed: RotatingQrPayload = JSON.parse(tokenString);
      const res = await submitQrAttendance(parsed, studentProfileId);

      if (res.success) {
        setFeedback({ isError: false, message: res.message });
        setTimeout(() => {
          onSuccess(res.message);
          onClose();
        }, 1500);
      } else {
        setFeedback({ isError: true, message: res.message });
      }
    } catch {
      setFeedback({ isError: true, message: 'Invalid or corrupted QR token.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
              Record Attendance: {courseCode}
            </h3>
            <p className="text-[11px] text-zinc-500">Scan QR or enter 6-digit code</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1.5 bg-zinc-100 dark:bg-zinc-800/80 m-4 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('CODE');
              setFeedback(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'CODE'
                ? 'bg-white dark:bg-zinc-900 text-[#743c22] dark:text-[#eed7c3] shadow-xs'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Enter Code</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('SCANNER');
              setFeedback(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'SCANNER'
                ? 'bg-white dark:bg-zinc-900 text-[#743c22] dark:text-[#eed7c3] shadow-xs'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera Scan</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
              feedback.isError
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-[#fbf5ef] border border-[#ecdacb] text-[#8d4a27] font-semibold'
            }`}
          >
            {feedback.isError ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Tab 1: Temporary 6-Digit Code */}
        {activeTab === 'CODE' && (
          <form onSubmit={handleCodeSubmit} className="p-4 pt-0 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                6-Character Temporary Code
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 7K4P92"
                value={tempCode}
                onChange={(e) => setTempCode(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 font-mono text-center text-2xl font-black tracking-widest uppercase focus:outline-hidden focus:ring-2 focus:ring-[#8d4a27]"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1 text-center">
                Look at the lecturer’s screen or projector for today’s active code
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || tempCode.length < 6}
              className="w-full py-3 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white font-bold text-xs tracking-wider uppercase transition shadow-xs disabled:opacity-50"
            >
              {isLoading ? 'Verifying Code...' : 'Submit Attendance'}
            </button>
          </form>
        )}

        {/* Tab 2: Camera Scanner & Simulation */}
        {activeTab === 'SCANNER' && (
          <div className="p-4 pt-0 space-y-4">
            <div className="p-6 rounded-2xl bg-slate-950 text-white flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="w-48 h-48 border-2 border-[#8d4a27] border-dashed rounded-xl flex flex-col items-center justify-center p-4 relative">
                <QrCode className="w-16 h-16 text-[#8d4a27] animate-pulse" />
                <span className="text-[11px] text-slate-400 mt-2">
                  Align camera with Dynamic QR code
                </span>
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#8d4a27]/90 shadow-[0_0_8px_#8d4a27] animate-bounce" />
              </div>
            </div>

            {/* Quick Scanner Helper for Browser Testing */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 mb-1">
                Quick Simulation Input (paste payload or use code tab):
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder='Paste JSON payload {"sessionId":...}'
                  value={simulatedTokenInput}
                  onChange={(e) => setSimulatedTokenInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 font-mono"
                />
                <button
                  type="button"
                  onClick={() => handleTokenSubmit(simulatedTokenInput)}
                  disabled={!simulatedTokenInput || isLoading}
                  className="px-3 py-1.5 bg-[#8d4a27] hover:bg-[#743c22] text-white rounded-lg text-xs font-bold disabled:opacity-50"
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
