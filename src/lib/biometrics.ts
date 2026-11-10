/**
 * Shared biometric vector math utilities for facial verification.
 * Safe for both Node.js server actions and browser client components.
 */

export const EXPECTED_DESCRIPTOR_LENGTH = 128;
export const DEFAULT_FACIAL_MATCH_THRESHOLD = 0.50;
export const DUPLICATE_FACE_COLLISION_THRESHOLD = 0.48;

export function isValidFaceDescriptor(descriptor: unknown): descriptor is number[] {
  if (!Array.isArray(descriptor) || descriptor.length !== EXPECTED_DESCRIPTOR_LENGTH) {
    return false;
  }
  return descriptor.every((v) => typeof v === 'number' && Number.isFinite(v));
}

export function computeEuclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return Infinity;
  }
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Averages multiple 128-D face descriptors (from multi-frame enrollment)
 * into a single stabilized biometric template.
 */
export function averageFaceDescriptors(descriptors: number[][]): number[] {
  if (descriptors.length === 0) return [];
  const length = descriptors[0].length;
  const avg = new Array<number>(length).fill(0);
  for (const desc of descriptors) {
    if (desc.length !== length) continue;
    for (let i = 0; i < length; i++) {
      avg[i] += desc[i];
    }
  }
  for (let i = 0; i < length; i++) {
    avg[i] = Number((avg[i] / descriptors.length).toFixed(6));
  }
  return avg;
}

/**
 * Converts a Euclidean descriptor distance (0.0 = exact match, ~0.6+ = different person)
 * into a user-friendly confidence score (0 - 99.9%).
 */
export function distanceToConfidencePercent(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  // 0.0 -> 99.9%, 0.30 -> ~85%, 0.50 -> ~65%, >= 0.90 -> 0%
  const raw = (1 - distance / 0.95) * 100;
  return Math.max(0, Math.min(99.9, Math.round(raw * 10) / 10));
}
