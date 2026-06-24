import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { loginUser, fetchSecurityQuestion, resetForgotPassword } from '../services/api';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Briefcase, 
  ArrowRight, 
  HelpCircle, 
  Key,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';

const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/dashboard';

  // State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Forgot password states
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Enter ID, 2: Answer Question & Set Pass
  const [forgotId, setForgotId] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Prepopulate saved identifier
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
    const savedId = localStorage.getItem('rememberedIdentifier');
    if (savedId) {
      setIdentifier(savedId);
      setRememberMe(true);
    }
  }, [user, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter both email/ID and password');
      return;
    }

    setLoading(true);
    setError(null);
    const toastId = toast.loading('Authenticating credentials…');

    try {
      const res = await loginUser({ identifier, password });
      
      // If it's a first-time login
      if (res.isTempPassword) {
        toast.dismiss(toastId);
        toast('First login detected. Please complete setup.', { icon: '🔑' });
        navigate('/first-login', { state: { identifier, tempPassword: password } });
        return;
      }

      // Normal login
      login(res.token, res.user);
      
      if (rememberMe) {
        localStorage.setItem('rememberedIdentifier', identifier);
      } else {
        localStorage.removeItem('rememberedIdentifier');
      }

      toast.success(`Welcome back, ${res.user.name}!`, { id: toastId });
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      const msg = err.displayMessage || 'Invalid email/employee ID or password';
      setError(msg);
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchQuestion = async (e) => {
    e.preventDefault();
    if (!forgotId.trim()) {
      toast.error('Please enter your email or Employee ID');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await fetchSecurityQuestion(forgotId);
      if (res.success) {
        setSecurityQuestion(res.securityQuestion);
        setForgotStep(2);
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Employee record not found');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!securityAnswer || !newPassword || !confirmPassword) {
      toast.error('All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await resetForgotPassword({
        identifier: forgotId,
        securityAnswer,
        newPassword,
      });

      if (res.success) {
        toast.success('Password reset successfully! You can now log in.');
        setForgotMode(false);
        setForgotStep(1);
        setForgotId('');
        setSecurityAnswer('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      toast.error(err.displayMessage || 'Password reset failed');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900 select-none">
      
      {/* ── Back to Home Button ── */}
      <div className="absolute top-6 left-6 z-50">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-brand-600 backdrop-blur-md text-white text-sm font-semibold rounded-full border border-slate-700/50 hover:border-brand-500 transition-all shadow-lg"
        >
          <ChevronLeft size={16} />
          Back to Home
        </button>
      </div>

      {/* ── Left Panel (Desktop) ── */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 scale-105"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-slate-900/75 z-10" />
        
        <div className="relative z-20 p-16 flex flex-col justify-center h-full max-w-2xl">
          <div className="inline-flex h-16 w-16 bg-brand-600 rounded-2xl items-center justify-center text-white shadow-2xl shadow-brand-600/30 mb-8 animate-fade-in">
            <Briefcase size={32} />
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-6 leading-tight animate-fade-in" style={{ animationDelay: '100ms' }}>
            StaffHub HRMS
          </h1>
          <p className="text-xl text-slate-300 mb-12 leading-relaxed animate-fade-in" style={{ animationDelay: '200ms' }}>
            AI-Powered Employee & Leave Management System. Manage employees, automate leave workflows, generate reports, and interact through intelligent voice commands.
          </p>
          
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '300ms' }}>
            {[
              'Employee Management',
              'Leave Management',
              'AI Voice Assistant',
              'Reports & Analytics'
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 text-slate-300">
                <div className="h-6 w-6 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck size={14} />
                </div>
                <span className="font-semibold text-lg">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel (Login Form) ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-slate-950">
        {/* Background Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md z-10 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="text-center lg:text-left mb-10">
            <div className="lg:hidden inline-flex h-12 w-12 bg-brand-600 rounded-2xl items-center justify-center text-white shadow-lg shadow-brand-600/30 mb-4">
              <Briefcase size={24} />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {forgotMode ? 'Recover Access' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {forgotMode ? 'Recover your portal credentials' : 'Sign in to access your employee portal'}
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 shadow-2xl shadow-black/50 space-y-6">
            
            {error && !forgotMode && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-2xl text-xs font-semibold">
                {error}
              </div>
            )}

            {!forgotMode ? (
              /* ── Login Form ── */
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                    Employee ID / Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-[14px] text-slate-500" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="EMP-1001 or name@company.com"
                      className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setError(null);
                      }}
                      className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-[14px] text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-[14px] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1 py-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-900/50 text-brand-600 focus:ring-brand-500/20 focus:ring-offset-slate-900"
                    />
                    <span className="text-xs text-slate-400 font-semibold">Remember Me</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-brand-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  ) : (
                    <>
                      Sign In <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* ── Forgot Password Form ── */
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setForgotMode(false);
                    setForgotStep(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors font-semibold"
                >
                  <ChevronLeft size={14} /> Back to Sign In
                </button>

                {forgotStep === 1 ? (
                  <form onSubmit={handleFetchQuestion} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                        Enter Employee ID or Email
                      </label>
                      <div className="relative">
                        <HelpCircle size={18} className="absolute left-4 top-[14px] text-slate-500" />
                        <input
                          type="text"
                          required
                          value={forgotId}
                          onChange={(e) => setForgotId(e.target.value)}
                          placeholder="EMP-1001 or email@company.com"
                          className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        'Fetch Security Question'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/60">
                      <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Security Question:</p>
                      <p className="text-sm font-semibold text-white mt-1">{securityQuestion}</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                        Your Answer (Case Insensitive)
                      </label>
                      <div className="relative">
                        <ShieldCheck size={18} className="absolute left-4 top-[14px] text-slate-500" />
                        <input
                          type="text"
                          required
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          placeholder="Type answer here"
                          className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Key size={18} className="absolute left-4 top-[14px] text-slate-500" />
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 8 chars, 1 Cap, 1 Num, 1 Spec"
                          className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider pl-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Key size={18} className="absolute left-4 top-[14px] text-slate-500" />
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                          className="w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {forgotLoading ? (
                        <span className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        'Reset Password'
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
