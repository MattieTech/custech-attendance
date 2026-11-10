'use client';

import React from 'react';
import {
  analyzeVideoFrame,
  captureFaceThumbnail,
  ensureFaceModelsLoaded,
} from '@/lib/face-recognition';
import { averageFaceDescriptors } from '@/lib/biometrics';
import { FaceVerificationSubmission } from '@/types';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  ScanFace,
  Eye,
  Lock,
} from 'lucide-react';

interface FacialVerificationScannerProps {
  mode: 'ENROLL' | 'VERIFY';
  studentName: string;
  matricNumber: string;
  requirePinForEnroll?: boolean;
  onVerified?: (submission: FaceVerificationSubmission) => void;
  onEnrolled?: (payload: {
    descriptor: number[];
    sampleCount: number;
    thumbnailDataUrl?: string;
    attendancePin?: string;
  }) => Promise<{ success: boolean; message: string } | void> | void;
  onCancel?: () => void;
  autoStart?: boolean;
  compact?: boolean;
}

type ScannerPhase =
  | 'IDLE'
  | 'LOADING_MODELS'
  | 'STARTING_CAMERA'
  | 'SCANNING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'ERROR';

export const FacialVerificationScanner: React.FC<FacialVerificationScannerProps> = ({
  mode,
  studentName,
  matricNumber,
  requirePinForEnroll = false,
  onVerified,
  onEnrolled,
  onCancel,
  autoStart = true,
  compact = false,
}) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const loopTimerRef = React.useRef<number | null>(null);
  const isMountedRef = React.useRef(true);

  const [phase, setPhase] = React.useState<ScannerPhase>('IDLE');
  const [statusText, setStatusText] = React.useState<string>('Preparing biometric scanner...');
  const [subHint, setSubHint] = React.useState<string>(
    mode === 'ENROLL'
      ? 'Center your face and blink naturally to register your Face ID.'
      : 'Look into the camera and blink once to verify your identity.'
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [faceState, setFaceState] = React.useState<'NONE' | 'WARN' | 'LOCKED' | 'VERIFIED'>('NONE');
  const [progress, setProgress] = React.useState<number>(0);
  const [livenessBadge, setLivenessBadge] = React.useState<string>('Waiting for face...');
  const [attendancePin, setAttendancePin] = React.useState('');

  // Refs for liveness tracking across frames
  const samplesRef = React.useRef<number[][]>([]);
  const baselineEarRef = React.useRef<number | null>(null);
  const earDipRef = React.useRef<boolean>(false);
  const blinkCountRef = React.useRef<number>(0);
  const minYawRef = React.useRef<number>(0);
  const maxYawRef = React.useRef<number>(0);
  const lastCenterRef = React.useRef<{ x: number; y: number } | null>(null);
  const motionAccumRef = React.useRef<number>(0);
  const livenessPassedRef = React.useRef<boolean>(false);
  const livenessMethodRef = React.useRef<'BLINK' | 'HEAD_TURN' | 'MULTI_FRAME_MOTION'>('BLINK');
  const completedRef = React.useRef<boolean>(false);

  const stopCamera = React.useCallback(() => {
    if (loopTimerRef.current !== null) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetTracking = React.useCallback(() => {
    samplesRef.current = [];
    baselineEarRef.current = null;
    earDipRef.current = false;
    blinkCountRef.current = 0;
    minYawRef.current = 0;
    maxYawRef.current = 0;
    lastCenterRef.current = null;
    motionAccumRef.current = 0;
    livenessPassedRef.current = false;
    completedRef.current = false;
    setProgress(0);
    setFaceState('NONE');
    setLivenessBadge('Position face inside oval');
  }, []);

  const startScanner = React.useCallback(async () => {
    if (mode === 'ENROLL' && requirePinForEnroll && attendancePin.trim().length !== 4) {
      setErrorMsg('Enter your 4-digit Attendance PIN first to authorize Face ID registration.');
      setPhase('IDLE');
      return;
    }

    stopCamera();
    resetTracking();
    setErrorMsg(null);
    setPhase('LOADING_MODELS');
    setStatusText('Loading on-device facial recognition models...');

    try {
      await ensureFaceModelsLoaded();
      if (!isMountedRef.current) return;

      setPhase('STARTING_CAMERA');
      setStatusText('Requesting front camera access...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Camera API is unavailable in this browser context. Please use HTTPS or localhost on a device with a camera.'
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (!isMountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setPhase('SCANNING');
      setStatusText(
        mode === 'ENROLL'
          ? 'Center your face & blink naturally'
          : 'Look at the camera & blink once'
      );
      setSubHint('Keep only your face in the frame with good lighting.');

      const runDetectionLoop = async () => {
        if (!isMountedRef.current || completedRef.current || !videoRef.current) return;

        try {
          const analysis = await analyzeVideoFrame(videoRef.current);
          if (!isMountedRef.current || completedRef.current) return;

          if (analysis.status !== 'OK' || !analysis.descriptor) {
            setFaceState(analysis.status === 'MULTIPLE_FACES' ? 'WARN' : 'NONE');
            setStatusText(analysis.message);
            setLivenessBadge(
              analysis.status === 'MULTIPLE_FACES'
                ? 'Multiple faces detected!'
                : 'Searching for single face...'
            );
          } else {
            setFaceState('LOCKED');

            // 1. Track Eye Aspect Ratio (EAR) for blink detection
            const ear = analysis.ear ?? 0.3;
            if (baselineEarRef.current === null) {
              baselineEarRef.current = ear;
            } else if (!earDipRef.current && ear > baselineEarRef.current) {
              // Gently adapt open-eye baseline
              baselineEarRef.current = baselineEarRef.current * 0.8 + ear * 0.2;
            }

            const blinkDropThreshold = Math.min(0.245, (baselineEarRef.current || 0.3) * 0.82);
            if (ear < blinkDropThreshold) {
              earDipRef.current = true;
            } else if (earDipRef.current && ear > blinkDropThreshold + 0.025) {
              earDipRef.current = false;
              blinkCountRef.current += 1;
            }

            // 2. Track slight head yaw / natural movement across frames
            const yaw = analysis.yawOffset ?? 0;
            if (samplesRef.current.length === 0) {
              minYawRef.current = yaw;
              maxYawRef.current = yaw;
            } else {
              minYawRef.current = Math.min(minYawRef.current, yaw);
              maxYawRef.current = Math.max(maxYawRef.current, yaw);
            }
            const yawSpan = maxYawRef.current - minYawRef.current;

            if (analysis.centerPoint) {
              if (lastCenterRef.current) {
                const dx = analysis.centerPoint.x - lastCenterRef.current.x;
                const dy = analysis.centerPoint.y - lastCenterRef.current.y;
                motionAccumRef.current += Math.sqrt(dx * dx + dy * dy);
              }
              lastCenterRef.current = analysis.centerPoint;
            }

            // Evaluate liveness:
            // Either genuine eye blink OR natural head turn (>0.16 span) OR sustained micro-motion across 5+ frames
            const hasBlink = blinkCountRef.current >= 1 || earDipRef.current;
            const hasHeadTurn = yawSpan >= 0.16;
            const hasNaturalMotion = motionAccumRef.current >= 0.025 && samplesRef.current.length >= 4;

            if (hasBlink) {
              livenessPassedRef.current = true;
              livenessMethodRef.current = 'BLINK';
            } else if (hasHeadTurn) {
              livenessPassedRef.current = true;
              livenessMethodRef.current = 'HEAD_TURN';
            } else if (hasNaturalMotion) {
              livenessPassedRef.current = true;
              livenessMethodRef.current = 'MULTI_FRAME_MOTION';
            }

            // Collect straight-ish face descriptor samples
            if (Math.abs(yaw) < 0.45) {
              samplesRef.current.push(analysis.descriptor);
            }

            const targetSamples = mode === 'ENROLL' ? 4 : 3;
            const samplePct = Math.min(70, Math.round((samplesRef.current.length / targetSamples) * 70));
            const livenessPct = livenessPassedRef.current ? 30 : 10;
            setProgress(Math.min(98, samplePct + livenessPct));

            if (!livenessPassedRef.current) {
              setStatusText('Face detected — please blink naturally or turn slightly');
              setLivenessBadge('Liveness check: Blink eyes');
            } else {
              setStatusText('Liveness verified! Capturing biometric signature...');
              setLivenessBadge('Liveness passed');
            }

            // Check completion condition
            if (livenessPassedRef.current && samplesRef.current.length >= targetSamples) {
              completedRef.current = true;
              setProgress(100);
              setFaceState('VERIFIED');
              setPhase('PROCESSING');
              setStatusText(
                mode === 'ENROLL'
                  ? 'Saving encrypted Face ID template...'
                  : 'Verifying face against student registry...'
              );

              const averaged = averageFaceDescriptors(samplesRef.current);
              const thumbnail = captureFaceThumbnail(videoRef.current);
              stopCamera();

              if (mode === 'ENROLL' && onEnrolled) {
                const enrollRes = await onEnrolled({
                  descriptor: averaged,
                  sampleCount: samplesRef.current.length,
                  thumbnailDataUrl: thumbnail,
                  attendancePin: requirePinForEnroll ? attendancePin.trim() : undefined,
                });
                if (!isMountedRef.current) return;
                if (enrollRes && !enrollRes.success) {
                  setPhase('ERROR');
                  setErrorMsg(enrollRes.message);
                  return;
                }
                setPhase('SUCCESS');
                setStatusText(enrollRes?.message || 'Face ID registered successfully!');
              } else if (mode === 'VERIFY' && onVerified) {
                setPhase('SUCCESS');
                setStatusText('Facial biometric scan captured. Verifying identity...');
                onVerified({
                  descriptor: averaged,
                  livenessPassed: true,
                  livenessChallenge: livenessMethodRef.current,
                  blinkDetected: blinkCountRef.current > 0,
                  motionScore: Number(motionAccumRef.current.toFixed(4)),
                  capturedAt: new Date().toISOString(),
                });
              }
              return;
            }
          }
        } catch (err) {
          if (!isMountedRef.current) return;
          console.error('Facial scan frame error:', err);
        }

        if (isMountedRef.current && !completedRef.current) {
          loopTimerRef.current = window.setTimeout(runDetectionLoop, 220);
        }
      };

      loopTimerRef.current = window.setTimeout(runDetectionLoop, 260);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      stopCamera();
      setPhase('ERROR');
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to access camera. Please allow camera permissions and try again.';
      setErrorMsg(msg);
      setStatusText('Camera or biometric model initialization failed.');
    }
  }, [attendancePin, mode, onEnrolled, onVerified, requirePinForEnroll, resetTracking, stopCamera]);

  React.useEffect(() => {
    isMountedRef.current = true;
    if (autoStart && !(mode === 'ENROLL' && requirePinForEnroll)) {
      startScanner();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [autoStart, mode, requirePinForEnroll, startScanner, stopCamera]);

  const ringColor =
    faceState === 'VERIFIED'
      ? 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.55)]'
      : faceState === 'LOCKED'
      ? 'border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
      : faceState === 'WARN'
      ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.55)]'
      : 'border-white/60';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-[#fbf5ef] border-b border-[#ecdacb] px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#8d4a27] text-white flex items-center justify-center shrink-0">
            <ScanFace className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900">
              {mode === 'ENROLL' ? 'Student Face ID Enrollment' : 'Live Facial Identity Verification'}
            </h4>
            <p className="text-[11px] text-[#8d4a27] font-semibold">
              {studentName} • {matricNumber}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#ecdacb] text-[#743c22] flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-[#8d4a27]" />
          <span>Anti-Proxy Guard</span>
        </span>
      </div>

      <div className={compact ? 'p-3 space-y-3' : 'p-4 space-y-4'}>
        {/* Optional PIN authorization for unauthenticated first-time enrollment */}
        {mode === 'ENROLL' && requirePinForEnroll && phase === 'IDLE' && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-amber-900">
              <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">First-Time Face ID Setup</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Enter your confidential 4-digit Attendance PIN (default demo PIN is <code className="font-mono font-bold">1234</code>) so only you can bind your face to {matricNumber}.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                value={attendancePin}
                onChange={(e) => setAttendancePin(e.target.value.replace(/\D/g, ''))}
                placeholder="4-digit PIN"
                className="flex-1 px-3 py-2 rounded-lg border border-amber-300 bg-white text-center font-mono font-black tracking-widest text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
              />
              <button
                type="button"
                onClick={startScanner}
                disabled={attendancePin.trim().length !== 4}
                className="px-4 py-2 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Start Face Scan</span>
              </button>
            </div>
          </div>
        )}

        {/* Camera Viewport */}
        <div
          className={`relative w-full ${
            compact ? 'h-56' : 'h-64 sm:h-72'
          } rounded-2xl bg-slate-950 overflow-hidden flex items-center justify-center`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Face Guide Oval Overlay */}
          {(phase === 'SCANNING' || phase === 'STARTING_CAMERA' || phase === 'LOADING_MODELS') && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div
                className={`w-40 h-52 sm:w-44 sm:h-56 rounded-[50%] border-2 transition-all duration-200 ${ringColor}`}
              />
              <div className="mt-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-[11px] font-bold text-white flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-300" />
                <span>{livenessBadge}</span>
              </div>
            </div>
          )}

          {/* Loading Models / Camera Overlay */}
          {(phase === 'LOADING_MODELS' || phase === 'STARTING_CAMERA' || phase === 'PROCESSING') && (
            <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center text-white text-center p-4 space-y-2">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs font-bold">{statusText}</p>
            </div>
          )}

          {/* Success Overlay */}
          {phase === 'SUCCESS' && (
            <div className="absolute inset-0 bg-emerald-950/85 flex flex-col items-center justify-center text-white text-center p-4 space-y-2">
              <CheckCircle2 className="w-11 h-11 text-emerald-400" />
              <p className="text-sm font-black">Biometric Check Complete</p>
              <p className="text-xs text-emerald-100 max-w-xs">{statusText}</p>
            </div>
          )}

          {/* Idle Overlay */}
          {phase === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white text-center p-4 space-y-2">
              <ScanFace className="w-10 h-10 text-amber-400" />
              <p className="text-xs font-bold">Camera Ready for Biometric Scan</p>
              {!requirePinForEnroll && (
                <button
                  type="button"
                  onClick={startScanner}
                  className="mt-1 px-4 py-2 rounded-lg bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Activate Camera</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {phase === 'SCANNING' && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-700">{statusText}</span>
              <span className="text-[#8d4a27] font-mono">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#8d4a27] transition-all duration-200 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{subHint}</p>
          </div>
        )}

        {/* Error Alert */}
        {(phase === 'ERROR' || errorMsg) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg || statusText}</span>
            </div>
            <button
              type="button"
              onClick={startScanner}
              className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Facial Scan</span>
            </button>
          </div>
        )}

        {/* Footer Actions */}
        {onCancel && phase !== 'SUCCESS' && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
