import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getLeaveHistory, updateLeaveStatus } from '../services/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import { 
  FileText, 
  Search, 
  Check, 
  X, 
  MessageSquare, 
  Download, 
  Filter,
  User,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

const LeaveHistory = () => {
  const { user } = useAuth();
  const isAdmin = user.role === 'Admin';

  // States
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [leaveType, setLeaveType] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Leave Approval Panel State
  const [activeRequest, setActiveRequest] = useState(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, leaveType, status]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        ...(leaveType && { leaveType }),
        ...(status && { status }),
        ...(isAdmin && search.trim() && { search }),
      };
      
      const res = await getLeaveHistory(params);
      if (res.success) {
        setLeaves(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load leave records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeaves();
  };

  const handleWorkflowAction = async (requestId, newStatus) => {
    if (!adminRemarks.trim()) {
      toast.error('Remarks are mandatory for leave status updates');
      return;
    }

    setSubmitLoading(true);
    const toastId = toast.loading(`Updating leave status to ${newStatus}…`);

    try {
      const res = await updateLeaveStatus(requestId, {
        status: newStatus,
        adminRemarks,
      });

      if (res.success) {
        toast.success(`Leave request ${newStatus.toLowerCase()} successfully!`, { id: toastId });
        setActiveRequest(null);
        setAdminRemarks('');
        fetchLeaves();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Workflow transition failed.', { id: toastId });
    } finally {
      setSubmitLoading(false);
    }
  };

  const getLeaveStatusClass = (s) => {
    switch (s) {
      case 'Approved': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20';
      case 'Rejected': return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20';
      case 'Clarification Required': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in">
      
      {/* Leaves Logs Table Column */}
      <div className={`${activeRequest ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              {isAdmin ? 'Staff Leave Approvals' : 'My Leave Logs'}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              List of applied time-off applications and workflow status indexes.
            </p>
          </div>
        </div>

        {/* Filters and Search toolbar */}
        <div className="glass-card p-4 dark:bg-slate-900/50 dark:border-slate-800 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Type filter */}
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-3.5 text-slate-400" />
              <select
                value={leaveType}
                onChange={(e) => { setLeaveType(e.target.value); setPage(1); }}
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Leave Types</option>
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
                <option value="Work From Home">Work From Home</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
                <option value="Loss Of Pay">Loss Of Pay</option>
              </select>
            </div>

            {/* Status filter */}
            <div className="relative">
              <Layers size={14} className="absolute left-3 top-3.5 text-slate-400" />
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Clarification Required">Clarification Required</option>
              </select>
            </div>
          </div>

          {/* Name search (Admin only) */}
          {isAdmin && (
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employee name…"
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </form>
          )}
        </div>

        {/* Tabular data */}
        <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
          {loading ? (
            <TableSkeleton columns={5} rows={6} />
          ) : leaves.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
              <FileText size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">No leave logs recorded</p>
              <p className="text-xs">Adjust filter settings or submit a new application.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-4 pl-6">Employee</th>
                    <th className="py-4">Leave Type</th>
                    <th className="py-4">Dates Range</th>
                    <th className="py-4">Days</th>
                    <th className="py-4">Status</th>
                    <th className="py-4 text-right pr-6">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                  {leaves.map((leave) => (
                    <tr 
                      key={leave._id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                        activeRequest?._id === leave._id ? 'bg-brand-50/10 dark:bg-brand-500/5' : ''
                      }`}
                    >
                      <td className="py-4 pl-6 font-semibold text-slate-800 dark:text-slate-200">
                        {leave.employeeName}
                        <p className="text-[9px] text-slate-400 font-normal mt-0.5">{leave.department}</p>
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-400 font-medium">{leave.leaveType}</td>
                      <td className="py-4 text-slate-400">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 text-slate-600 dark:text-slate-300 font-bold">{leave.totalDays}d</td>
                      <td className="py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${getLeaveStatusClass(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-6">
                        <button
                          onClick={() => {
                            setActiveRequest(leave);
                            setAdminRemarks(leave.adminRemarks || '');
                          }}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-500/10 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 font-semibold rounded-lg transition-colors"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 px-6 py-4">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leave Request Detailed Inspector Panel */}
      {activeRequest && (
        <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 space-y-6 h-fit animate-fade-in">
          <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-md font-bold text-slate-800 dark:text-white">Request Inspection</h3>
              <p className="text-[10px] text-slate-400">Applied on {new Date(activeRequest.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => setActiveRequest(null)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div className="h-8 w-8 rounded-full bg-brand-500/10 text-brand-500 dark:text-brand-400 flex items-center justify-center font-bold">
                <User size={16} />
              </div>
              <div>
                <p className="font-bold text-slate-800 dark:text-white">{activeRequest.employeeName}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{activeRequest.department}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 font-semibold">Type of Leave</span>
                <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5">{activeRequest.leaveType}</p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold">Duration Days</span>
                <p className="font-bold text-brand-600 dark:text-brand-400 mt-0.5">{activeRequest.totalDays} days</p>
              </div>
            </div>

            <div>
              <span className="text-slate-400 font-semibold">Date Range Requested</span>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1">
                <Calendar size={12} />
                {new Date(activeRequest.startDate).toLocaleDateString()} to {new Date(activeRequest.endDate).toLocaleDateString()}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/20 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Leave Reason</span>
              <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{activeRequest.reason}</p>
            </div>



            {/* Workflow Action Panel */}
            {isAdmin && (activeRequest.status === 'Pending' || activeRequest.status === 'Clarification Required') ? (
              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 space-y-4">
                <div className="space-y-1">
                  <label className="form-label text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Remarks / Decision Notes (Required)
                  </label>
                  <textarea
                    rows={2.5}
                    required
                    value={adminRemarks}
                    onChange={(e) => setAdminRemarks(e.target.value)}
                    placeholder="Enter approval details or clarification query reasons..."
                    className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white resize-none"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleWorkflowAction(activeRequest._id, 'Approved')}
                    disabled={submitLoading}
                    className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    <Check size={14} /> Approve Leave Request
                  </button>
                  <button
                    onClick={() => handleWorkflowAction(activeRequest._id, 'Rejected')}
                    disabled={submitLoading}
                    className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    <X size={14} /> Reject Leave Request
                  </button>
                  <button
                    onClick={() => handleWorkflowAction(activeRequest._id, 'Clarification Required')}
                    disabled={submitLoading}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    <MessageSquare size={14} /> Request Clarification
                  </button>
                </div>
              </div>
            ) : (
              // Status & Remarks view only (No actions)
              <div className="border-t border-slate-100 dark:border-slate-800/60 pt-4 space-y-3">
                <div>
                  <span className="text-slate-400 font-semibold">Processed Status</span>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${getLeaveStatusClass(activeRequest.status)}`}>
                      {activeRequest.status}
                    </span>
                  </div>
                </div>
                {activeRequest.adminRemarks && (
                  <div className="bg-slate-50 dark:bg-slate-800/30 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Info size={12} /> HR Remarks:</span>
                    <p className="text-slate-600 dark:text-slate-300 mt-1 italic">"{activeRequest.adminRemarks}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveHistory;
