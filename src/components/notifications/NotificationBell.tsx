'use client';

import React from 'react';
import { AppNotification } from '@/types';
import { getUserNotificationsAction, markNotificationReadAction } from '@/actions/advanced';
import { Bell, AlertTriangle, HeartPulse, ShieldAlert, Info, Check } from 'lucide-react';

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);

  React.useEffect(() => {
    getUserNotificationsAction(userId).then(setNotifications);
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (notifId: string) => {
    await markNotificationReadAction(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'WARNING':
      case 'CRITICAL':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'WAIVER':
        return <HeartPulse className="w-4 h-4 text-blue-500" />;
      case 'FRAUD':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-[#8d4a27]" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 p-3 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Institutional Notifications ({notifications.length})
              </h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-semibold text-rose-600">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">
                  No notifications.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border text-xs transition ${
                      n.isRead
                        ? 'bg-zinc-50/50 dark:bg-zinc-850/40 border-zinc-100 dark:border-zinc-800 text-zinc-500'
                        : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                        <div>
                          <p className="font-bold text-xs">{n.title}</p>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                            {n.message}
                          </p>
                          <span className="text-[9px] text-zinc-400 font-mono mt-1 block">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="p-1 rounded text-slate-400 hover:text-[#8d4a27] hover:bg-[#fbf5ef] shrink-0 transition"
                          title="Mark as Read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
