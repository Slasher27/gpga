// @ts-nocheck — legacy JS patterns; migrate to strict TS in a follow-up pass.
import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import * as DB from '../api';
import { Card, timeAgo } from './common';

const timeAgoLong = (date) => timeAgo(date, true);

export default function NotificationsView({ currentUser }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      DB.getNotifications(currentUser.id).then(data => { setNotifications(data); setLoading(false); }).catch(() => setLoading(false));
    }
  }, [currentUser?.id]);

  const handleMarkRead = async (id) => {
    await DB.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
  };

  const handleMarkAllRead = async () => {
    await DB.markAllNotificationsRead(currentUser.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  const handleClearRead = async () => {
    await DB.clearReadNotifications(currentUser.id);
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between h-10">
        <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
        <div className="flex items-center gap-3">
          {unread.length > 0 && (
            <button onClick={handleMarkAllRead} className="text-sm text-emerald-600 font-medium hover:text-emerald-700">Mark all read</button>
          )}
          {read.length > 0 && (
            <button onClick={handleClearRead} className="text-sm text-slate-400 font-medium hover:text-slate-600">Clear read</button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
      ) : notifications.length === 0 ? (
        <Card>
          <div className="p-8 text-center">
            <Bell size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No notifications yet</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Unread */}
          {unread.length > 0 && (
            <Card>
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">Unread ({unread.length})</p>
              </div>
              <div className="divide-y divide-slate-50">
                {unread.map(n => (
                  <button type="button" key={n.id} onClick={() => handleMarkRead(n.id)} aria-label="Mark notification as read"
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-l-2 border-l-emerald-500">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                        <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{timeAgoLong(n.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Read */}
          {read.length > 0 && (
            <Card>
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase">Read ({read.length})</p>
              </div>
              <div className="divide-y divide-slate-50">
                {read.map(n => (
                  <div key={n.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-600">{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.body}</p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{timeAgoLong(n.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
