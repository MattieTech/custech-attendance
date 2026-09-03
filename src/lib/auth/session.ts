import { UserProfile, UserRole } from '@/types';
import { initialProfiles } from '../db/initial-data';

// Default active user is the Lecturer (Dr. John Doe) for immediate in-class testing
export const DEFAULT_USER_ID = 'user-lecturer-1';

export function getMockUser(userId?: string): UserProfile {
  const id = userId || DEFAULT_USER_ID;
  const user = initialProfiles.find((p) => p.id === id);
  return user || initialProfiles[0];
}

export function hasRequiredRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  if (userRole === 'SUPER_ADMIN') return true;
  return allowedRoles.includes(userRole);
}

export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Administrator';
    case 'PRINCIPAL_OFFICER':
      return 'Principal Officer (Vice Chancellor)';
    case 'DEAN':
      return 'Faculty Dean (Computing)';
    case 'HOD':
      return 'Head of Department (HOD)';
    case 'LECTURER':
      return 'Course Lecturer';
    case 'COURSE_REP':
      return 'Course Representative';
    case 'ASSISTANT_COURSE_REP':
      return 'Assistant Course Representative';
    case 'DEPARTMENT_REP':
      return 'Department Representative';
    case 'STUDENT':
      return 'Enrolled Student';
    case 'NON_ACADEMIC_STAFF':
      return 'Non-Academic Staff';
    default:
      return role;
  }
}

export function getViewAsLabel(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'View as Super Administrator';
    case 'PRINCIPAL_OFFICER':
      return 'View as Principal Officer (VC)';
    case 'DEAN':
      return 'View as Dean';
    case 'HOD':
      return 'View as Head of Department (HOD)';
    case 'LECTURER':
      return 'View as Course Lecturer';
    case 'COURSE_REP':
      return 'View as Course Representative';
    case 'ASSISTANT_COURSE_REP':
      return 'View as Assistant Course Rep';
    case 'DEPARTMENT_REP':
      return 'View as Department Representative';
    case 'STUDENT':
      return 'View as Student';
    case 'NON_ACADEMIC_STAFF':
      return 'View as Staff Member';
    default:
      return `View as ${role}`;
  }
}
