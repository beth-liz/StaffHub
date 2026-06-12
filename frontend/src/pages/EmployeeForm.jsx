import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createEmployee, updateEmployee, getEmployeeById, uploadAvatar } from '../services/api';
import { FormSkeleton } from '../components/SkeletonLoader';
import {
  ArrowLeft,
  UserPlus,
  Edit3,
  Save,
  AlertCircle,
  Building,
  Mail,
  User,
  Phone,
  Layers,
  Key,
  Camera,
  X,
  Calendar,
  ShieldCheck
} from 'lucide-react';

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Marketing',
  'Sales',
  'Design',
  'Finance',
];

const ROLES = ['Employee', 'Admin'];

const STATUSES = ['Active', 'Inactive', 'Resigned', 'Terminated'];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  employeeId: '',
  department: '',
  designation: '',
  role: 'Employee',
  status: 'Active',
  dateOfJoining: '',
};

const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const phoneRegex = /^\d{10}$/;

const EmployeeForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Avatar state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [existingAvatar, setExistingAvatar] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadEmployee();
    } else {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      setFormData((prev) => ({ 
        ...prev, 
        employeeId: `EMP-${randNum}`,
        dateOfJoining: new Date().toISOString().split('T')[0]
      }));
    }
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadEmployee = async () => {
    try {
      setFetchingData(true);
      setError(null);
      const res = await getEmployeeById(id);
      if (res.success && res.data) {
        const emp = res.data;
        setFormData({
          firstName: emp.firstName || '',
          lastName: emp.lastName || '',
          email: emp.email || '',
          phone: emp.phone || '',
          employeeId: emp.employeeId || '',
          department: emp.department || '',
          designation: emp.designation || '',
          role: emp.role || 'Employee',
          status: emp.status || 'Active',
          dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '',
        });
        if (emp.profilePhoto) {
          setExistingAvatar(
            `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${emp.profilePhoto}`
          );
        }
      }
    } catch (err) {
      console.error(err);
      setError(
        err.displayMessage ||
          'Could not retrieve employee details. Verify that the entry exists.'
      );
    } finally {
      setFetchingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB.');
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const clearAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      errors.phone = 'Phone number must be exactly 10 digits';
    }

    if (!formData.employeeId.trim()) errors.employeeId = 'Employee ID is required';
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.designation.trim()) errors.designation = 'Designation is required';
    if (!formData.dateOfJoining) errors.dateOfJoining = 'Date of joining is required';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please resolve validation errors first.');
      return;
    }

    const toastId = toast.loading(
      isEditMode ? 'Updating profile…' : 'Creating employee record…'
    );

    try {
      setLoading(true);
      setError(null);

      let savedEmployee;
      if (isEditMode) {
        const res = await updateEmployee(id, formData);
        savedEmployee = res.data;
      } else {
        const payload = {
          ...formData,
          password: 'Temp@1234',
        };
        const res = await createEmployee(payload);
        savedEmployee = res.data;
      }

      if (avatarFile && savedEmployee?._id) {
        try {
          setUploadingAvatar(true);
          await uploadAvatar(savedEmployee._id, avatarFile);
        } catch (avatarErr) {
          console.warn('Avatar upload failed:', avatarErr);
          toast.error('Profile saved, but avatar upload failed.', { id: toastId });
          navigate('/employees');
          return;
        } finally {
          setUploadingAvatar(false);
        }
      }

      toast.success(
        isEditMode ? 'Employee profile updated!' : 'New employee added! Default password "Temp@1234" assigned.',
        { id: toastId }
      );
      navigate('/employees');
    } catch (err) {
      console.error(err);
      const message =
        err.response?.data?.errors?.join(', ') ||
        err.displayMessage ||
        'An unexpected server error occurred.';
      setError(message);
      toast.error(message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) return <FormSkeleton fields={8} />;

  const displayAvatar = avatarPreview || existingAvatar;
  const isSubmitting = loading || uploadingAvatar;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link
        to="/employees"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Directory
      </Link>

      <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 px-6 py-6 text-white flex items-center gap-4">
          <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
            {isEditMode ? <Edit3 size={24} /> : <UserPlus size={24} />}
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {isEditMode ? 'Modify Employee Profile' : 'Register New Employee'}
            </h2>
            <p className="text-xs text-brand-100 mt-0.5">
              {isEditMode
                ? 'Update designatory details and contact information.'
                : 'Provide details below to catalog the employee record. Password defaults to "Temp@1234".'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-950 p-4 rounded-xl text-red-700 dark:text-red-400 text-xs">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div>
                <span className="font-bold">Error: </span>
                {error}
              </div>
            </div>
          )}

          {/* ── Avatar Upload ── */}
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/60">
            <div className="relative">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt="Avatar preview"
                  className="h-20 w-20 rounded-2xl object-cover shadow-md border-2 border-brand-100"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 shadow-inner border border-slate-200 dark:border-slate-800/80">
                  <User size={28} />
                </div>
              )}
              {avatarPreview && (
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                  title="Remove selected image"
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <div className="text-center sm:text-left space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Profile Photo</p>
              <p className="text-[10px] text-slate-400">JPEG, PNG or WebP. Max 5 MB.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-1.5 cursor-pointer px-4.5 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 dark:hover:bg-brand-500/20 border border-brand-200 dark:border-brand-500/20 text-brand-700 dark:text-brand-400 text-xs font-bold transition-all"
              >
                <Camera size={14} />
                {displayAvatar ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
          </div>

          {/* ── Section: Personal Details ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label htmlFor="firstName" className="form-label text-xs">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="John"
                  className={`form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.firstName ? 'border-red-450' : ''}`}
                />
                {fieldErrors.firstName && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.firstName}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="lastName" className="form-label text-xs">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={`form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.lastName ? 'border-red-450' : ''}`}
                />
                {fieldErrors.lastName && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.lastName}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="email" className="form-label text-xs">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@company.com"
                    className={`form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.email ? 'border-red-450' : ''}`}
                  />
                </div>
                {fieldErrors.email && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="phone" className="form-label text-xs">Phone Number (10 digits)</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="5551234567"
                    maxLength={10}
                    className={`form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.phone ? 'border-red-450' : ''}`}
                  />
                </div>
                {fieldErrors.phone && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.phone}</p>}
              </div>
            </div>
          </div>

          {/* ── Section: Administrative Details ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Administrative & Organizational Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label htmlFor="employeeId" className="form-label text-xs">Employee ID</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="EMP-1001"
                    className={`form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.employeeId ? 'border-red-450' : ''}`}
                  />
                </div>
                {fieldErrors.employeeId && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.employeeId}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="department" className="form-label text-xs">Department</label>
                <div className="relative">
                  <Building size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className={`form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.department ? 'border-red-450' : ''}`}
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
                {fieldErrors.department && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.department}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="designation" className="form-label text-xs">Designation / Job Title</label>
                <div className="relative">
                  <Layers size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    id="designation"
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    placeholder="Software Engineer"
                    className={`form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.designation ? 'border-red-450' : ''}`}
                  />
                </div>
                {fieldErrors.designation && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.designation}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="dateOfJoining" className="form-label text-xs">Date of Joining</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="date"
                    id="dateOfJoining"
                    name="dateOfJoining"
                    value={formData.dateOfJoining}
                    onChange={handleChange}
                    className={`form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white ${fieldErrors.dateOfJoining ? 'border-red-450' : ''}`}
                  />
                </div>
                {fieldErrors.dateOfJoining && <p className="text-[10px] font-bold text-red-500 mt-1">{fieldErrors.dateOfJoining}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="role" className="form-label text-xs">System Role</label>
                <div className="relative">
                  <ShieldCheck size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="status" className="form-label text-xs">Account Status</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 font-semibold text-xs text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/25 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  {uploadingAvatar ? 'Uploading photo…' : 'Saving…'}
                </>
              ) : (
                <>
                  <Save size={14} />
                  {isEditMode ? 'Update Profile' : 'Save Profile'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeForm;
