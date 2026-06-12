import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { setupFirstLogin } from '../services/api';
import { 
  Key, 
  HelpCircle, 
  CheckCircle2, 
  ShieldAlert, 
  Eye, 
  EyeOff, 
  Lock 
} from 'lucide-react';

const QUESTIONS = [
  'What was the name of your first elementary school?',
  "What is your mother's maiden name?",
  'In what city or town did your parents meet?',
  'What was the name of your first pet?',
  'What was your childhood nickname?',
];

const FirstLogin = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If user is already authenticated fully, redirect to dashboard
  useEffect(() => {
    if (user && !user.isTempPassword) {
      navigate('/');
    }
  }, [user, navigate]);

  const stateData = location.state || {};
  const identifier = stateData.identifier || '';
  const tempPassword = stateData.tempPassword || '';

  // Redirect to login if accessed directly without temp state
  useEffect(() => {
    if (!identifier || !tempPassword) {
      toast.error('Session expired. Please sign in again.');
      navigate('/login');
    }
  }, [identifier, tempPassword, navigate]);

  // States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword || !securityQuestion || !securityAnswer) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Configuring your account…');

    try {
      const res = await setupFirstLogin({
        identifier,
        tempPassword,
        newPassword,
        securityQuestion,
        securityAnswer,
      });

      if (res.success) {
        // Log in the user with final JWT and details
        login(res.token, res.user);
        toast.success('Account setup complete! Welcome to StaffHub.', { id: toastId });
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Setup failed. Please check password requirements.', {
        id: toastId,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-12 relative overflow-hidden select-none">
      <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[55%] rounded-full bg-brand-500/10 blur-[130px] pointer-events-none" />
      
      <div className="w-full max-w-lg space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 bg-amber-500/20 text-amber-500 rounded-2xl items-center justify-center shadow-lg shadow-amber-500/10 mb-4">
            <ShieldAlert size={24} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Setup Your Account</h2>
          <p className="text-sm text-slate-400 mt-1.5">
            You are logging in with a temporary password. Please configure a secure password and security question to continue.
          </p>
        </div>

        <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Password Rules Alert */}
            <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-700/50 text-slate-400 text-xs space-y-1.5">
              <p className="font-bold text-white mb-1">New Password Requirements:</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-brand-400" /> Minimum 8 characters</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-brand-400" /> Uppercase letter</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-brand-400" /> Lowercase letter</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-brand-400" /> At least one number</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-brand-400" /> Special character</p>
              </div>
            </div>

            {/* Email/ID display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Employee Account
                </label>
                <input
                  type="text"
                  disabled
                  value={identifier}
                  className="w-full px-4 py-3 bg-slate-900/30 border border-slate-700/40 rounded-2xl text-slate-400 text-sm cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Temporary Key
                </label>
                <input
                  type="password"
                  disabled
                  value="••••••••"
                  className="w-full px-4 py-3 bg-slate-900/30 border border-slate-700/40 rounded-2xl text-slate-400 text-sm cursor-not-allowed outline-none"
                />
              </div>
            </div>

            <div className="border-t border-slate-700/40 pt-4 space-y-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  New Secure Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-[14px] text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-4 top-[14px] text-slate-500 hover:text-slate-300"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-[14px] text-slate-500" />
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-4 top-[14px] text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700/40 pt-4 space-y-4">
              {/* Security Question */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Choose Security Question
                </label>
                <div className="relative">
                  <HelpCircle size={18} className="absolute left-4 top-[14px] text-slate-500" />
                  <select
                    required
                    value={securityQuestion}
                    onChange={(e) => setSecurityQuestion(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-2xl text-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                  >
                    <option value="" className="bg-slate-800">Select a question</option>
                    {QUESTIONS.map((q) => (
                      <option key={q} value={q} className="bg-slate-800">
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Security Answer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                  Security Question Answer
                </label>
                <div className="relative">
                  <Key size={18} className="absolute left-4 top-[14px] text-slate-500" />
                  <input
                    type="text"
                    required
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    placeholder="Enter answer (case-insensitive)"
                    className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-700 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                'Complete Account Setup'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FirstLogin;
