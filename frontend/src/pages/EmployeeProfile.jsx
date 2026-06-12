import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getEmployeeById, updateEmployee, uploadAvatar } from '../services/api';
import { FormSkeleton } from '../components/SkeletonLoader';
import { 
  User, 
  Phone, 
  MapPin, 
  ShieldAlert, 
  Save, 
  Camera, 
  Building,
  Calendar,
  Contact,
  HeartPulse,
  Users
} from 'lucide-react';

const EmployeeProfile = () => {
  const { id: routeId } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const navigate = useNavigate();
  
  // If no ID is passed in route, display the logged-in user's profile
  const isSelf = !routeId || routeId === currentUser.id;
  const targetId = isSelf ? currentUser.id : routeId;
  const isAdmin = currentUser.role === 'Admin';

  const fileInputRef = useRef(null);

  // States
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Image Upload state
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchProfile();
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(targetId);
      if (res.success) {
        setProfile(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Failed to retrieve profile details.');
      if (isSelf) {
        setProfile(currentUser);
      } else {
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image file must be under 5MB.');
      return;
    }

    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const triggerImageUpload = async (file) => {
    setUploadingImage(true);
    const toastId = toast.loading('Uploading profile picture…');
    try {
      const res = await uploadAvatar(targetId, file);
      if (res.success) {
        setProfile(res.data);
        setAvatarFile(null);
        setAvatarPreview(null);
        if (isSelf) {
          updateUser({ profilePhoto: res.avatarUrl });
        }
        toast.success('Profile picture updated!', { id: toastId });
      }
    } catch (err) {
      toast.error('Failed to upload image.', { id: toastId });
    } finally {
      setUploadingImage(false);
    }
  };

  // Upload immediately when a preview exists
  useEffect(() => {
    if (avatarFile) {
      triggerImageUpload(avatarFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarFile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const toastId = toast.loading('Saving profile changes…');

    try {
      const res = await updateEmployee(targetId, profile);
      if (res.success) {
        setProfile(res.data);
        if (isSelf) {
          updateUser(res.data);
        }
        toast.success('Profile updated successfully!', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Failed to update profile.', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <FormSkeleton fields={8} />;

  const displayPhoto = avatarPreview || (profile.profilePhoto 
    ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${profile.profilePhoto}`
    : null);

  const initials = profile.name
    ? `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
    : 'EM';

  // Can employee edit these fields? False if employee, True if Admin
  const isEditableByRole = isAdmin; 

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            {isSelf ? 'My Employee Profile' : `${profile.name}'s Profile`}
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Review designations and update contact parameters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Image & Summary Column */}
        <div className="glass-card p-6 flex flex-col items-center text-center dark:bg-slate-900/50 dark:border-slate-800 h-fit space-y-4">
          <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {displayPhoto ? (
              <img 
                src={displayPhoto} 
                alt={profile.name} 
                className="h-28 w-28 rounded-2xl object-cover shadow-md border-2 border-brand-100 group-hover:opacity-75 transition-opacity"
              />
            ) : (
              <div className="h-28 w-28 rounded-2xl bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-600 font-extrabold text-3xl shadow-inner group-hover:opacity-75 transition-opacity">
                {initials}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
            
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{profile.name}</h3>
            <p className="text-xs text-slate-400 font-semibold">{profile.designation}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{profile.department} Dept</p>
          </div>

          <div className="w-full border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-2 text-left text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Employee ID</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">{profile.employeeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">System Role</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">{profile.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 font-semibold">Account Status</span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">{profile.status}</span>
            </div>
          </div>
        </div>

        {/* Form Details Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: Personal Info (Editable by employee) */}
          <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 space-y-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <User size={16} className="text-brand-500" /> Personal Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label text-xs">First Name</label>
                <input 
                  type="text" 
                  name="firstName" 
                  disabled={!isEditableByRole}
                  value={profile.firstName || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Last Name</label>
                <input 
                  type="text" 
                  name="lastName" 
                  disabled={!isEditableByRole}
                  value={profile.lastName || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  disabled={!isEditableByRole}
                  value={profile.email || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    name="phone" 
                    value={profile.phone || ''} 
                    onChange={handleInputChange}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Date of Birth</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="date" 
                    name="dateOfBirth" 
                    value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : ''} 
                    onChange={handleInputChange}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Gender</label>
                <select 
                  name="gender" 
                  value={profile.gender || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Marital Status</label>
                <select 
                  name="maritalStatus" 
                  value={profile.maritalStatus || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                >
                  <option value="">Select Status</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Blood Group</label>
                <div className="relative">
                  <HeartPulse size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    name="bloodGroup" 
                    placeholder="e.g. O+, A-"
                    value={profile.bloodGroup || ''} 
                    onChange={handleInputChange}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label text-xs">Home Address</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input 
                  type="text" 
                  name="address" 
                  placeholder="Street and Number"
                  value={profile.address || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="form-label text-xs">City</label>
                <input 
                  type="text" 
                  name="city" 
                  value={profile.city || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="form-label text-xs">State</label>
                <input 
                  type="text" 
                  name="state" 
                  value={profile.state || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="form-label text-xs">Country</label>
                <input 
                  type="text" 
                  name="country" 
                  value={profile.country || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                />
              </div>
              <div className="space-y-1">
                <label className="form-label text-xs">Zip Code</label>
                <input 
                  type="text" 
                  name="postalCode" 
                  value={profile.postalCode || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                />
              </div>
            </div>
          </div>

          {/* Section: Emergency Contacts */}
          <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <Contact size={16} className="text-brand-500" /> Emergency Contact
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label text-xs">Contact Name</label>
                <input 
                  type="text" 
                  name="emergencyContactName" 
                  value={profile.emergencyContactName || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                />
              </div>
              
              <div className="space-y-1">
                <label className="form-label text-xs">Contact Phone</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    name="emergencyContactPhone" 
                    value={profile.emergencyContactPhone || ''} 
                    onChange={handleInputChange}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Administrative Info (Only editable by Admin) */}
          <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <Building size={16} className="text-brand-500" /> Administrative Details
            </h3>

            {!isEditableByRole && (
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/30 text-[10px] text-slate-400 font-semibold p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                <ShieldAlert size={14} className="text-amber-500 shrink-0" />
                These parameters are controlled by Human Resources.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="form-label text-xs">Department</label>
                <input 
                  type="text" 
                  name="department" 
                  disabled={!isEditableByRole}
                  value={profile.department || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Designation / Title</label>
                <input 
                  type="text" 
                  name="designation" 
                  disabled={!isEditableByRole}
                  value={profile.designation || ''} 
                  onChange={handleInputChange}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                />
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Joining Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input 
                    type="date" 
                    name="dateOfJoining" 
                    disabled={!isEditableByRole}
                    value={profile.dateOfJoining ? new Date(profile.dateOfJoining).toISOString().split('T')[0] : ''} 
                    onChange={handleInputChange}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Reporting Manager</label>
                <div className="relative">
                  <Users size={14} className="absolute left-3.5 top-3.5 text-slate-400" />
                  {isEditableByRole ? (
                    <input 
                      type="text" 
                      name="reportingManager" 
                      placeholder="Manager ID"
                      value={profile.reportingManager || ''} 
                      onChange={handleInputChange}
                      className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white" 
                    />
                  ) : (
                    <input 
                      type="text" 
                      disabled
                      value={profile.reportingManager?.name || 'No direct manager assigned'}
                      className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white disabled:opacity-60" 
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/25 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="h-4.5 w-4.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Saving Changes…
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Profile
                </>
              )}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
};

export default EmployeeProfile;
