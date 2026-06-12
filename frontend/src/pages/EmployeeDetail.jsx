import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getEmployeeById, deleteEmployee } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  AlertCircle,
  Key,
  Clock,
  User,
} from 'lucide-react';

const getInitials = (fullName) => {
  if (!fullName) return 'EM';
  const parts = fullName.trim().split(' ');
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : fullName.substring(0, 2).toUpperCase();
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'Admin';

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadEmployeeDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadEmployeeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getEmployeeById(id);
      if (res.success && res.data) {
        setEmployee(res.data);
      } else {
        throw new Error('Employee not found');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.displayMessage ||
          'Unable to fetch employee records. The profile may not exist.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setDeleting(true);
      await deleteEmployee(id);
      toast.success(`${employee.name} has been removed.`);
      navigate('/employees');
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Error occurred while deleting employee.');
    } finally {
      setDeleting(false);
    }
  };

  // Redirect non-admin users if trying to view someone else's detailed record
  if (!loading && !isAdmin && currentUser.id !== id) {
    return <Navigate to="/profile" replace />;
  }

  if (loading) {
    return (
      <div className="glass-card p-6 max-w-3xl mx-auto animate-pulse space-y-6">
        <div className="h-24 bg-slate-200 rounded-2xl" />
        <div className="space-y-3">
          <div className="h-6 w-1/3 bg-slate-200 rounded" />
          <div className="h-4 w-1/4 bg-slate-200 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-32 bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="glass-card p-8 text-center max-w-xl mx-auto mt-12 space-y-4">
        <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Profile Not Found</h2>
        <p className="text-slate-505 text-sm leading-relaxed text-slate-450">{error}</p>
        <Link
          to={isAdmin ? "/employees" : "/"}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-md transition-colors text-xs"
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>
      </div>
    );
  }

  const avatarSrc = employee.profilePhoto
    ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${employee.profilePhoto}`
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <Link
        to={isAdmin ? "/employees" : "/"}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft size={14} /> {isAdmin ? 'Back to Directory' : 'Back to Dashboard'}
      </Link>

      <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
        {/* Profile Banner */}
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 p-8 text-white relative flex flex-col md:flex-row md:items-center gap-6">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={employee.name}
              className="h-24 w-24 rounded-2xl object-cover shadow-lg border-2 border-white/20 flex-shrink-0"
            />
          ) : (
            <div className="h-24 w-24 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white font-extrabold text-3xl shadow-lg border border-white/20 flex-shrink-0">
              {getInitials(employee.name)}
            </div>
          )}

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight">{employee.name}</h2>
            <p className="text-xs text-brand-100 font-semibold flex items-center gap-1.5">
              <Briefcase size={14} /> {employee.designation}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-200">
              <span className="flex items-center gap-1">
                <Building2 size={12} /> {employee.department}
              </span>
              <span className="hidden sm:inline text-white/30">•</span>
              <span className="flex items-center gap-1">
                <Key size={12} /> ID: {employee.employeeId}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 md:p-8 space-y-6 text-xs text-slate-700 dark:text-slate-350">
          <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wide border-b border-slate-100 dark:border-slate-800/80 pb-2">
              Contact &amp; Organizational Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400">
                  <Mail size={16} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">
                    Email Address
                  </span>
                  <a
                    href={`mailto:${employee.email}`}
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  >
                    {employee.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400">
                  <Phone size={16} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">
                    Phone Number
                  </span>
                  <a
                    href={`tel:${employee.phone}`}
                    className="text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  >
                    {employee.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400">
                  <Building2 size={16} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">
                    Department
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {employee.department}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400">
                  <User size={16} />
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase">
                    Designation
                  </span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {employee.designation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Record timestamps */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900/30 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
            <span className="flex items-center gap-1 font-semibold">
              <Clock size={11} /> Created:{' '}
              {new Date(employee.createdAt).toLocaleString()}
            </span>
            <span className="font-semibold">
              Updated: {new Date(employee.updatedAt).toLocaleString()}
            </span>
          </div>

          {/* Profile Actions */}
          {isAdmin && (
            <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-bold transition-all"
              >
                <Trash2 size={14} /> Remove Employee
              </button>
              <Link
                to={`/employees/${employee._id}/edit`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/25 transition-all"
              >
                <Edit3 size={14} /> Edit Profile
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isAdmin && (
        <ConfirmModal
          isOpen={deleteModalOpen}
          onClose={() => !deleting && setDeleteModalOpen(false)}
          onConfirm={handleConfirmDelete}
          loading={deleting}
          title="Delete Employee Record"
          message={
            <>
              Are you sure you want to delete the employee record for{' '}
              <span className="font-bold text-slate-800 dark:text-white border-b border-red-200">
                {employee.name}
              </span>
              ? This action is permanent and cannot be undone.
            </>
          }
          confirmLabel="Delete Record"
          variant="danger"
        />
      )}
    </div>
  );
};

export default EmployeeDetail;
