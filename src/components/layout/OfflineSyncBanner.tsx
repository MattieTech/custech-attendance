'use client';

import React from 'react';
import { getPendingOfflineCount, getPendingOfflineRecords, markOfflineRecordsSynced } from '@/lib/offline/dexie-db';
import { syncOfflineBatch } from '@/actions/attendance';
import { WifiOff, Wifi, RefreshCw, CheckCircle2 } from 'lucide-react';

export const OfflineSyncBanner: React.FC = () => {
  const [isOnline, setIsOnline] = React.useState<boolean>(true);
  const [pendingCount, setPendingCount] = React.useState<number>(0);
  const [isSyncing, setIsSyncing] = React.useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = React.useState<string | null>(null);

  const checkPending = React.useCallback(async () => {
    try {
      const count = await getPendingOfflineCount();
      setPendingCount(count);
    } catch {
      // Ignored in SSR
    }
  }, []);

  const triggerSync = React.useCallback(async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      const records = await getPendingOfflineRecords();
      if (records.length === 0) {
        setPendingCount(0);
        setIsSyncing(false);
        return;
      }

      const batch = records.map((r) => ({
        sessionId: r.sessionId,
        matricNumber: r.matricNumber,
        attendancePin: r.attendancePin,
        assistedReason: r.assistedReason || 'No internet / mobile data',
        operatorProfileId: r.operatorProfileId,
        clientEventId: r.clientEventId,
      }));

      const res = await syncOfflineBatch(batch);
      const syncedIds = records.map((r) => r.clientEventId);
      await markOfflineRecordsSynced(syncedIds);
      await checkPending();

      setSyncFeedback(`Synced ${res.processed} offline record(s) to CUSTECH servers!`);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback('Sync failed. Will retry automatically.');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  }, [checkPending, isSyncing]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    checkPending();

    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodically check pending count every 15s
    const interval = setInterval(checkPending, 15000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [checkPending, triggerSync]);

  if (isOnline && pendingCount === 0 && !syncFeedback) {
    return null;
  }

  return (
    <div className="w-full z-40 transition-all duration-300">
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              <strong>Offline Mode Active:</strong> You can still record attendance. All scans and codes are saved locally on this device and will sync automatically once internet connects.
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold shrink-0 ml-2">
              {pendingCount} saved offline
            </span>
          )}
        </div>
      )}

      {isOnline && pendingCount > 0 && (
        <div className="bg-[#8d4a27] text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>
              Connection restored! You have <strong>{pendingCount} offline attendance record(s)</strong> stored on this device ready to sync.
            </span>
          </div>
          <button
            onClick={triggerSync}
            disabled={isSyncing}
            className="px-3 py-1 bg-white text-[#8d4a27] rounded-lg font-bold hover:bg-slate-100 transition flex items-center gap-1.5 shrink-0 ml-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      )}

      {syncFeedback && (
        <div className="bg-emerald-700 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-200" />
          <span>{syncFeedback}</span>
        </div>
      )}
    </div>
  );
};
