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
        className="relative p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rose-600 text-white rounded-full text-xs font-bold flex items-center justify-center animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-md z-50 p-4 overflow-hidden animate-fadeIn">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Institutional Notifications ({notifications.length})
              </h4>
              {unreadCount > 0 && (
                <span className="text-xs font-semibold text-rose-600">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-400">
                  No notifications.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border transition ${
                      n.isRead
                        ? 'bg-slate-50/60 border-slate-200 text-slate-500'
                        : 'bg-white border-slate-200 text-slate-900 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">{getNotifIcon(n.type)}</div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                          <span className="text-xs text-slate-400 font-mono mt-1.5 block">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#8d4a27] hover:bg-[#fbf5ef] shrink-0 transition"
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
