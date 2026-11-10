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
import { getDatabaseSnapshotAction } from '@/actions/academic';
import { custechDb } from '@/lib/db/repository';
import { OfflineSyncBanner } from '@/components/layout/OfflineSyncBanner';

export default function Home() {
  const [session, setSession] = React.useState<AuthenticatedSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshSession = React.useCallback(() => {
    const active = getStoredSession();
    setSession(active);
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const hydrateAndLoad = async () => {
      try {
        // Hydrate client database with authoritative server store (with 2.5s offline fallback)
        const snapshot = await Promise.race([
          getDatabaseSnapshotAction(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
        ]);
        if (mounted && snapshot) {
          custechDb.syncClientSnapshot(snapshot);
        }
      } catch {
        // Offline / network fallback uses localStorage cache
      } finally {
        if (mounted) {
          refreshSession();
        }
      }
    };

    void hydrateAndLoad();

    const handleAuthChange = () => refreshSession();
    window.addEventListener('custech-auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      mounted = false;
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-sm w-full text-center">
          <img
            src="/custech-logo-full.png"
            alt="CUSTECH"
            className="h-14 w-auto object-contain animate-pulse"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">
              Confluence University of Science &amp; Technology
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Loading Academic Presence Portal...
            </p>
          </div>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Institutional Top Navbar with Dynamic Multi-Role Context Switcher & Sign Out */}
      <Navbar
        user={user}
        activeRole={activeRole}
        onRoleSwitched={handleRoleSwitched}
        onLogout={handleLogout}
      />

      {/* Offline Mode Banner & Auto-Sync Notification */}
      <OfflineSyncBanner />

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
      <footer className="border-t border-slate-200 py-8 text-center bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-3">
          <img
            src="/custech-logo-full.png"
            alt="Confluence University of Science and Technology, Osara"
            className="h-10 sm:h-12 w-auto object-contain"
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">
              Digital Attendance &amp; Academic Presence Management System
            </p>
            <p className="text-xs text-slate-500">
              Confluence University of Science &amp; Technology, Osara, Kogi State, Nigeria
            </p>
            <p className="text-xs text-slate-400 pt-1">
              Authenticated Session &bull; Active Context: <span className="font-semibold text-slate-600">{activeRole}</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
