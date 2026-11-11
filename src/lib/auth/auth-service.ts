import { UserProfile, UserRole } from '@/types';
import { custechDb } from '../db/repository';
import {
  getAuthenticatedSessionAction,
  loginStaffAction,
  loginStudentAction,
  logoutAction,
  switchActiveRoleAction,
} from '@/actions/academic';

export interface AuthenticatedSession {
  user: UserProfile;
  activeRole: UserRole;
  loginTime: string;
}

const STORAGE_KEY = 'custech_auth_session_v1';

/**
 * Dispatches an event so all listening components (Navbar, Main Page, Dashboards)
 * re-render immediately when the user logs in, logs out, or switches their active view context.
 */
function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('custech-auth-changed'));
  }
}

/**
 * Retrieve the current authenticated session from browser storage (SSR-safe).
 */
export function getStoredSession(): AuthenticatedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: AuthenticatedSession = JSON.parse(raw);
    const freshUser = custechDb.getProfileById(parsed.user.id) || parsed.user;
    if (!freshUser || !freshUser.isActive) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    // Preserve restricted role scope if session came from QR student verification
    const allowedRoles = parsed.user.assignedRoles?.length
      ? parsed.user.assignedRoles.filter((r) => freshUser.assignedRoles.includes(r))
      : freshUser.assignedRoles;

    const effectiveRoles = allowedRoles.length > 0 ? allowedRoles : [freshUser.primaryRole];
    const activeRole = effectiveRoles.includes(parsed.activeRole)
      ? parsed.activeRole
      : effectiveRoles[0];

    return {
      user: {
        ...freshUser,
        assignedRoles: effectiveRoles,
      },
      activeRole,
      loginTime: parsed.loginTime,
    };
  } catch {
    return null;
  }
}

/**
 * Save active session locally and notify listeners.
 */
export function storeSession(session: AuthenticatedSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notifyAuthChange();
}

/**
 * Synchronize client session with the authoritative HTTP-only server session cookie.
 * Ensures role integrity across page refreshes and QR attendance redirects.
 */
export async function syncSessionWithServer(): Promise<AuthenticatedSession | null> {
  if (typeof window === 'undefined') return null;
  try {
    const serverSession = await getAuthenticatedSessionAction();
    if (!serverSession) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const synced: AuthenticatedSession = {
      user: serverSession.user,
      activeRole: serverSession.activeRole,
      loginTime: serverSession.loginTime,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
    return synced;
  } catch {
    // Offline fallback
    return getStoredSession();
  }
}

/**
 * Authenticate a Student using Matriculation Number and Password/PIN.
 * Always establishes an HTTP-only signed cookie on the server.
 */
export async function loginStudent(
  matricNumber: string,
  password?: string,
  isQuickDemoLogin?: boolean
): Promise<{ success: boolean; session?: AuthenticatedSession; error?: string }> {
  const cleanMatric = matricNumber.trim().toUpperCase();
  if (!cleanMatric) {
    return { success: false, error: 'Please enter your Matriculation Number.' };
  }

  try {
    const serverRes = await loginStudentAction(cleanMatric, password, isQuickDemoLogin);
    if (!serverRes.success || !serverRes.profile) {
      return {
        success: false,
        error:
          serverRes.error ||
          `Matriculation number "${cleanMatric}" was not found in the CUSTECH academic registry.`,
      };
    }

    custechDb.syncClientProfileAndStudent(serverRes.profile, serverRes.student);
    const session: AuthenticatedSession = {
      user: serverRes.profile,
      activeRole: serverRes.profile.primaryRole || 'STUDENT',
      loginTime: new Date().toISOString(),
    };
    storeSession(session);
    return { success: true, session };
  } catch (err) {
    console.warn('Server student auth query failed:', err);
    return { success: false, error: 'Unable to reach authentication server. Please try again.' };
  }
}

/**
 * Authenticate an Academic Staff, HOD, Dean, Principal Officer, or Administrator
 * using Staff ID or University Email. Always establishes an HTTP-only signed cookie.
 */
export async function loginStaff(
  identifier: string,
  password?: string
): Promise<{ success: boolean; session?: AuthenticatedSession; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Please enter your Staff ID or University Email.' };
  }

  try {
    const serverRes = await loginStaffAction(cleanId, password);
    if (!serverRes.success || !serverRes.profile) {
      return {
        success: false,
        error:
          serverRes.error ||
          `Staff account "${identifier}" was not found in the CUSTECH staff directory.`,
      };
    }

    custechDb.syncClientProfileAndStudent(serverRes.profile);
    const session: AuthenticatedSession = {
      user: serverRes.profile,
      activeRole: serverRes.profile.primaryRole,
      loginTime: new Date().toISOString(),
    };
    storeSession(session);
    return { success: true, session };
  } catch (err) {
    console.warn('Server staff auth query failed:', err);
    return { success: false, error: 'Unable to reach authentication server. Please try again.' };
  }
}

/**
 * Switch the active perspective (e.g. "View as Lecturer" vs "View as HOD")
 * and update the signed server session cookie.
 */
export async function switchActiveRole(newRole: UserRole): Promise<{
  success: boolean;
  session?: AuthenticatedSession;
  error?: string;
}> {
  const current = getStoredSession();
  if (!current) {
    return { success: false, error: 'No active authenticated session found.' };
  }

  if (!current.user.assignedRoles.includes(newRole)) {
    return {
      success: false,
      error: `User does not possess the permissions for role: ${newRole}.`,
    };
  }

  try {
    const serverRes = await switchActiveRoleAction(newRole);
    if (serverRes.success && serverRes.session) {
      storeSession(serverRes.session);
      return { success: true, session: serverRes.session };
    }
    return { success: false, error: serverRes.error || 'Role switch rejected by server.' };
  } catch {
    const updated: AuthenticatedSession = {
      ...current,
      activeRole: newRole,
    };
    storeSession(updated);
    return { success: true, session: updated };
  }
}

/**
 * Sign out and clear stored credentials & server cookie.
 */
export async function logoutUser(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('custech_verified_matric');
    try {
      await logoutAction();
    } catch {
      // ignore offline
    }
    notifyAuthChange();
  }
}
