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
  ShieldCheck,
  ScanFace,
  Eye,
  Lock,
  Cpu,
  Activity,
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
      ? '#f59e0b'
      : livenessPassed
      ? '#34d399'
      : '#22d3ee';

  const glowColor =
    analysis.status === 'MULTIPLE_FACES'
      ? 'rgba(244, 63, 94, 0.55)'
      : analysis.status !== 'OK'
      ? 'rgba(245, 158, 11, 0.5)'
      : livenessPassed
      ? 'rgba(52, 211, 153, 0.55)'
      : 'rgba(34, 211, 238, 0.55)';

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
  ctx.shadowBlur = 10;

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

  // Target coordinate tag
  ctx.shadowBlur = 0;
  ctx.font = '600 9px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = primaryColor;
  ctx.fillText(
    `ID_ROI [${Math.round(bx)},${Math.round(by)}]`,
    Math.max(8, bx),
    Math.max(14, by - 5)
  );

  // 2. Live 68-Point Facial Mesh & Contours
  if (analysis.landmarks && analysis.landmarks.length >= 68) {
    const pts = analysis.landmarks.map(mapPt);

    // Subtle 3D mesh triangulation bridges
    ctx.strokeStyle = livenessPassed
      ? 'rgba(52, 211, 153, 0.24)'
      : 'rgba(34, 211, 238, 0.24)';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    for (const [a, b] of MESH_BRIDGES) {
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
    }
    ctx.stroke();

    // Primary facial feature contours
    ctx.strokeStyle = livenessPassed
      ? 'rgba(52, 211, 153, 0.72)'
      : 'rgba(34, 211, 238, 0.72)';
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

      ctx.strokeStyle = livenessPassed ? '#34d399' : '#22d3ee';
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
    ctx.fillStyle = livenessPassed ? '#6ee7b7' : '#67e8f9';
    for (const idx of ANCHOR_INDICES) {
      const p = pts[idx];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.9, 0, Math.PI * 2);
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
  const [statusText, setStatusText] = React.useState<string>('Initializing biometric subsystem...');
  const [subHint, setSubHint] = React.useState<string>(
    mode === 'ENROLL'
      ? 'Align face inside reticle and blink naturally to capture 128-D biometric template.'
      : 'Look directly at sensor and blink once to verify live identity.'
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [faceState, setFaceState] = React.useState<'NONE' | 'WARN' | 'LOCKED' | 'VERIFIED'>('NONE');
  const [progress, setProgress] = React.useState<number>(0);
  const [livenessBadge, setLivenessBadge] = React.useState<string>('AWAITING FACE LOCK');
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
    setLivenessBadge('AWAITING FACE LOCK');
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
      setErrorMsg('Enter your 4-digit Attendance PIN first to authorize Face ID registration.');
      setPhase('IDLE');
      return;
    }

    stopCamera();
    resetTracking();
    setErrorMsg(null);
    setPhase('LOADING_MODELS');
    setStatusText('Loading neural face-mesh & 128-D recognition models...');

    try {
      await ensureFaceModelsLoaded();
      if (!isMountedRef.current) return;

      setPhase('STARTING_CAMERA');
      setStatusText('Activating optical front-facing sensor...');

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
          ? 'Mapping facial landmarks — blink naturally'
          : 'Scanning live face — blink once to confirm'
      );
      setSubHint('Keep only your face inside the holographic reticle under clear lighting.');

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
                ? 'MULTI-FACE VIOLATION'
                : analysis.status === 'TOO_FAR'
                ? 'MOVE CLOSER TO SENSOR'
                : analysis.status === 'OFF_CENTER'
                ? 'CENTER FACE IN RETICLE'
                : 'SCANNING FOR FACE...'
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
              setStatusText('68-pt facial mesh locked — blink eyes naturally');
              setLivenessBadge('LIVENESS: BLINK NOW');
            } else {
              setStatusText('Liveness confirmed — computing 128-D signature...');
              setLivenessBadge('LIVENESS VERIFIED ✓');
            }

            // Completion condition
            if (livenessPassedRef.current && samplesRef.current.length >= targetSamples) {
              completedRef.current = true;
              setProgress(100);
              setFaceState('VERIFIED');
              setPhase('PROCESSING');
              setStatusText(
                mode === 'ENROLL'
                  ? 'Encrypting & locking 128-D Face ID template...'
                  : 'Matching 128-D vector against CUSTECH registry...'
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
                setStatusText(enrollRes?.message || 'Face ID template registered & locked!');
              } else if (mode === 'VERIFY' && onVerified) {
                setPhase('SUCCESS');
                setStatusText('Biometric signature verified. Submitting attendance...');
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
      setStatusText('Optical sensor or biometric model initialization failed.');
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
  const accentColorClass =
    faceState === 'VERIFIED' || telemetry.livenessPassed
      ? 'text-emerald-400'
      : faceState === 'WARN'
      ? 'text-rose-400'
      : faceState === 'LOCKED'
      ? 'text-cyan-400'
      : 'text-cyan-300/70';

  const tickStrokeActive =
    faceState === 'VERIFIED' || telemetry.livenessPassed
      ? '#34d399'
      : faceState === 'WARN'
      ? '#f43f5e'
      : '#22d3ee';

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-slate-100">
      {/* Cybernetic Header Terminal Bar */}
      <div className="bg-slate-900/90 border-b border-cyan-500/20 px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
            <ScanFace className="w-4 h-4" />
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                phase === 'SCANNING'
                  ? 'bg-emerald-400 animate-pulse'
                  : phase === 'ERROR'
                  ? 'bg-rose-500'
                  : 'bg-cyan-400'
              }`}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                {mode === 'ENROLL' ? 'BIOMETRIC // ENROLL_ID' : 'BIOMETRIC // LIVE_VERIFY'}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {studentName} <span className="text-slate-400 font-mono">• {matricNumber}</span>
            </p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 flex items-center gap-1 shrink-0">
          <ShieldCheck className="w-3 h-3" />
          <span>ANTI-PROXY</span>
        </span>
      </div>

      <div className={compact ? 'p-3 space-y-3' : 'p-4 space-y-3.5'}>
        {/* Optional PIN authorization for unauthenticated first-time enrollment */}
        {mode === 'ENROLL' && requirePinForEnroll && phase === 'IDLE' && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-400/30 space-y-2.5">
            <div className="flex items-start gap-2 text-xs text-amber-200">
              <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-100">First-Time Biometric Binding</p>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Enter your 4-digit Attendance PIN (default demo PIN:{' '}
                  <code className="font-mono font-bold text-white">1234</code>) to unlock sensor calibration for{' '}
                  <span className="font-mono font-bold">{matricNumber}</span>.
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
                placeholder="••••"
                className="flex-1 px-3 py-2 rounded-lg border border-amber-400/40 bg-slate-900 text-center font-mono font-black tracking-widest text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <button
                type="button"
                onClick={startScanner}
                disabled={attendancePin.trim().length !== 4}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 text-xs font-extrabold transition flex items-center gap-1.5"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Initialize Scan</span>
              </button>
            </div>
          </div>
        )}

        {/* Futuristic Biometric Camera HUD Viewport */}
        <div
          className={`relative w-full ${
            compact ? 'h-60' : 'h-72 sm:h-80'
          } rounded-2xl bg-slate-950 border border-cyan-500/25 overflow-hidden flex items-center justify-center shadow-inner`}
        >
          {/* Live Mirrored Optical Video Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover scale-x-[-1]"
          />

          {/* Subtle Cyber Grid Backdrop */}
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(34,211,238,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.12) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />

          {/* Real-Time 68-Point Facial Mesh & Bounding Reticle Canvas */}
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* HUD Scanner Aperture, Segmented Face ID Tick Ring & Laser Sweep */}
          {(phase === 'SCANNING' || phase === 'STARTING_CAMERA' || phase === 'LOADING_MODELS') && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              {/* Laser Scan Beam */}
              {phase === 'SCANNING' && (
                <div
                  className={`absolute inset-x-6 h-0.5 animate-biometric-sweep ${
                    telemetry.livenessPassed
                      ? 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_16px_rgba(52,211,153,0.95)]'
                      : 'bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_rgba(34,211,238,0.95)]'
                  }`}
                />
              )}

              {/* Circular Segmented Biometric Ring */}
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
                {/* Counter-rotating outer orbital ring */}
                <div className="absolute inset-0 rounded-full border border-dashed border-cyan-400/35 animate-hud-spin" />
                <div className="absolute inset-3 rounded-full border border-dotted border-cyan-300/25 animate-hud-spin-reverse" />

                {/* 48-Tick Segmented Radial Progress SVG */}
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
                        stroke={isLit ? tickStrokeActive : 'rgba(148, 163, 184, 0.25)'}
                        strokeWidth={idx % 4 === 0 ? 1.8 : 1.2}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* Top HUD Telemetry Bar */}
          {phase === 'SCANNING' && (
            <div className="absolute top-2.5 inset-x-2.5 pointer-events-none flex items-start justify-between gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur-xs border border-cyan-500/25 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    faceState === 'WARN'
                      ? 'bg-rose-500 animate-ping'
                      : telemetry.faceLocked
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
                <span className={`text-[10px] font-mono font-bold tracking-wider ${accentColorClass}`}>
                  {faceState === 'WARN'
                    ? 'MULTI_FACE'
                    : telemetry.faceLocked
                    ? 'MESH_LOCKED'
                    : 'SEEKING_ROI'}
                </span>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-slate-950/75 backdrop-blur-xs border border-slate-700/80 text-[10px] font-mono text-slate-300 flex items-center gap-2">
                <span>
                  EAR:{' '}
                  <strong className="text-cyan-300">
                    {telemetry.ear !== null ? telemetry.ear.toFixed(2) : '--'}
                  </strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  CONF:{' '}
                  <strong className="text-emerald-300">
                    {telemetry.score !== null ? `${Math.round(telemetry.score * 100)}%` : '--'}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Bottom Liveness HUD Pill */}
          {phase === 'SCANNING' && (
            <div className="absolute bottom-2.5 inset-x-0 pointer-events-none flex justify-center px-3">
              <div
                className={`px-3 py-1 rounded-full backdrop-blur-xs border text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 ${
                  telemetry.livenessPassed
                    ? 'bg-emerald-950/85 border-emerald-400/50 text-emerald-300'
                    : faceState === 'WARN'
                    ? 'bg-rose-950/85 border-rose-400/50 text-rose-200'
                    : 'bg-slate-950/80 border-cyan-400/40 text-cyan-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{livenessBadge}</span>
              </div>
            </div>
          )}

          {/* Loading Models / Camera / Processing Overlay */}
          {(phase === 'LOADING_MODELS' || phase === 'STARTING_CAMERA' || phase === 'PROCESSING') && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-4 space-y-2.5">
              <div className="relative w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
              <p className="text-xs font-mono font-bold text-cyan-200">{statusText}</p>
            </div>
          )}

          {/* Success Overlay */}
          {phase === 'SUCCESS' && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-4 space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-[0_0_24px_rgba(52,211,153,0.45)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-300" />
              </div>
              <p className="text-sm font-mono font-black tracking-wide text-emerald-200">
                IDENTITY VERIFIED
              </p>
              <p className="text-xs text-emerald-100/90 max-w-xs">{statusText}</p>
            </div>
          )}

          {/* Idle Overlay */}
          {phase === 'IDLE' && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center text-white text-center p-4 space-y-2.5">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
                <ScanFace className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-xs font-mono font-bold text-cyan-100">
                BIOMETRIC SENSOR STANDBY
              </p>
              {!requirePinForEnroll && (
                <button
                  type="button"
                  onClick={startScanner}
                  className="mt-1 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold transition flex items-center gap-1.5 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Activate Biometric Sensor</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3-Stage Verification Pipeline & Progress Readout */}
        {phase === 'SCANNING' && (
          <div className="space-y-2.5 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono font-bold">
              <div
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 ${
                  telemetry.faceLocked
                    ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <ScanFace className="w-3 h-3" />
                <span>1. MESH LOCK</span>
              </div>
              <div
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 ${
                  telemetry.livenessPassed
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <Activity className="w-3 h-3" />
                <span>2. LIVENESS</span>
              </div>
              <div
                className={`px-2 py-1.5 rounded-lg border flex items-center justify-center gap-1 ${
                  progress >= 90
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-500'
                }`}
              >
                <Cpu className="w-3 h-3" />
                <span>3. 128-D HASH</span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-200 font-semibold">{statusText}</span>
                <span className="text-cyan-400 font-mono font-bold">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    telemetry.livenessPassed
                      ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                      : 'bg-gradient-to-r from-cyan-500 to-sky-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">{subHint}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {(phase === 'ERROR' || errorMsg) && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg || statusText}</span>
            </div>
            <button
              type="button"
              onClick={startScanner}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Biometric Scan</span>
            </button>
          </div>
        )}

        {/* Footer Actions */}
        {onCancel && phase !== 'SUCCESS' && (
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] font-mono text-slate-500">
              ON-DEVICE 128-D VECTOR ENGINE
            </span>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onCancel();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
