'use client';

import React from 'react';
import { DeviceCollisionAlert } from '@/types';
import { resolveDeviceCollisionAction } from '@/actions/advanced';
import { ShieldAlert, CheckCircle2, AlertTriangle, X, Smartphone, UserX, ScanFace } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-rose-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-300" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">
                Anti-Proxy Telemetry: Device &amp; Biometric Integrity Alerts
              </h3>
              <p className="text-xs text-rose-200">
                Flagging shared-device collisions and blocked facial verification proxy attempts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-rose-300 hover:text-white hover:bg-rose-800 transition"
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

        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">
            Displays both device-sharing collisions and blocked facial biometric proxy attempts where one student attempted to mark attendance for another student.
          </p>

          {localAlerts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No device collisions or biometric proxy patterns detected in current sessions.
            </div>
          ) : (
            localAlerts.map((a) => {
              const isBiometric =
                a.alertType === 'BIOMETRIC_PROXY_ATTEMPT' || a.alertType === 'BIOMETRIC_MISMATCH';
              return (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-xs space-y-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                      {isBiometric ? (
                        <ScanFace className="w-4 h-4 shrink-0" />
                      ) : (
                        <Smartphone className="w-4 h-4 shrink-0" />
                      )}
                      <span>
                        {isBiometric
                          ? a.alertType === 'BIOMETRIC_PROXY_ATTEMPT'
                            ? 'Biometric Proxy Attempt Blocked'
                            : 'Facial Verification Mismatch'
                          : `Device Hash: ${a.deviceFingerprintHash}`}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(a.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {a.riskReason && (
                    <p className="text-xs text-rose-900 font-medium bg-white/80 px-3 py-2 rounded-lg border border-rose-100">
                      {a.riskReason}
                    </p>
                  )}

                  <div className="bg-white p-3 rounded-lg border border-rose-100">
                    <p className="text-xs font-semibold text-slate-700 mb-1">
                      Student Accounts Involved ({a.matchedMatricNumbers.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.matchedMatricNumbers.map((matric) => (
                        <span
                          key={matric}
                          className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-100 text-rose-800 border border-rose-200"
                        >
                          {matric}
                        </span>
                      ))}
                    </div>
                    {a.ipAddress && (
                      <p className="text-xs text-slate-400 mt-1 font-mono break-all">
                        Submitting IP: {a.ipAddress}
                      </p>
                    )}
                  </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                  <span className="text-xs text-slate-500">
                    Status:{' '}
                    <strong className="text-slate-800">
                      {a.isReviewed ? a.actionTaken : 'Awaiting Review'}
                    </strong>
                  </span>

                  {!a.isReviewed ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleAction(a.id, 'CLEARED')}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition"
                      >
                        Clear (Legitimate Shared Device)
                      </button>
                      <button
                        onClick={() => handleAction(a.id, 'FLAGGED_DISCIPLINARY')}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 shadow-sm transition"
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
