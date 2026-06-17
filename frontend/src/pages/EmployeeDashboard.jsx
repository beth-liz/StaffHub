import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../services/api';
import { 
  User, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  Settings, 
  Bell,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const EmployeeDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleRefresh = () => fetchData();
    window.addEventListener('staffhub:refreshData', handleRefresh);
    return () => window.removeEventListener('staffhub:refreshData', handleRefresh);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await getDashboardData();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
      setError(true);
      if (!err.isNetworkError) {
        toast.error('Could not load dashboard information.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fade-in">
        <div className="glass-card p-8 text-center max-w-md space-y-4 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="inline-flex p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl">
            <Sparkles className="text-rose-500 h-8 w-8 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Could Not Load Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The server could not be reached or returned an error. Please check your connection and try again.
          </p>
          <button
            onClick={fetchData}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
          >
            Retry Dashboard Load
          </button>
        </div>
      </div>
    );
  }

  const {
    profile = {},
    leaveBalances = {},
    leaveStats = {},
    upcomingLeaves = [],
    recentNotifications = [],
  } = data || {};

  const initials = profile.name
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
    : 'EM';

  const avatarSrc = profile.profilePhoto
    ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${profile.profilePhoto}`
    : null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Profile Welcome Header */}
      <div className="glass-card p-6 md:p-8 bg-gradient-to-r from-brand-600 via-indigo-600 to-indigo-700 text-white border-none relative overflow-hidden dark:bg-none">
        {/* Background blobs for aesthetics */}
        <div className="absolute top-[-50px] right-[-50px] h-32 w-32 rounded-full bg-white/5 blur-xl" />
        <div className="absolute bottom-[-30px] right-[100px] h-24 w-24 rounded-full bg-white/5 blur-lg" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 z-10 relative">
          <div className="flex items-center gap-5">
            {avatarSrc ? (
              <img 
                src={avatarSrc} 
                alt={profile.name} 
                className="h-20 w-20 rounded-2xl object-cover border-2 border-white/20 shadow-md"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner">
                {initials}
              </div>
            )}
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight flex items-center gap-2">
                Welcome, {profile.firstName}! <Sparkles className="text-amber-300 h-5 w-5 animate-pulse" />
              </h1>
              <p className="text-xs text-brand-100 font-semibold mt-1">
                {profile.designation} <span className="mx-1.5 opacity-50">•</span> {profile.department} Department
              </p>
              <p className="text-[10px] text-brand-200 mt-0.5">
                ID: {profile.employeeId}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <Link 
              to="/leaves/apply" 
              className="px-4 py-2 bg-white text-brand-700 font-semibold text-xs rounded-xl shadow-md hover:bg-brand-50 transition-colors"
            >
              Apply for Leave
            </Link>
            <Link 
              to="/profile" 
              className="px-4 py-2 bg-white/10 text-white border border-white/15 font-semibold text-xs rounded-xl hover:bg-white/20 transition-colors"
            >
              Update Profile
            </Link>
          </div>
        </div>
      </div>

      {/* Leave Balance & Status Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Available Balance */}
        <div className="glass-card p-5 hover:scale-[1.02] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Leave Balance</p>
          <div className="flex justify-between items-end mt-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{leaveBalances.totalLeaveBalance || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Days available</p>
            </div>
            <div className="h-10 w-10 bg-brand-50 dark:bg-brand-500/10 text-brand-500 dark:text-brand-400 rounded-xl flex items-center justify-center">
              <Calendar size={18} />
            </div>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="glass-card p-5 hover:scale-[1.02] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Leaves</p>
          <div className="flex justify-between items-end mt-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{leaveStats.pendingLeaves || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Awaiting decision</p>
            </div>
            <div className="h-10 w-10 bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-xl flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
        </div>

        {/* Approved Leaves */}
        <div className="glass-card p-5 hover:scale-[1.02] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approved Leaves</p>
          <div className="flex justify-between items-end mt-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{leaveStats.approvedLeaves || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Approved requests</p>
            </div>
            <div className="h-10 w-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} />
            </div>
          </div>
        </div>

        {/* Rejected Leaves */}
        <div className="glass-card p-5 hover:scale-[1.02] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rejected Leaves</p>
          <div className="flex justify-between items-end mt-2">
            <div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white">{leaveStats.rejectedLeaves || 0}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Rejected requests</p>
            </div>
            <div className="h-10 w-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-xl flex items-center justify-center">
              <XCircle size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Leave Schedule & Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Detailed Leave Balances Card */}
          <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800">
            <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-brand-500" /> My Leave Allowances
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800/60">
                <p className="text-xs text-slate-400 font-semibold">Casual Leave</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">{leaveBalances.casualLeave || 0}d</p>
                <p className="text-[9px] text-slate-400 mt-1">Remaining of 12d</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800/60">
                <p className="text-xs text-slate-400 font-semibold">Sick Leave</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">{leaveBalances.sickLeave || 0}d</p>
                <p className="text-[9px] text-slate-400 mt-1">Remaining of 10d</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl text-center border border-slate-100 dark:border-slate-800/60">
                <p className="text-xs text-slate-400 font-semibold">Earned Leave</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white mt-1">{leaveBalances.earnedLeave || 0}d</p>
                <p className="text-[9px] text-slate-400 mt-1">Remaining of 15d</p>
              </div>
            </div>
          </div>

          {/* Upcoming Schedule */}
          <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Calendar size={18} className="text-brand-500" /> Upcoming Approved Leaves
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Your scheduled time-off calendars.</p>
              </div>
              <Link 
                to="/leaves" 
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400 hover:underline"
              >
                View History <ArrowRight size={14} />
              </Link>
            </div>

            <div className="space-y-3">
              {upcomingLeaves.length === 0 ? (
                <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
                  No upcoming approved leaves scheduled.
                </div>
              ) : (
                upcomingLeaves.map((leave) => (
                  <div key={leave._id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800 dark:text-white">{leave.leaveType}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 px-3 py-1 rounded-lg">
                      {leave.totalDays} {leave.totalDays === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Notifications and Alerts Feed */}
        <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Bell size={18} className="text-brand-500 animate-swing" /> Recent Activity Alerts
              </h3>
              <Link 
                to="/notifications" 
                className="text-[10px] font-bold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400 hover:underline uppercase"
              >
                See All
              </Link>
            </div>

            <div className="space-y-3.5">
              {recentNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                  No notifications recorded yet.
                </div>
              ) : (
                recentNotifications.map((notif) => (
                  <div key={notif._id} className={`p-3 rounded-xl border text-xs relative ${
                    notif.isRead 
                      ? 'bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-slate-800/40 text-slate-500' 
                      : 'bg-brand-50/20 dark:bg-brand-500/5 border-brand-100/30 dark:border-brand-500/10 text-slate-700 dark:text-slate-300'
                  }`}>
                    {!notif.isRead && (
                      <div className="absolute top-3 right-3 h-1.5 w-1.5 rounded-full bg-brand-500" />
                    )}
                    <p className="font-bold text-slate-800 dark:text-white pr-2">{notif.title}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{notif.message}</p>
                    <p className="text-[9px] text-slate-400 mt-1.5">
                      {new Date(notif.createdAt).toLocaleDateString()} {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2 mt-6">
            <Link 
              to="/profile" 
              className="inline-flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <span className="flex items-center gap-2"><User size={14} /> My Profile Info</span>
              <ArrowRight size={12} className="text-slate-400" />
            </Link>
            <Link 
              to="/settings" 
              className="inline-flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
            >
              <span className="flex items-center gap-2"><Settings size={14} /> Change Security & Password</span>
              <ArrowRight size={12} className="text-slate-400" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDashboard;
