import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../services/api';
import { 
  Users, 
  UserCheck, 
  CalendarDays, 
  FileClock, 
  Building2, 
  UserPlus, 
  ArrowRight,
  TrendingUp,
  PieChart,
  ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchData();
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
        toast.error('Could not load dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 animate-fade-in">
        <div className="glass-card p-8 text-center max-w-md space-y-4 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="inline-flex p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl">
            <ClipboardList size={32} />
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

  const { metrics = {}, charts = {}, tables = {} } = data || {};
  const {
    totalEmployees = 0,
    activeEmployees = 0,
    employeesOnLeaveToday = 0,
    pendingLeaveRequests = 0,
    totalDepartments = 0,
    newJoinersThisMonth = 0,
  } = metrics;

  const {
    departmentDistribution = [],
    monthlyHiringTrend = [],
    leaveStatistics = {},
  } = charts;

  const {
    recentEmployees = [],
    recentLeaveRequests = [],
  } = tables;

  const getInitials = (name) => {
    if (!name) return 'HR';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20';
      case 'Inactive': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50';
      case 'Resigned': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20';
      case 'Terminated': return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20';
      default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800';
    }
  };

  const getLeaveStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20';
      case 'Pending': return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20';
      case 'Rejected': return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20';
      case 'Clarification Required': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20';
      default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            HR Analytics Dashboard
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Enterprise overview of StaffHub organizational analytics and activities.
          </p>
        </div>
        <div className="flex gap-3">
          <Link 
            to="/employees/new" 
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-600/20 transition-all hover:-translate-y-0.5"
          >
            Create Employee
          </Link>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-6">
        {/* Total Employees */}
        <div className="glass-card p-5 flex flex-col justify-between hover:scale-[1.03] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <div className="p-2 bg-brand-50 text-brand-500 dark:bg-brand-500/10 dark:text-brand-400 rounded-xl">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalEmployees}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Registered accounts</p>
          </div>
        </div>

        {/* Active Employees */}
        <div className="glass-card p-5 flex flex-col justify-between hover:scale-[1.03] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</span>
            <div className="p-2 bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-xl">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{activeEmployees}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Currently working</p>
          </div>
        </div>

        {/* On Leave Today */}
        <div className="glass-card p-5 flex flex-col justify-between hover:scale-[1.03] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">On Leave Today</span>
            <div className="p-2 bg-amber-50 text-amber-500 dark:bg-amber-500/10 dark:text-amber-400 rounded-xl">
              <CalendarDays size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{employeesOnLeaveToday}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Approved for today</p>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="glass-card p-5 flex flex-col justify-between hover:scale-[1.03] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Leaves</span>
            <div className="p-2 bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400 rounded-xl">
              <FileClock size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{pendingLeaveRequests}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Require decision</p>
          </div>
        </div>

        {/* Departments */}
        <div className="glass-card p-5 flex flex-col justify-between hover:scale-[1.03] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Departments</span>
            <div className="p-2 bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400 rounded-xl">
              <Building2 size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalDepartments}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Business segments</p>
          </div>
        </div>

        {/* New Joiners */}
        <div className="glass-card p-5 flex flex-col justify-between hover:scale-[1.03] transition-all dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">New Joiners</span>
            <div className="p-2 bg-cyan-50 text-cyan-500 dark:bg-cyan-500/10 dark:text-cyan-400 rounded-xl">
              <UserPlus size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{newJoinersThisMonth}</h3>
            <p className="text-[10px] text-slate-400 mt-1">Added this month</p>
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution Chart */}
        <div className="glass-card p-6 lg:col-span-2 dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Building2 size={18} className="text-brand-500" /> Department Distribution
            </h3>
            <p className="text-xs text-slate-400 mb-6">Staff count and weight representation per department division.</p>
          </div>
          
          <div className="space-y-4 flex-1">
            {departmentDistribution.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-12">No department data available.</p>
            ) : (
              departmentDistribution.map((dept, index) => {
                const maxCount = Math.max(...departmentDistribution.map(d => d.count)) || 1;
                const percentage = (dept.count / maxCount) * 100;
                
                const barColors = ['bg-brand-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-cyan-500'];
                const color = barColors[index % barColors.length];

                return (
                  <div key={dept.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">{dept.name}</span>
                      <span className="text-slate-400">
                        {dept.count} {dept.count === 1 ? 'member' : 'members'} <span className="text-slate-300 dark:text-slate-700 mx-1">|</span> {Math.round((dept.count / totalEmployees) * 100)}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div 
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Leave Status Metrics Chart (Donut-like List) */}
        <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <PieChart size={18} className="text-brand-500" /> Leave Allocation Stats
            </h3>
            <p className="text-xs text-slate-400 mb-6">Leave requests breakdown based on operational status.</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {Object.keys(leaveStatistics).map((status) => {
              const count = leaveStatistics[status] || 0;
              const totalLeaves = Object.values(leaveStatistics).reduce((a, b) => a + b, 0) || 1;
              const percent = Math.round((count / totalLeaves) * 100);

              let color = 'bg-blue-500';
              let textColor = 'text-blue-500';
              if (status === 'Approved') { color = 'bg-emerald-500'; textColor = 'text-emerald-500'; }
              if (status === 'Rejected') { color = 'bg-red-500'; textColor = 'text-red-500'; }
              if (status === 'Clarification Required') { color = 'bg-amber-500'; textColor = 'text-amber-500'; }

              return (
                <div key={status} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`h-3.5 w-3.5 rounded-full ${color}`} />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{status}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{count}</span>
                    <span className="text-[10px] text-slate-400 ml-1.5">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hiring Trend Visualization (Hiring trend horizontal index charts) */}
      <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-500" /> Organizational Hiring Trend
        </h3>
        <p className="text-xs text-slate-400 mb-6">Staff addition count over the last 6 months.</p>

        {monthlyHiringTrend.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No trend data available.</p>
        ) : (
          <div className="flex items-end justify-around h-40 pt-4 px-2 border-b border-slate-100 dark:border-slate-800">
            {monthlyHiringTrend.map((item) => {
              const maxVal = Math.max(...monthlyHiringTrend.map(t => t.count)) || 1;
              const height = (item.count / maxVal) * 80 + 10; // min 10% height
              return (
                <div key={item.month} className="flex flex-col items-center gap-2 group w-full max-w-[80px]">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                    +{item.count}
                  </span>
                  <div 
                    className="w-8 bg-gradient-to-t from-brand-600 to-indigo-500 rounded-t-lg group-hover:shadow-lg group-hover:shadow-brand-500/20 transition-all duration-300"
                    style={{ height: `${height}px` }}
                  />
                  <span className="text-[10px] font-semibold text-slate-400 text-center truncate w-full">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dashboard Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Recent Leave Requests */}
        <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-brand-500" /> Recent Leave Requests
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Approval requests needing inspection.</p>
            </div>
            <Link 
              to="/leaves" 
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400 hover:underline"
            >
              Approval Workflow <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentLeaveRequests.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No leave requests found.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider pb-3">
                    <th className="pb-3">Employee</th>
                    <th className="pb-3">Leave Type</th>
                    <th className="pb-3">Days</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                  {recentLeaveRequests.map((leave, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">{leave.employeeName}</td>
                      <td className="py-3 text-slate-500 dark:text-slate-400">{leave.leaveType}</td>
                      <td className="py-3 text-slate-400">{leave.totalDays} {leave.totalDays === 1 ? 'day' : 'days'}</td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getLeaveStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recently Appointed Staff */}
        <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users size={18} className="text-brand-500" /> New Registrants
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Most recently created user profiles.</p>
            </div>
            <Link 
              to="/employees" 
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400 hover:underline"
            >
              Manage Staff Directory <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {recentEmployees.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No employees cataloged.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider pb-3">
                    <th className="pb-3 pl-2">Employee</th>
                    <th className="pb-3">Role</th>
                    <th className="pb-3">Department</th>
                    <th className="pb-3 text-right pr-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                  {recentEmployees.map((emp) => {
                    const avatarSrc = emp.profilePhoto 
                      ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${emp.profilePhoto}` 
                      : null;

                    return (
                      <tr key={emp._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="py-2.5 pl-2 flex items-center gap-2.5">
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={emp.name} className="h-7 w-7 rounded-lg object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
                              {getInitials(emp.name)}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{emp.name}</p>
                            <p className="text-[9px] text-slate-400">{emp.employeeId}</p>
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-500 dark:text-slate-400">{emp.role}</td>
                        <td className="py-2.5 text-slate-400">{emp.department}</td>
                        <td className="py-2.5 text-right pr-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusColor(emp.status)}`}>
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
