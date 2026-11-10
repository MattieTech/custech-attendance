'use client';

/**
 * Client-side Facial Detection, Liveness Check & 128-D Descriptor Extraction
 * Powered by @vladmandic/face-api with local static weights in /public/models.
 */

type FaceApiModule = typeof import('@vladmandic/face-api');

let faceApiPromise: Promise<FaceApiModule> | null = null;
let modelsLoadedPromise: Promise<void> | null = null;

async function getFaceApi(): Promise<FaceApiModule> {
  if (!faceApiPromise) {
    faceApiPromise = import('@vladmandic/face-api');
  }
  return faceApiPromise;
}

export async function ensureFaceModelsLoaded(): Promise<FaceApiModule> {
  const faceapi = await getFaceApi();
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = (async () => {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
    })().catch((err) => {
      modelsLoadedPromise = null;
      throw err;
    });
  }
  await modelsLoadedPromise;
  return faceapi;
}

export interface Point2D {
  x: number;
  y: number;
}

function dist(a: Point2D, b: Point2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function computeEyeAspectRatio(eye: Point2D[]): number {
  if (eye.length < 6) return 0.3;
  const vertical1 = dist(eye[1], eye[5]);
  const vertical2 = dist(eye[2], eye[4]);
  const horizontal = dist(eye[0], eye[3]);
  if (horizontal <= 0.0001) return 0.3;
  return (vertical1 + vertical2) / (2 * horizontal);
}

export interface FrameFaceAnalysis {
  status: 'NO_FACE' | 'MULTIPLE_FACES' | 'TOO_FAR' | 'OFF_CENTER' | 'OK';
  message: string;
  faceCount: number;
  score?: number;
  ear?: number;
  yawOffset?: number; // -1 (left) to +1 (right), ~0 when straight
  centerPoint?: Point2D;
  descriptor?: number[];
  box?: { x: number; y: number; width: number; height: number };
}

export async function analyzeVideoFrame(videoEl: HTMLVideoElement): Promise<FrameFaceAnalysis> {
  if (!videoEl || videoEl.readyState < 2 || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) {
    return {
      status: 'NO_FACE',
      message: 'Initializing camera feed...',
      faceCount: 0,
    };
  }

  const faceapi = await ensureFaceModelsLoaded();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.48,
  });

  const detections = await faceapi
    .detectAllFaces(videoEl, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  if (!detections || detections.length === 0) {
    return {
      status: 'NO_FACE',
      message: 'No face detected. Position your face clearly inside the guide oval.',
      faceCount: 0,
    };
  }

  if (detections.length > 1) {
    return {
      status: 'MULTIPLE_FACES',
      message: `Multiple faces detected (${detections.length}). Only you may appear in the camera frame.`,
      faceCount: detections.length,
    };
  }

  const det = detections[0];
  const box = det.detection.box;
  const widthRatio = box.width / videoEl.videoWidth;

  if (widthRatio < 0.17) {
    return {
      status: 'TOO_FAR',
      message: 'Move closer to the camera so your face fills the guide oval.',
      faceCount: 1,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  }

  const faceCenterX = (box.x + box.width / 2) / videoEl.videoWidth;
  const faceCenterY = (box.y + box.height / 2) / videoEl.videoHeight;
  if (faceCenterX < 0.2 || faceCenterX > 0.8 || faceCenterY < 0.15 || faceCenterY > 0.85) {
    return {
      status: 'OFF_CENTER',
      message: 'Center your face inside the oval frame.',
      faceCount: 1,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  }

  const positions = det.landmarks.positions;
  const leftEye = positions.slice(36, 42);
  const rightEye = positions.slice(42, 48);
  const leftEar = computeEyeAspectRatio(leftEye);
  const rightEar = computeEyeAspectRatio(rightEye);
  const avgEar = (leftEar + rightEar) / 2;

  // Yaw offset: nose tip (30) relative to jaw sides (0 and 16)
  const leftJaw = positions[0];
  const rightJaw = positions[16];
  const noseTip = positions[30];
  const jawWidth = Math.max(1, dist(leftJaw, rightJaw));
  const noseRatio = (noseTip.x - leftJaw.x) / jawWidth; // 0.5 = centered
  const yawOffset = (noseRatio - 0.5) * 2;

  return {
    status: 'OK',
    message: 'Face locked. Follow the liveness prompt.',
    faceCount: 1,
    score: det.detection.score,
    ear: avgEar,
    yawOffset,
    centerPoint: {
      x: noseTip.x / videoEl.videoWidth,
      y: noseTip.y / videoEl.videoHeight,
    },
    descriptor: Array.from(det.descriptor),
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
  };
}

export function captureFaceThumbnail(videoEl: HTMLVideoElement): string | undefined {
  try {
    if (!videoEl || videoEl.videoWidth === 0 || videoEl.videoHeight === 0) return undefined;
    const canvas = document.createElement('canvas');
    const size = 160;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const minDim = Math.min(videoEl.videoWidth, videoEl.videoHeight);
    const sx = (videoEl.videoWidth - minDim) / 2;
    const sy = (videoEl.videoHeight - minDim) / 2;
    ctx.drawImage(videoEl, sx, sy, minDim, minDim, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return undefined;
  }
}
