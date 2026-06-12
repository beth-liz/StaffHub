import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchAILogs } from '../services/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import { Search, Calendar, User, Info, Cpu, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const AICommandHistory = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    getLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const getLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        ...(statusFilter && { status: statusFilter }),
      };
      const res = await fetchAILogs(params);
      if (res.success) {
        setLogs(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load AI command logs.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Success':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20';
      case 'Failed':
        return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20';
      case 'Pending Clarification':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/20';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Success':
        return <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />;
      case 'Failed':
        return <XCircle size={12} className="text-red-500 shrink-0" />;
      case 'Pending Clarification':
        return <AlertCircle size={12} className="text-amber-500 shrink-0" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          <Cpu className="text-brand-500" size={24} />
          AI Voice Assistant History
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Monitor natural language processing interactions, mapped intents, executed operations, and system outcomes.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="glass-card p-4 dark:bg-slate-900/50 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
            <option value="Pending Clarification">Pending Clarification</option>
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
        {loading ? (
          <TableSkeleton columns={6} rows={10} />
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
            <Cpu size={48} className="mx-auto text-slate-300 dark:text-slate-755" />
            <p className="text-sm font-semibold">No AI logs found</p>
            <p className="text-xs">Adjust filter settings or run AI voice assistant actions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 pl-6">Timestamp</th>
                  <th className="py-4">User</th>
                  <th className="py-4">Voice Command</th>
                  <th className="py-4">Mapped Intent</th>
                  <th className="py-4">Executed Action</th>
                  <th className="py-4">Status</th>
                  <th className="py-4 pr-6">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 pl-6 text-slate-400 font-semibold whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                      {log.userId ? (
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-brand-500" />
                          <span>
                            {log.userId.name} 
                            <span className="text-[9px] text-slate-400 font-normal ml-1">
                              ({log.userId.employeeId})
                            </span>
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal">Unknown User</span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-800 dark:text-slate-200 font-medium italic max-w-xs truncate" title={log.command}>
                      "{log.command}"
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono text-[9px]">
                        {log.detectedIntent}
                      </span>
                    </td>
                    <td className="py-3.5 font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {log.actionExecuted}
                    </td>
                    <td className="py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getStatusBadgeClass(log.status)}`}>
                        {getStatusIcon(log.status)}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-400 max-w-xs truncate pr-6" title={log.aiInterpretation}>
                      <span className="flex items-center gap-1">
                        <Info size={11} className="text-slate-300 shrink-0" />
                        {log.aiInterpretation}
                      </span>
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
  );
};

export default AICommandHistory;
