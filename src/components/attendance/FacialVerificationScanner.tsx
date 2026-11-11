'use client';

import React from 'react';
import {
  analyzeVideoFrame,
  captureFaceThumbnail,
  ensureFaceModelsLoaded,
  FrameFaceAnalysis,
  Point2D,
} from '@/lib/face-recognition';
import { averageFaceDescriptors } from '@/lib/biometrics';
import { FaceVerificationSubmission } from '@/types';
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
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

interface LiveTelemetry {
  score: number | null;
  ear: number | null;
  yaw: number | null;
  faceCount: number;
  faceLocked: boolean;
  livenessPassed: boolean;
}

const CONTOUR_GROUPS: Array<{ indices: number[]; close?: boolean }> = [
  { indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] }, // Jawline
  { indices: [17, 18, 19, 20, 21] }, // Left eyebrow
  { indices: [22, 23, 24, 25, 26] }, // Right eyebrow
  { indices: [27, 28, 29, 30] }, // Nose bridge
  { indices: [31, 32, 33, 34, 35] }, // Nose base
  { indices: [36, 37, 38, 39, 40, 41], close: true }, // Left eye
  { indices: [42, 43, 44, 45, 46, 47], close: true }, // Right eye
  { indices: [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59], close: true }, // Outer lips
  { indices: [60, 61, 62, 63, 64, 65, 66, 67], close: true }, // Inner lips
];

const MESH_BRIDGES: Array<[number, number]> = [
  [17, 36],
  [21, 27],
  [22, 27],
  [26, 45],
  [36, 31],
  [39, 27],
  [42, 27],
  [45, 35],
  [30, 31],
  [30, 35],
  [30, 48],
  [30, 54],
  [2, 31],
  [14, 35],
  [4, 48],
  [12, 54],
  [8, 57],
];

const ANCHOR_INDICES = [0, 8, 16, 19, 24, 27, 30, 33, 36, 39, 42, 45, 48, 54];

/**
 * Draws a real-time mirrored biometric wireframe mesh, eye reticles,
 * and dynamic target corner brackets directly onto the overlay canvas.
 */
