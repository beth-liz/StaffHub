import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getEmployees, deleteEmployee, exportEmployees, updateEmployee } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import SortableHeader from '../components/SortableHeader';
import { TableSkeleton } from '../components/SkeletonLoader';
import {
  Search,
  Trash2,
  Edit3,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserMinus,
  Phone,
  Building2,
  Mail,
  AlertCircle,
  Briefcase,
  Download,
  Key,
  Layers,
  UserCheck
} from 'lucide-react';

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Marketing',
  'Sales',
  'Design',
  'Finance',
];

const STATUSES = [
  'Active',
  'Inactive',
  'Resigned',
  'Terminated'
];

const getInitials = (fullName) => {
  if (!fullName) return 'EM';
  const parts = fullName.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : fullName.substring(0, 2).toUpperCase();
};

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Query state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [employeeToReset, setEmployeeToReset] = useState(null);
  const [resetting, setResetting] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, department, status, sort, page]);

  useEffect(() => {
    const handleRefresh = () => fetchEmployees();
    window.addEventListener('staffhub:refreshData', handleRefresh);
    return () => window.removeEventListener('staffhub:refreshData', handleRefresh);
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmployees({
        search: debouncedSearch,
        department,
        status,
        sort,
        page,
        limit: 8,
      });
      if (res.success) {
        setEmployees(res.data);
        setTotalPages(res.pagination.totalPages);
        setTotalRecords(res.pagination.total);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.displayMessage ||
          'Could not retrieve employee list. Ensure the backend server is online.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (emp) => {
    setEmployeeToDelete(emp);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      setDeleting(true);
      await deleteEmployee(employeeToDelete._id);
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
      toast.success(`${employeeToDelete.name} has been removed.`);
      if (employees.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchEmployees();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Failed to delete employee record.');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetClick = (emp) => {
    setEmployeeToReset(emp);
    setResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!employeeToReset) return;
    try {
      setResetting(true);
      const res = await updateEmployee(employeeToReset._id, {
        password: 'Temp@1234',
        isTempPassword: true
      });
      
      if (res.success) {
        setResetModalOpen(false);
        setEmployeeToReset(null);
        toast.success(`Password for ${employeeToReset.name} has been reset to "Temp@1234"`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportEmployees({ search: debouncedSearch, department, status, sort });
      toast.success('Employee data exported to Excel!');
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Failed to export employee data.');
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (field) => {
    setSort(field);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDepartment('');
    setStatus('');
    setSort('-createdAt');
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Active': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20';
      case 'Inactive': return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50';
      case 'Resigned': return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20';
      case 'Terminated': return 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-200/50 dark:border-red-500/20';
      default: return 'bg-slate-50 text-slate-700 dark:bg-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Employee Directory
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
            Manage directory data, designatory details, and department allocations.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            title="Export to Excel"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs rounded-xl transition-all disabled:opacity-60"
          >
            {exporting ? (
              <span className="h-4 w-4 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
            ) : (
              <Download size={14} />
            )}
            Export Excel
          </button>
          <RouterLink
            to="/employees/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/25 transition-all"
          >
            <Plus size={14} /> Add Employee
          </RouterLink>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="glass-card p-4 dark:bg-slate-900/50 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            id="employee-search"
            type="text"
            placeholder="Search by name, ID, email or designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all text-xs"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Department filter */}
          <div className="flex items-center gap-1.5 flex-1 md:flex-none">
            <Building2 size={14} className="text-slate-400" />
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm w-full md:w-auto"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-1 md:flex-none">
            <UserCheck size={14} className="text-slate-400" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm w-full md:w-auto"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Active filter badge */}
          {(searchTerm || department || status || sort !== '-createdAt') && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors"
            >
              Clear filters ×
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : error ? (
        <div className="glass-card p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="h-12 w-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Database Query Failed
          </h3>
          <p className="text-sm text-slate-400">{error}</p>
          <button
            onClick={fetchEmployees}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      ) : employees.length === 0 ? (
        <div className="glass-card p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="h-16 w-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <UserMinus size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No Employees Found</h3>
          <p className="text-sm text-slate-400">
            We couldn't find any staff records matching your search criteria.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table */}
          <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <SortableHeader
                      label="Employee"
                      field="name"
                      currentSort={sort}
                      onSort={handleSort}
                      className="pl-6 text-slate-400"
                    />
                    <th className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Designation
                    </th>
                    <SortableHeader
                      label="Department"
                      field="department"
                      currentSort={sort}
                      onSort={handleSort}
                      className="text-slate-400"
                    />
                    <th className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      System Role
                    </th>
                    <th className="py-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>
                    <th className="py-4 text-center pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-xs">
                  {employees.map((emp, index) => {
                    const avatarSrc = emp.profilePhoto
                      ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${emp.profilePhoto}`
                      : null;

                    return (
                      <tr
                        key={emp._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors group"
                      >
                        {/* Name & Avatar */}
                        <td className="py-3.5 pl-6">
                          <div className="flex items-center gap-3">
                            <span className="text-brand-500 font-mono text-[10px] font-bold">#{index + 1}</span>
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={emp.name}
                                className="h-9 w-9 rounded-xl object-cover shadow-sm"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                                {getInitials(emp.name)}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 transition-colors">
                                {emp.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {emp.employeeId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Designation */}
                        <td className="py-3.5 font-medium text-slate-700 dark:text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Briefcase size={13} className="text-slate-400" />
                            <span>{emp.designation}</span>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 text-slate-600 dark:text-slate-400 font-medium">
                          {emp.department}
                        </td>

                        {/* Role */}
                        <td className="py-3.5 text-slate-500 dark:text-slate-400 font-bold">
                          {emp.role}
                        </td>

                        {/* Status */}
                        <td className="py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusColor(emp.status)}`}>
                            {emp.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 text-center pr-6">
                          <div className="flex items-center justify-center gap-1">
                            <RouterLink
                              to={`/employees/${emp._id}`}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="View Profile Details"
                            >
                              <Eye size={14} />
                            </RouterLink>
                            <RouterLink
                              to={`/employees/${emp._id}/edit`}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Edit Profile"
                            >
                              <Edit3 size={14} />
                            </RouterLink>
                            <button
                              onClick={() => handleResetClick(emp)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <Key size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(emp)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 text-xs">
              <span className="text-slate-450 font-semibold">
                Page {page} of {totalPages} ({totalRecords} records)
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`h-7 w-7 text-[10px] font-bold rounded-lg transition-all ${
                      page === i + 1
                        ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                        : 'border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reusable Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => !deleting && setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="Delete Employee Record"
        message={
          <>
            Are you sure you want to remove{' '}
            <span className="font-bold text-slate-800 dark:text-white border-b border-red-200">
              {employeeToDelete?.name}
            </span>
            ? This action is permanent and will remove leave requests, balances, and notifications associated with them.
          </>
        }
        confirmLabel="Delete Record"
        variant="danger"
      />

      {/* Reusable Password Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        onClose={() => !resetting && setResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        loading={resetting}
        title="Reset Password to Default"
        message={
          <>
            Are you sure you want to reset password for{' '}
            <span className="font-bold text-slate-800 dark:text-white">
              {employeeToReset?.name}
            </span>
            ? This will assign a default temporary password "Temp@1234" and flag the account to force password change on their next sign-in.
          </>
        }
        confirmLabel="Reset Password"
        variant="warning"
      />
    </div>
  );
};

export default EmployeeList;
