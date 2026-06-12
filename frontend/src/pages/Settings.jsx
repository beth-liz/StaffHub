import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { changeUserPassword, updateEmployee, getEmployeeById } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Key, 
  HelpCircle, 
  Moon, 
  Sun, 
  Save, 
  Lock, 
  ShieldCheck 
} from 'lucide-react';

const QUESTIONS = [
  'What was the name of your first elementary school?',
  "What is your mother's maiden name?",
  'In what city or town did your parents meet?',
  'What was the name of your first pet?',
  'What was your childhood nickname?',
];

const Settings = () => {
  const { user, updateUser } = useAuth();

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || 
    document.documentElement.classList.contains('dark')
  );

  // Change Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Security Question States
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [secLoading, setSecLoading] = useState(false);

  useEffect(() => {
    // Fetch current user details to prefill security question
    const fetchUserSecInfo = async () => {
      try {
        const res = await getEmployeeById(user.id);
        if (res.success && res.data) {
          setSecurityQuestion(res.data.securityQuestion || '');
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUserSecInfo();
  }, [user.id]);

  // Handle dark mode toggle
  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    if (nextMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      toast.success('Dark mode activated');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      toast.success('Light mode activated');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setPassLoading(true);
    const toastId = toast.loading('Changing password…');

    try {
      const res = await changeUserPassword({ currentPassword, newPassword });
      if (res.success) {
        toast.success('Password updated successfully!', { id: toastId });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Failed to change password.', { id: toastId });
    } finally {
      setPassLoading(false);
    }
  };

  const handleSecuritySubmit = async (e) => {
    e.preventDefault();

    if (!securityQuestion || !securityAnswer) {
      toast.error('Please choose a question and type an answer');
      return;
    }

    setSecLoading(true);
    const toastId = toast.loading('Updating security question…');

    try {
      const res = await updateEmployee(user.id, {
        securityQuestion,
        securityAnswer,
      });

      if (res.success) {
        toast.success('Security question updated successfully!', { id: toastId });
        setSecurityAnswer('');
        updateUser(res.data);
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Failed to update security question.', { id: toastId });
    } finally {
      setSecLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
          Portal Preferences & Settings
        </h1>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          Configure system themes and update authentication options.
        </p>
      </div>

      {/* Theme Preference Settings */}
      <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
          {darkMode ? <Moon size={16} className="text-brand-500" /> : <Sun size={16} className="text-brand-500" />} Display Theme Mode
        </h3>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Dark Interface theme</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Toggle dark interface layout options.</p>
          </div>

          <button
            onClick={toggleDarkMode}
            className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 focus:outline-none ${
              darkMode ? 'bg-brand-600 justify-end' : 'bg-slate-300 justify-start'
            }`}
          >
            <div className="bg-white w-4 h-4 rounded-full shadow-md transition-transform duration-200" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Change Password Form */}
        <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-between">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <Key size={16} className="text-brand-500" /> Change Password
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="form-label text-[10px] uppercase font-bold text-slate-400">Current Password</label>
                <div className="relative">
                  <Lock size={12} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label text-[10px] uppercase font-bold text-slate-400">New Password</label>
                <div className="relative">
                  <Lock size={12} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label text-[10px] uppercase font-bold text-slate-400">Confirm New Password</label>
                <div className="relative">
                  <Lock size={12} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
            >
              <Save size={14} /> Update Password
            </button>
          </form>
        </div>

        {/* Change Security Question Form */}
        <div className="glass-card p-6 dark:bg-slate-900/50 dark:border-slate-800 flex flex-col justify-between">
          <form onSubmit={handleSecuritySubmit} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <HelpCircle size={16} className="text-brand-500" /> Security Question
            </h3>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="form-label text-[10px] uppercase font-bold text-slate-400">Choose Question</label>
                <div className="relative">
                  <HelpCircle size={12} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <select
                    required
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  >
                    <option value="">Select question</option>
                    {QUESTIONS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="form-label text-[10px] uppercase font-bold text-slate-400">Security Answer</label>
                <div className="relative">
                  <ShieldCheck size={12} className="absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter answer here"
                    className="form-input text-xs pl-9 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={secLoading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
            >
              <Save size={14} /> Update Security Question
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default Settings;
