import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../services/api';
import { Bell, Check, CheckCheck, Trash2, Calendar, FileClock, ShieldCheck } from 'lucide-react';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await getNotifications();
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await markNotificationAsRead(id);
      if (res.success) {
        // Update local list
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        toast.success('Notification marked as read');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await markAllNotificationsAsRead();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
        toast.success('All notifications marked as read');
      }
    } catch (err) {
      console.error(err);
      toast.error('Operation failed.');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'Leave Approved':
        return <ShieldCheck className="text-emerald-500 h-5 w-5" />;
      case 'Leave Rejected':
        return <Trash2 className="text-red-500 h-5 w-5" />;
      case 'Leave Clarification Requested':
        return <FileClock className="text-amber-500 h-5 w-5" />;
      default:
        return <Bell className="text-brand-500 h-5 w-5" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
            Notification Alerts {unreadCount > 0 && (
              <span className="text-xs bg-brand-600 text-white font-black px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Logs of requests approvals, profile alerts, and action reports.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800 p-6 space-y-4">
        {loading ? (
          <div className="space-y-3 py-6 animate-pulse">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-850 rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
            <Bell size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold">Clean inbox</p>
            <p className="text-xs">No notifications recorded.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => !notif.isRead && handleMarkAsRead(notif._id)}
                className={`p-4 rounded-2xl border flex items-start gap-4 transition-all duration-150 cursor-pointer ${
                  notif.isRead
                    ? 'bg-slate-50/40 dark:bg-slate-900/10 border-slate-100 dark:border-slate-800/40 text-slate-500'
                    : 'bg-brand-50/20 dark:bg-brand-500/5 border-brand-100/30 dark:border-brand-500/10 hover:bg-brand-50/30 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className={`p-2.5 rounded-xl ${
                  notif.isRead 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' 
                    : 'bg-brand-50 dark:bg-brand-500/10'
                }`}>
                  {getNotificationIcon(notif.type)}
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-xs">{notif.title}</p>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar size={10} />
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{notif.message}</p>
                </div>

                {!notif.isRead && (
                  <button
                    title="Mark as read"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(notif._id);
                    }}
                    className="p-1 bg-white hover:bg-brand-50 border border-slate-200 dark:border-slate-850 dark:bg-slate-900 hover:text-brand-600 rounded-lg text-slate-400"
                  >
                    <Check size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
