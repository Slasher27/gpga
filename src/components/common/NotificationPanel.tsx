import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell } from 'lucide-react';
import * as DB from '../../api';
import type { Notification } from '../../api';
import { timeAgo } from './SharedUI';
import { useDismiss } from './useDismiss';

export default function NotificationPanel({
  playerId,
  seasonId,
  onViewAll,
}: {
  playerId: string;
  seasonId: number | null;
  onViewAll?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Check on mount + poll every 2 min (count only — cheap)
  useEffect(() => {
    if (!playerId || !seasonId) return;
    let active = true;
    const check = () => DB.checkNotifications(seasonId).then((d) => { if (active) setUnreadCount(d.count); }).catch(() => {});
    check();
    const interval = setInterval(check, 120000);
    return () => { active = false; clearInterval(interval); };
  }, [playerId, seasonId]);

  // Load full list when opening
  useEffect(() => {
    if (!open || !playerId) return;
    let active = true;
    DB.getNotifications().then((n) => { if (active) setNotifications(n); }).catch(() => {});
    return () => { active = false; };
  }, [open, playerId, unreadCount]);

  // Close on Escape or outside click
  const close = useCallback(() => setOpen(false), []);
  useDismiss(close, open, ref);

  const handleMarkRead = async (id: number) => {
    await DB.markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: 1 } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await DB.markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    setUnreadCount(0);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors" aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="fixed left-2 right-2 top-16 z-50 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-1 sm:w-80 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-emerald-600 font-medium hover:text-emerald-700">Mark all read</button>
                )}
                {notifications.some(n => n.read) && (
                  <button onClick={async () => { await DB.clearReadNotifications(); setNotifications(prev => prev.filter(n => !n.read)); }} className="text-xs text-slate-400 font-medium hover:text-slate-600">Clear read</button>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400">No notifications</div>
              ) : notifications.map(n => (
                <button key={n.id} onClick={() => !n.read && handleMarkRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.read ? 'border-l-2 border-l-emerald-500 bg-emerald-50/30' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!n.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                    <span className="text-[10px] text-slate-400 flex-shrink-0">{timeAgo(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                </button>
              ))}
            </div>
            {onViewAll && (
              <button onClick={() => { onViewAll(); setOpen(false); }} className="w-full px-4 py-2.5 text-xs text-emerald-600 font-medium hover:bg-slate-50 border-t border-slate-100 text-center">
                View all notifications
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
