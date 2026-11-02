'use client';

import React from 'react';
import { UserProfile, UserRole } from '@/types';
import { UserRoleContextSwitcher } from './UserRoleContextSwitcher';
import { NotificationBell } from '../notifications/NotificationBell';
import { getPendingOfflineCount, getPendingOfflineRecords } from '@/lib/offline/dexie-db';
import { syncOfflineBatch } from '@/actions/attendance';
import { ShieldCheck, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
  activeRole: UserRole;
  onRoleSwitched: (newRole: UserRole) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeRole,
  onRoleSwitched,
  onLogout,
}) => {
  const [isOnline, setIsOnline] = React.useState(true);
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll Dexie count periodically
    const checkPending = async () => {
      const count = await getPendingOfflineCount();
      setPendingSyncCount(count);
    };
    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const pending = await getPendingOfflineRecords();
      if (pending.length === 0) {
        setSyncStatusMsg('All offline records synchronized.');
        setTimeout(() => setSyncStatusMsg(null), 3000);
        return;
      }

      const dtoArray = pending.map((p) => ({
        sessionId: p.sessionId,
        matricNumber: p.matricNumber,
        attendancePin: p.attendancePin,
        assistedReason: p.assistedReason || 'No internet / mobile data',
        operatorProfileId: p.operatorProfileId,
        clientEventId: p.clientEventId,
      }));

      const res = await syncOfflineBatch(dtoArray);
      setSyncStatusMsg(`Synced ${res.processed} records (${res.duplicates} duplicates resolved).`);
      setPendingSyncCount(await getPendingOfflineCount());
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch {
      setSyncStatusMsg('Sync retry postponed. Retrying on reconnect.');
    } finally {
      setIsSyncing(false);
    }
  };

  const identifier = user.matricNumber || user.staffId || user.email;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* CUSTECH Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-3 shrink min-w-0">
            {/* Desktop / Tablet Full Logo */}
            <img
              src="/custech-logo-full.png"
              alt="Confluence University of Science and Technology, Osara"
              className="hidden sm:block h-10 sm:h-12 max-w-[200px] md:max-w-[320px] object-contain shrink-0"
            />
            {/* Mobile Phone Brand Header */}
            <div className="flex sm:hidden items-center gap-2 shrink-0">
              <img
                src="/custech-logo.png"
                alt="CUSTECH"
                className="h-9 w-9 object-contain shrink-0"
              />
              <div className="flex flex-col leading-none">
                <span className="text-sm font-black text-slate-900 tracking-tight">CUSTECH</span>
                <span className="text-[10px] font-extrabold text-[#8d4a27] tracking-wider">PORTAL</span>
              </div>
            </div>

            <span className="hidden xl:inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#fbf5ef] text-[#8d4a27] border border-[#ecdacb] tracking-wider">
              ACADEMIC PRESENCE
            </span>
          </div>

          {/* Center / Right Section: Network status, Sync, Role Context Switcher, Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Network / Dexie PWA Sync Badge */}
            <div className="flex items-center">
              {pendingSyncCount > 0 ? (
                <button
                  onClick={triggerSync}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition shadow-sm"
                  title="Offline records pending synchronization"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden xs:inline">{pendingSyncCount}</span>
                </button>
              ) : isOnline ? (
                <div
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#8d4a27] bg-[#fbf5ef] border border-[#ecdacb]"
                  title="Connected to CUSTECH Campus Network"
                >
                  <Wifi className="w-3.5 h-3.5 text-[#8d4a27]" />
                  <span>Campus Online</span>
                </div>
              ) : (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300"
                  title="No active internet. PWA offline cache enabled."
                >
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden xs:inline">Offline</span>
                </div>
              )}
            </div>

            {/* In-App Notification Bell */}
            <NotificationBell userId={user.id} />

            {/* Dynamic In-User Role Context Switcher */}
            <UserRoleContextSwitcher
              user={user}
              activeRole={activeRole}
              onRoleSwitched={onRoleSwitched}
            />

            {/* User Details & Sign Out */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-200">
              <div className="hidden lg:flex items-center gap-2.5 text-left">
                <div className="w-9 h-9 rounded-full bg-[#8d4a27] text-white flex items-center justify-center text-sm font-bold shadow-sm">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 leading-tight">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs font-mono text-slate-500">
                    {identifier}
                  </p>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition text-sm font-semibold shadow-sm"
                title="Sign out of CUSTECH Portal"
              >
                <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="py-2 px-4 bg-[#8d4a27] text-white text-xs font-semibold flex items-center justify-center gap-2 animate-fadeIn rounded-b-lg">
            <ShieldCheck className="w-4 h-4" />
            <span>{syncStatusMsg}</span>
          </div>
        )}
      </div>
    </header>
  );
};
