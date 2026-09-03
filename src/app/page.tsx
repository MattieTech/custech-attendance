'use client';

import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { LoginPortal } from '@/components/auth/LoginPortal';
import {
  AuthenticatedSession,
  getStoredSession,
  logoutUser,
  switchActiveRole,
} from '@/lib/auth/auth-service';
import { UserRole } from '@/types';
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';
import { LecturerDashboard } from '@/components/dashboards/LecturerDashboard';
import { CourseRepDashboard } from '@/components/dashboards/CourseRepDashboard';
import { AssistantRepDashboard } from '@/components/dashboards/AssistantRepDashboard';
import { DeptRepDashboard } from '@/components/dashboards/DeptRepDashboard';
import { HodDashboard } from '@/components/dashboards/HodDashboard';
import { DeanDashboard } from '@/components/dashboards/DeanDashboard';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { StaffDashboard } from '@/components/dashboards/StaffDashboard';

export default function Home() {
  const [session, setSession] = React.useState<AuthenticatedSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshSession = React.useCallback(() => {
    const active = getStoredSession();
    setSession(active);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    refreshSession();

    const handleAuthChange = () => refreshSession();
    window.addEventListener('custech-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('custech-auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [refreshSession]);

  const handleRoleSwitched = (newRole: UserRole) => {
    switchActiveRole(newRole);
    refreshSession();
  };

  const handleLogout = () => {
    logoutUser();
    setSession(null);
  };

  // Initial loading state while reading local session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/custech-logo-full.png"
            alt="CUSTECH"
            className="h-14 w-auto object-contain animate-pulse"
          />
          <p className="text-xs text-slate-500 font-medium">
            Loading CUSTECH Academic Presence Portal...
          </p>
        </div>
      </div>
    );
  }

  // If no authenticated session, render the official University Login Portal
  if (!session) {
    return <LoginPortal onLoginSuccess={refreshSession} />;
  }

  const { user, activeRole } = session;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-[#8d4a27] selection:text-white">
      {/* Institutional Top Navbar with Dynamic Multi-Role Context Switcher & Sign Out */}
      <Navbar
        user={user}
        activeRole={activeRole}
        onRoleSwitched={handleRoleSwitched}
        onLogout={handleLogout}
      />

      {/* Main Perspective Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {activeRole === 'STUDENT' && <StudentDashboard user={user} />}

        {activeRole === 'COURSE_REP' && <CourseRepDashboard user={user} />}

        {activeRole === 'ASSISTANT_COURSE_REP' && <AssistantRepDashboard user={user} />}

        {activeRole === 'DEPARTMENT_REP' && <DeptRepDashboard user={user} />}

        {activeRole === 'LECTURER' && <LecturerDashboard user={user} />}

        {activeRole === 'HOD' && <HodDashboard user={user} />}

        {(activeRole === 'DEAN' || activeRole === 'PRINCIPAL_OFFICER') && (
          <DeanDashboard user={user} />
        )}

        {activeRole === 'SUPER_ADMIN' && <AdminDashboard user={user} />}

        {activeRole === 'NON_ACADEMIC_STAFF' && <StaffDashboard user={user} />}
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-slate-200/80 py-8 text-center text-xs bg-white">
        <div className="flex flex-col items-center justify-center gap-2 mb-2">
          <img
            src="/custech-logo-full.png"
            alt="Confluence University of Science and Technology, Osara"
            className="h-10 sm:h-12 w-auto object-contain"
          />
        </div>
        <p className="text-[11px] font-medium text-slate-500 mt-1">
          Digital Attendance & Academic Presence Management System • Confluence University of Science & Technology, Osara
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Authenticated Session • Active Context: {activeRole}
        </p>
      </footer>
    </div>
  );
}