function drawBiometricHudOverlay(
  canvas: HTMLCanvasElement,
  analysis: FrameFaceAnalysis,
  livenessPassed: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (cw === 0 || ch === 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cw, ch);

  const vw = analysis.videoWidth || 0;
  const vh = analysis.videoHeight || 0;
  if (!vw || !vh || !analysis.box) {
    ctx.restore();
    return;
  }

  // Exact object-cover + horizontal mirror transform matching <video className="object-cover scale-x-[-1]">
  const scale = Math.max(cw / vw, ch / vh);
  const renderedW = vw * scale;
  const renderedH = vh * scale;
  const offsetX = (cw - renderedW) / 2;
  const offsetY = (ch - renderedH) / 2;

  const mapPt = (pt: Point2D): Point2D => ({
    x: cw - (pt.x * scale + offsetX),
    y: pt.y * scale + offsetY,
  });

  const primaryColor =
    analysis.status === 'MULTIPLE_FACES'
      ? '#f43f5e'
      : analysis.status !== 'OK'
      ? '#e8b88a'
      : livenessPassed
      ? '#10b981'
      : '#eed7c3';

  const glowColor =
    analysis.status === 'MULTIPLE_FACES'
      ? 'rgba(244, 63, 94, 0.45)'
      : analysis.status !== 'OK'
      ? 'rgba(232, 184, 138, 0.45)'
      : livenessPassed
      ? 'rgba(16, 185, 129, 0.45)'
      : 'rgba(238, 215, 195, 0.45)';

  // 1. Dynamic Face Bounding Box Corner Brackets
  const boxTopRight = mapPt({ x: analysis.box.x, y: analysis.box.y });
  const boxBottomLeft = mapPt({
    x: analysis.box.x + analysis.box.width,
    y: analysis.box.y + analysis.box.height,
  });
  const bx = Math.min(boxTopRight.x, boxBottomLeft.x) - 10;
  const by = Math.min(boxTopRight.y, boxBottomLeft.y) - 14;
  const bw = Math.abs(boxBottomLeft.x - boxTopRight.x) + 20;
  const bh = Math.abs(boxBottomLeft.y - boxTopRight.y) + 24;
  const corner = Math.max(12, Math.min(24, bw * 0.16));

  ctx.strokeStyle = primaryColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;

  ctx.beginPath();
  // Top-left
  ctx.moveTo(bx, by + corner);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + corner, by);
  // Top-right
  ctx.moveTo(bx + bw - corner, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw, by + corner);
  // Bottom-left
  ctx.moveTo(bx, by + bh - corner);
  ctx.lineTo(bx, by + bh);
  ctx.lineTo(bx + corner, by + bh);
  // Bottom-right
  ctx.moveTo(bx + bw - corner, by + bh);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw, by + bh - corner);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 2. Live 68-Point Facial Mesh & Contours
  if (analysis.landmarks && analysis.landmarks.length >= 68) {
    const pts = analysis.landmarks.map(mapPt);

    // Subtle 3D mesh triangulation bridges
    ctx.strokeStyle = livenessPassed
      ? 'rgba(52, 211, 153, 0.25)'
      : 'rgba(238, 215, 195, 0.25)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    for (const [a, b] of MESH_BRIDGES) {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();

    // Primary facial feature contours
    ctx.strokeStyle = livenessPassed
      ? 'rgba(52, 211, 153, 0.78)'
      : 'rgba(238, 215, 195, 0.78)';
    ctx.lineWidth = 1.15;
    for (const group of CONTOUR_GROUPS) {
      ctx.beginPath();
      group.indices.forEach((idx, i) => {
        const p = pts[idx];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      if (group.close) ctx.closePath();
      ctx.stroke();
    }

    // Eye targeting reticles (Left & Right eye centers)
    const drawEyeReticle = (indices: number[]) => {
      let cx = 0;
      let cy = 0;
      indices.forEach((i) => {
        cx += pts[i].x;
        cy += pts[i].y;
      });
      cx /= indices.length;
      cy /= indices.length;

      ctx.strokeStyle = livenessPassed ? '#34d399' : '#eed7c3';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 10, cy);
      ctx.lineTo(cx - 5, cy);
      ctx.moveTo(cx + 5, cy);
      ctx.lineTo(cx + 10, cy);
      ctx.stroke();
    };
    drawEyeReticle([36, 37, 38, 39, 40, 41]);
    drawEyeReticle([42, 43, 44, 45, 46, 47]);

    // Glowing anchor nodes
    ctx.fillStyle = livenessPassed ? '#6ee7b7' : '#fbf5ef';
    for (const idx of ANCHOR_INDICES) {
      const p = pts[idx];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

const TOTAL_HUD_TICKS = 48;

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
  const overlayCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const loopTimerRef = React.useRef<number | null>(null);
  const isMountedRef = React.useRef(true);

  const [phase, setPhase] = React.useState<ScannerPhase>('IDLE');
  const [statusText, setStatusText] = React.useState<string>('Ready for facial verification');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [faceState, setFaceState] = React.useState<'NONE' | 'WARN' | 'LOCKED' | 'VERIFIED'>('NONE');
  const [progress, setProgress] = React.useState<number>(0);
  const [livenessBadge, setLivenessBadge] = React.useState<string>('Position your face');
  const [attendancePin, setAttendancePin] = React.useState('');
  const [telemetry, setTelemetry] = React.useState<LiveTelemetry>({
    score: null,
    ear: null,
    yaw: null,
    faceCount: 0,
    faceLocked: false,
    livenessPassed: false,
  });

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

  const clearOverlayCanvas = React.useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

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
    clearOverlayCanvas();
  }, [clearOverlayCanvas]);

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
    setLivenessBadge('Position your face');
    setTelemetry({
      score: null,
      ear: null,
      yaw: null,
      faceCount: 0,
      faceLocked: false,
      livenessPassed: false,
    });
    clearOverlayCanvas();
  }, [clearOverlayCanvas]);

  const startScanner = React.useCallback(async () => {
    if (mode === 'ENROLL' && requirePinForEnroll && attendancePin.trim().length !== 4) {
      setErrorMsg('Enter your 4-digit PIN to begin.');
      setPhase('IDLE');
      return;
    }

    stopCamera();
    resetTracking();
    setErrorMsg(null);
    setPhase('LOADING_MODELS');
    setStatusText('Preparing camera...');

    try {
      await ensureFaceModelsLoaded();
      if (!isMountedRef.current) return;

      setPhase('STARTING_CAMERA');
      setStatusText('Starting camera...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          'Camera access is unavailable in this browser. Please use HTTPS on a device with a camera.'
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
      setStatusText('Look at the camera & blink once');

      const runDetectionLoop = async () => {
        if (!isMountedRef.current || completedRef.current || !videoRef.current) return;

        try {
          const analysis = await analyzeVideoFrame(videoRef.current);
          if (!isMountedRef.current || completedRef.current) return;

          if (overlayCanvasRef.current) {
            drawBiometricHudOverlay(overlayCanvasRef.current, analysis, livenessPassedRef.current);
          }

          if (analysis.status !== 'OK' || !analysis.descriptor) {
            setFaceState(analysis.status === 'MULTIPLE_FACES' ? 'WARN' : 'NONE');
            setStatusText(analysis.message);
            setLivenessBadge(
              analysis.status === 'MULTIPLE_FACES'
                ? 'One face only'
                : analysis.status === 'TOO_FAR'
                ? 'Move closer'
                : analysis.status === 'OFF_CENTER'
                ? 'Center your face'
                : 'Position your face'
            );
            setTelemetry({
              score: analysis.score ?? null,
              ear: null,
              yaw: null,
              faceCount: analysis.faceCount,
              faceLocked: false,
              livenessPassed: livenessPassedRef.current,
            });
          } else {
            setFaceState('LOCKED');

            // 1. Track Eye Aspect Ratio (EAR) for blink detection
            const ear = analysis.ear ?? 0.3;
            if (baselineEarRef.current === null) {
              baselineEarRef.current = ear;
            } else if (!earDipRef.current && ear > baselineEarRef.current) {
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

            if (Math.abs(yaw) < 0.45) {
              samplesRef.current.push(analysis.descriptor);
            }

            const targetSamples = mode === 'ENROLL' ? 4 : 3;
            const samplePct = Math.min(70, Math.round((samplesRef.current.length / targetSamples) * 70));
            const livenessPct = livenessPassedRef.current ? 30 : 10;
            setProgress(Math.min(98, samplePct + livenessPct));

            setTelemetry({
              score: analysis.score ?? null,
              ear,
              yaw,
              faceCount: 1,
              faceLocked: true,
              livenessPassed: livenessPassedRef.current,
            });

            if (!livenessPassedRef.current) {
              setStatusText('Hold still — blink naturally');
              setLivenessBadge('Blink naturally');
            } else {
              setStatusText('Scanning face...');
              setLivenessBadge('Blink detected ✓');
            }

            // Completion condition
            if (livenessPassedRef.current && samplesRef.current.length >= targetSamples) {
              completedRef.current = true;
              setProgress(100);
              setFaceState('VERIFIED');
              setPhase('PROCESSING');
              setStatusText(
                mode === 'ENROLL'
                  ? 'Saving Face ID...'
                  : 'Verifying identity...'
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
                setStatusText(enrollRes?.message || 'Face ID saved!');
              } else if (mode === 'VERIFY' && onVerified) {
                setPhase('SUCCESS');
                setStatusText('Verified! Recording attendance...');
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
          loopTimerRef.current = window.setTimeout(runDetectionLoop, 180);
        }
      };

      loopTimerRef.current = window.setTimeout(runDetectionLoop, 220);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      stopCamera();
      setPhase('ERROR');
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to access camera. Please allow camera permissions and try again.';
      setErrorMsg(msg);
      setStatusText('Could not start camera.');
    }
  }, [attendancePin, mode, onEnrolled, onVerified, requirePinForEnroll, resetTracking, stopCamera]);

  React.useEffect(() => {
    isMountedRef.current = true;
    let startTimer: number | null = null;
    if (autoStart && !(mode === 'ENROLL' && requirePinForEnroll)) {
      startTimer = window.setTimeout(() => {
        if (isMountedRef.current) {
          void startScanner();
        }
      }, 0);
    }
    return () => {
      if (startTimer !== null) {
        window.clearTimeout(startTimer);
      }
      isMountedRef.current = false;
      stopCamera();
    };
  }, [autoStart, mode, requirePinForEnroll, startScanner, stopCamera]);

  const activeTicks = Math.round((progress / 100) * TOTAL_HUD_TICKS);

  const tickStrokeActive =
    faceState === 'VERIFIED' || telemetry.livenessPassed
      ? '#10b981'
      : faceState === 'WARN'
      ? '#f43f5e'
      : '#eed7c3';

  return (
    <div className="bg-white border border-[#ecdacb] rounded-2xl overflow-hidden shadow-sm text-slate-900 w-full max-w-full">
      {/* Clean CUSTECH Brown & White Header */}
      <div className="bg-[#fbf5ef] border-b border-[#ecdacb] px-3.5 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative w-8 h-8 rounded-xl bg-[#8d4a27] text-white flex items-center justify-center shrink-0">
            <ScanFace className="w-4 h-4" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#fbf5ef] ${
                phase === 'SCANNING'
                  ? 'bg-emerald-500 animate-pulse'
                  : phase === 'ERROR'
                  ? 'bg-rose-500'
                  : 'bg-[#d4a574]'
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-900 truncate">
              {mode === 'ENROLL' ? 'Face ID Setup' : 'Face Verification'}
            </p>
            <p className="text-[11px] text-[#743c22] font-medium truncate">
              {studentName} <span className="font-mono text-slate-500">• {matricNumber}</span>
            </p>
          </div>
        </div>
      </div>

      <div className={compact ? 'p-3 space-y-3' : 'p-3.5 sm:p-4 space-y-3'}>
        {/* Optional PIN authorization for unauthenticated first-time enrollment */}
        {mode === 'ENROLL' && requirePinForEnroll && phase === 'IDLE' && (
          <div className="p-3 rounded-xl bg-[#fbf5ef] border border-[#ecdacb] space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <Lock className="w-4 h-4 text-[#8d4a27] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-slate-900">Enter 4-Digit Attendance PIN</p>
                <p className="text-[11px] text-slate-500 mt-0.5 break-words">
                  Default PIN: <code className="font-mono font-bold text-[#8d4a27]">1234</code>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="password"
                maxLength={4}
                inputMode="numeric"
                value={attendancePin}
                onChange={(e) => setAttendancePin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full min-w-0 sm:flex-1 min-h-[42px] px-3 py-2 rounded-xl border border-[#ecdacb] bg-white text-center font-mono font-black tracking-[0.35em] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8d4a27]"
              />
              <button
                type="button"
                onClick={startScanner}
                disabled={attendancePin.trim().length !== 4}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] disabled:opacity-40 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>Start Scan</span>
              </button>
            </div>
          </div>
        )}

        {/* Techy Brown & White Facial Scanner Viewport */}
        <div
          className={`relative w-full ${
            compact ? 'h-56 sm:h-60' : 'h-64 sm:h-72'
          } rounded-2xl bg-[#2a160c] border border-[#ecdacb] overflow-hidden flex items-center justify-center shadow-inner`}
        >
          {/* Live Mirrored Optical Video Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Subtle Warm Grid Backdrop */}
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(238,215,195,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(238,215,195,0.12) 1px, transparent 1px)',
              backgroundSize: '26px 26px',
            }}
          />

          {/* Real-Time 68-Point Facial Mesh & Corner Brackets Canvas */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Segmented Face ID Tick Ring & Laser Sweep */}
          {phase === 'SCANNING' && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Laser Scan Beam */}
              <div
                className={`absolute inset-x-5 h-0.5 animate-biometric-sweep ${
                  telemetry.livenessPassed
                    ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_rgba(52,211,153,0.9)]'
                    : 'bg-gradient-to-r from-transparent via-[#eed7c3] to-transparent shadow-[0_0_14px_rgba(238,215,195,0.9)]'
                }`}
              />

              {/* Circular Segmented Biometric Ring */}
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border border-dashed border-[#eed7c3]/35 animate-hud-spin" />
                <div className="absolute inset-3 rounded-full border border-dotted border-[#eed7c3]/25 animate-hud-spin-reverse" />

                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  {Array.from({ length: TOTAL_HUD_TICKS }).map((_, idx) => {
                    const angle = (idx / TOTAL_HUD_TICKS) * 2 * Math.PI;
                    const r1 = 51;
                    const r2 = idx % 4 === 0 ? 57 : 55;
                    const x1 = 60 + r1 * Math.cos(angle);
                    const y1 = 60 + r1 * Math.sin(angle);
                    const x2 = 60 + r2 * Math.cos(angle);
                    const y2 = 60 + r2 * Math.sin(angle);
                    const isLit = idx < activeTicks;
                    return (
                      <line
                        key={idx}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={isLit ? tickStrokeActive : 'rgba(238, 215, 195, 0.22)'}
                        strokeWidth={idx % 4 === 0 ? 1.8 : 1.2}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Single Clean Floating Prompt Pill */}
          {phase === 'SCANNING' && (
            <div className="absolute bottom-2.5 inset-x-0 pointer-events-none flex justify-center px-3">
              <div
                className={`px-3 py-1 rounded-full backdrop-blur-xs border text-[11px] font-bold flex items-center gap-1.5 ${
                  telemetry.livenessPassed
                    ? 'bg-emerald-950/80 border-emerald-400/60 text-emerald-100'
                    : faceState === 'WARN'
                    ? 'bg-rose-950/85 border-rose-400/60 text-rose-100'
                    : 'bg-[#2a150b]/75 border-[#eed7c3]/45 text-[#fbf5ef]'
                }`}
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>{livenessBadge}</span>
              </div>
            </div>
          )}

          {/* Loading Models / Camera / Processing Overlay (Clean Cream & Brown) */}
          {(phase === 'LOADING_MODELS' || phase === 'STARTING_CAMERA' || phase === 'PROCESSING') && (
            <div className="absolute inset-0 bg-[#fbf5ef]/95 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 space-y-2.5">
              <div className="w-11 h-11 rounded-2xl bg-white border border-[#ecdacb] shadow-xs flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-[#8d4a27] animate-spin" />
              </div>
              <p className="text-xs font-bold text-[#743c22]">{statusText}</p>
            </div>
          )}

          {/* Success Overlay */}
          {phase === 'SUCCESS' && (
            <div className="absolute inset-0 bg-emerald-50/95 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <p className="text-sm font-extrabold text-emerald-900">Verified</p>
              <p className="text-xs text-emerald-700 max-w-xs">{statusText}</p>
            </div>
          )}

          {/* Idle Overlay */}
          {phase === 'IDLE' && (
            <div className="absolute inset-0 bg-[#fbf5ef]/95 flex flex-col items-center justify-center text-center p-4 space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-[#ecdacb] shadow-xs flex items-center justify-center">
                <ScanFace className="w-6 h-6 text-[#8d4a27]" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                {requirePinForEnroll && mode === 'ENROLL'
                  ? 'Enter PIN above to start'
                  : 'Camera Ready'}
              </p>
              {!requirePinForEnroll && (
                <button
                  type="button"
                  onClick={startScanner}
                  className="mt-1 px-4 py-2 rounded-xl bg-[#8d4a27] hover:bg-[#743c22] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Start Face Scan</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Clean Single-Line Scan Progress */}
        {phase === 'SCANNING' && (
          <div className="bg-[#fbf5ef] border border-[#ecdacb] rounded-xl px-3 py-2.5 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-700 font-semibold truncate">{statusText}</span>
              <span className="text-[#8d4a27] font-mono font-bold shrink-0">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#ecdacb] rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 rounded-full ${
                  telemetry.livenessPassed ? 'bg-emerald-600' : 'bg-[#8d4a27]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {(phase === 'ERROR' || errorMsg) && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="break-words min-w-0">{errorMsg || statusText}</span>
            </div>
            <button
              type="button"
              onClick={startScanner}
              className="w-full sm:w-auto min-h-[38px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Clean Footer Action */}
        {onCancel && phase !== 'SUCCESS' && (
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl border border-[#ecdacb] text-xs font-semibold text-slate-600 hover:text-[#743c22] hover:bg-[#fbf5ef] transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
