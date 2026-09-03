'use client';

import React from 'react';
import { DeviceCollisionAlert } from '@/types';
import { resolveDeviceCollisionAction } from '@/actions/advanced';
import { ShieldAlert, CheckCircle2, AlertTriangle, X, Smartphone, UserX } from 'lucide-react';

interface FraudMonitoringModalProps {
  alerts: DeviceCollisionAlert[];
  reviewerId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const FraudMonitoringModal: React.FC<FraudMonitoringModalProps> = ({
  alerts,
  reviewerId,
  onClose,
  onUpdate,
}) => {
  const [localAlerts, setLocalAlerts] = React.useState(alerts);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleAction = async (alertId: string, action: 'CLEARED' | 'FLAGGED_DISCIPLINARY') => {
    try {
      await resolveDeviceCollisionAction(alertId, reviewerId, action);
      setLocalAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isReviewed: true, actionTaken: action } : a))
      );
      setFeedback(`Alert marked as ${action.replace('_', ' ')}.`);
      onUpdate();
      setTimeout(() => setFeedback(null), 3000);
    } catch {
      alert('Failed to resolve alert');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-rose-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-300" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">
                Anti-Proxy Telemetry: Device Collision Alerts
              </h3>
              <p className="text-[11px] text-rose-200">
                Flagging multiple student accounts submitting from the identical device
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div className="p-3 bg-[#fbf5ef] text-[#8d4a27] text-xs font-bold border-b border-[#ecdacb] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedback}</span>
          </div>
        )}

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          <p className="text-xs text-zinc-500">
            When multiple students log in on the same browser/phone within minutes during an active lecture, the system flags the records for lecturer/HOD review without automatically punishing innocent students who may have borrowed a phone.
          </p>

          {localAlerts.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-400 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              No device collisions or proxy patterns detected in current sessions.
            </div>
          ) : (
            localAlerts.map((a) => (
              <div
                key={a.id}
                className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold">
                    <Smartphone className="w-4 h-4" />
                    <span>Device Hash: {a.deviceFingerprintHash}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    {new Date(a.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg border border-rose-100 dark:border-rose-900/40">
                  <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Student Accounts Marked from this Single Device ({a.matchedMatricNumbers.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.matchedMatricNumbers.map((matric) => (
                      <span
                        key={matric}
                        className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                      >
                        {matric}
                      </span>
                    ))}
                  </div>
                  {a.ipAddress && (
                    <p className="text-[10px] text-zinc-400 mt-1 font-mono">
                      Submitting IP: {a.ipAddress}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-zinc-500">
                    Status:{' '}
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      {a.isReviewed ? a.actionTaken : 'Awaiting Review'}
                    </strong>
                  </span>

                  {!a.isReviewed ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(a.id, 'CLEARED')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50"
                      >
                        Clear (Legitimate Shared Device)
                      </button>
                      <button
                        onClick={() => handleAction(a.id, 'FLAGGED_DISCIPLINARY')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 shadow-xs"
                      >
                        Flag for Disciplinary Review
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#8d4a27]">
                      ✓ Action Logged in Audit Trail
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
