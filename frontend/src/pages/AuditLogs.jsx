import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { fetchAuditLogs } from '../services/api';
import { TableSkeleton } from '../components/SkeletonLoader';
import { Search, Calendar, User, Info, FileSpreadsheet } from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchAction, setSearchAction] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    getLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const getLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 15,
        ...(searchAction.trim() && { action: searchAction }),
      };
      const res = await fetchAuditLogs(params);
      if (res.success) {
        setLogs(res.data);
        setTotalPages(res.pagination.totalPages);
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not load system logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    getLogs();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          System Audit Trails
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Historical log records of administrative updates, auth attempts, and leave updates.
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="glass-card p-4 dark:bg-slate-900/50 dark:border-slate-800 flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchAction}
            onChange={(e) => setSearchAction(e.target.value)}
            placeholder="Search by action name…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </form>
      </div>

      <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
        {loading ? (
          <TableSkeleton columns={4} rows={10} />
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500 space-y-2">
            <FileSpreadsheet size={48} className="mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold">No audit logs found</p>
            <p className="text-xs">Adjust search query parameters or perform system actions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-4 pl-6">Timestamp</th>
                  <th className="py-4">Action</th>
                  <th className="py-4">Performed By</th>
                  <th className="py-4 pl-2">Target User</th>
                  <th className="py-4 pr-6">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-[11px] leading-relaxed">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 pl-6 text-slate-400 font-semibold whitespace-nowrap flex items-center gap-1">
                      <Calendar size={11} />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 font-bold text-slate-700 dark:text-slate-300">
                      {log.action}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 font-medium">
                      {log.performedBy ? (
                        <span className="flex items-center gap-1">
                          <User size={11} className="text-brand-500" />
                          {log.performedBy.name} ({log.performedBy.employeeId})
                        </span>
                      ) : (
                        'System'
                      )}
                    </td>
                    <td className="py-3 text-slate-500 pl-2">
                      {log.targetUser ? (
                        <span>{log.targetUser.name} ({log.targetUser.employeeId})</span>
                      ) : (
                        '--'
                      )}
                    </td>
                    <td className="py-3 text-slate-400 max-w-xs truncate pr-6" title={log.details}>
                      <span className="flex items-center gap-1">
                        <Info size={11} className="text-slate-300 shrink-0" />
                        {log.details}
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
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
