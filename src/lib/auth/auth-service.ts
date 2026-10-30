import { UserProfile, UserRole } from '@/types';
import { initialProfiles } from '../db/initial-data';
import { custechDb } from '../db/repository';

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
    // Ensure user still exists in database and update profile data in case it changed
    const freshUser =
      custechDb.getProfileById(parsed.user.id) ||
      initialProfiles.find((p) => p.id === parsed.user.id);
    if (!freshUser) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      user: freshUser,
      activeRole: freshUser.assignedRoles.includes(parsed.activeRole)
        ? parsed.activeRole
        : freshUser.primaryRole,
      loginTime: parsed.loginTime,
    };
  } catch {
    return null;
  }
}

/**
 * Save active session
 */
export function storeSession(session: AuthenticatedSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notifyAuthChange();
}

import { loginStudentAction, loginStaffAction } from '@/actions/academic';

/**
 * Authenticate a Student using Matriculation Number and Password.
 * Queries server database and synchronizes into local client store.
 */
export async function loginStudent(
  matricNumber: string,
  _password?: string
): Promise<{ success: boolean; session?: AuthenticatedSession; error?: string }> {
  const cleanMatric = matricNumber.trim().toUpperCase();
  if (!cleanMatric) {
    return { success: false, error: 'Please enter your Matriculation Number.' };
  }

  // 1. Check local client database
  let profile = custechDb
    .getProfiles()
    .find((p) => p.matricNumber?.toUpperCase() === cleanMatric);

  let student = custechDb.getStudentByMatric(cleanMatric);

  // 2. Query persistent server database if not found or to get freshest state
  if (!profile) {
    try {
      const serverRes = await loginStudentAction(cleanMatric, _password);
      if (serverRes.success && serverRes.profile) {
        profile = serverRes.profile;
        student = serverRes.student;
        // Sync into client-side database and localStorage
        custechDb.syncClientProfileAndStudent(profile, student);
      } else if (serverRes.error) {
        return { success: false, error: serverRes.error };
      }
    } catch (err) {
      console.warn('Server auth query failed:', err);
    }
  }

  if (!profile) {
    return {
      success: false,
      error: `Matriculation number "${cleanMatric}" was not found in the CUSTECH academic registry.`,
    };
  }

  if (!profile.isActive) {
    return {
      success: false,
      error: 'This student account has been flagged inactive. Please contact the Directorate of Academic Planning.',
    };
  }

  const session: AuthenticatedSession = {
    user: profile,
    activeRole: profile.primaryRole || 'STUDENT',
    loginTime: new Date().toISOString(),
  };

  storeSession(session);
  return { success: true, session };
}

/**
 * Authenticate an Academic Staff, HOD, Dean, Principal Officer, or Administrator
 * using Staff ID or University Email.
 */
export async function loginStaff(
  identifier: string,
  _password?: string
): Promise<{ success: boolean; session?: AuthenticatedSession; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) {
    return { success: false, error: 'Please enter your Staff ID or University Email.' };
  }

  let profile = custechDb
    .getProfiles()
    .find(
      (p) =>
        p.email.toLowerCase() === cleanId ||
        (p.staffId && p.staffId.toLowerCase() === cleanId)
    );

  if (!profile) {
    try {
      const serverRes = await loginStaffAction(cleanId, _password);
      if (serverRes.success && serverRes.profile) {
        profile = serverRes.profile;
        custechDb.syncClientProfileAndStudent(profile);
      } else if (serverRes.error) {
        return { success: false, error: serverRes.error };
      }
    } catch (err) {
      console.warn('Server staff auth query failed:', err);
    }
  }

  if (!profile) {
    return {
      success: false,
      error: `Staff account "${identifier}" was not found in the CUSTECH staff directory.`,
    };
  }

  if (!profile.isActive) {
    return {
      success: false,
      error: 'Account inactive. Please contact ICT Support / Registrar.',
    };
  }

  const session: AuthenticatedSession = {
    user: profile,
    activeRole: profile.primaryRole,
    loginTime: new Date().toISOString(),
  };

  storeSession(session);
  return { success: true, session };
}

/**
 * Switch the active perspective (e.g. "View as Lecturer" vs "View as HOD")
 * without requiring the user to re-authenticate.
 */
export function switchActiveRole(newRole: UserRole): {
  success: boolean;
  session?: AuthenticatedSession;
  error?: string;
} {
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

  const updated: AuthenticatedSession = {
    ...current,
    activeRole: newRole,
  };

  storeSession(updated);
  return { success: true, session: updated };
}

/**
 * Sign out and clear stored credentials.
 */
export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    notifyAuthChange();
  }
}
