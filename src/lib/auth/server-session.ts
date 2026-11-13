import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { UserProfile, UserRole } from '@/types';
import { custechDb } from '@/lib/db/repository';

export const SESSION_COOKIE_NAME = 'custech_session_v1';

const SESSION_SECRET =
  process.env.CUSTECH_SESSION_SECRET ||
  'custech-osara-academic-presence-hmac-secret-2026-v1';

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export const STUDENT_ONLY_ROLES: UserRole[] = [
  'STUDENT',
  'COURSE_REP',
  'ASSISTANT_COURSE_REP',
  'DEPARTMENT_REP',
];

export const ADMIN_OR_FACULTY_ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'PRINCIPAL_OFFICER',
  'DEAN',
  'FACULTY_REP',
  'ASST_FACULTY_REP',
  'HOD',
];

export interface ServerSessionPayload {
  userId: string;
  activeRole: UserRole;
  assignedRoles: UserRole[];
  authSource: 'PORTAL_LOGIN' | 'QR_VERIFIED_STUDENT';
  iat: number;
  exp: number;
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

export function createSignedSessionToken(
  payload: Omit<ServerSessionPayload, 'iat' | 'exp'>
): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: ServerSessionPayload = {
    ...payload,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload), 'utf8').toString('base64url');
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function verifySignedSessionToken(token: string): ServerSessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;

  const expectedSig = signPayload(encoded);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as ServerSessionPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!parsed.userId || !parsed.activeRole || !parsed.exp || parsed.exp < now) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function setServerSessionCookie(
  payload: Omit<ServerSessionPayload, 'iat' | 'exp'>
): Promise<void> {
  const token = createSignedSessionToken(payload);
  try {
    const cookieStore = await cookies();
    let isHttps = false;
    try {
      const hdrs = await headers();
      isHttps = hdrs.get('x-forwarded-proto') === 'https';
    } catch {
      isHttps = false;
    }

    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isHttps,
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
  } catch {
    // Gracefully handle invocation outside Next.js request context (e.g. tests or scripts)
  }
}

export async function clearServerSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // Gracefully handle invocation outside Next.js request context
  }
}

export async function getServerSession(): Promise<{
  payload: ServerSessionPayload;
  user: UserProfile;
} | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!raw) return null;

    const payload = verifySignedSessionToken(raw);
    if (!payload) return null;

    const user = custechDb.getProfileById(payload.userId);
    if (!user || !user.isActive) return null;

    const effectiveRoles = payload.assignedRoles.filter((r) =>
      user.assignedRoles.includes(r)
    );
    if (effectiveRoles.length === 0) return null;

    const activeRole = effectiveRoles.includes(payload.activeRole)
      ? payload.activeRole
      : effectiveRoles[0];

    return {
      payload: {
        ...payload,
        assignedRoles: effectiveRoles,
        activeRole,
      },
      user: {
        ...user,
        assignedRoles: effectiveRoles,
        primaryRole:
          payload.authSource === 'QR_VERIFIED_STUDENT' ? 'STUDENT' : user.primaryRole,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the authoritative actor strictly from the signed HTTP-only session cookie.
 * Never trusts client-supplied actorId values to prevent privilege escalation.
 */
export async function resolveAuthorizedActor(): Promise<{
  user: UserProfile;
  activeRole: UserRole;
  assignedRoles: UserRole[];
} | null> {
  const serverSession = await getServerSession();
  if (!serverSession) return null;
  return {
    user: serverSession.user,
    activeRole: serverSession.payload.activeRole,
    assignedRoles: serverSession.payload.assignedRoles,
  };
}

export async function requireServerSession(): Promise<{
  user: UserProfile;
  activeRole: UserRole;
  assignedRoles: UserRole[];
}> {
  const actor = await resolveAuthorizedActor();
  if (!actor) {
    throw new Error('Authentication required. Please sign in again.');
  }
  return actor;
}

export function isFacultyAdminRole(role: UserRole): boolean {
  return (
    role === 'DEAN' ||
    role === 'FACULTY_REP' ||
    role === 'ASST_FACULTY_REP' ||
    role === 'PRINCIPAL_OFFICER'
  );
}
