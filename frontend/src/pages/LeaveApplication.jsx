import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { applyLeaveRequest, getLeaveBalance } from '../services/api';
import { 
  ArrowLeft, 
  Calendar, 
  BookmarkCheck 
} from 'lucide-react';
import VoiceInputField from '../components/VoiceInputField';

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Work From Home',
  'Emergency Leave',
  'Loss Of Pay',
];

const LeaveApplication = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // States
  const [balances, setBalances] = useState({});
  const [leaveType, setLeaveType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalDays, setTotalDays] = useState(0);
  const [reason, setReason] = useState('');
  const [declaration, setDeclaration] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Voice states
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState('');
  const [speechConfidence, setSpeechConfidence] = useState(null);

  useEffect(() => {
    fetchBalances();
  }, []);

  // Calculate total days when dates change
  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end >= start) {
        const diffTime = Math.abs(end - start);
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setTotalDays(days);
      } else {
        setTotalDays(0);
      }
    } else {
      setTotalDays(0);
    }
  }, [startDate, endDate]);

  const fetchBalances = async () => {
    try {
      const res = await getLeaveBalance();
      if (res.success) {
        setBalances(res.data);
      }
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!leaveType || !startDate || !endDate || !reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (end < start) {
      toast.error('End date cannot be before start date.');
      return;
    }

    if (start < today) {
      toast.error('Start date cannot be in the past.');
      return;
    }

    // Check balances for Casual/Sick/Earned
    let balanceField = null;
    if (leaveType === 'Casual Leave') balanceField = 'casualLeave';
    if (leaveType === 'Sick Leave') balanceField = 'sickLeave';
    if (leaveType === 'Earned Leave') balanceField = 'earnedLeave';

    if (balanceField && balances[balanceField] < totalDays) {
      toast.error(
        `Insufficient balance. Available: ${balances[balanceField]} days, Requested: ${totalDays} days`
      );
      return;
    }

    if (!declaration) {
      toast.error('Please confirm the accuracy declaration');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Submitting leave application…');

    try {
      const payload = {
        leaveType,
        startDate,
        endDate,
        reason,
        voiceTranscript,
        speechLanguage,
        speechConfidence,
      };

      const res = await applyLeaveRequest(payload);
      if (res.success) {
        toast.success('Leave applied successfully! HR has been notified.', { id: toastId });
        navigate('/leaves');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.displayMessage || 'Failed to submit application', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>

      {/* Leave Allowances Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center dark:bg-slate-900/50 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Casual Leave</p>
          <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{balances.casualLeave ?? '--'}d</p>
        </div>
        <div className="glass-card p-4 text-center dark:bg-slate-900/50 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Sick Leave</p>
          <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{balances.sickLeave ?? '--'}d</p>
        </div>
        <div className="glass-card p-4 text-center dark:bg-slate-900/50 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 font-bold uppercase">Earned Leave</p>
          <p className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{balances.earnedLeave ?? '--'}d</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden dark:bg-slate-900/50 dark:border-slate-800">
        <div className="bg-gradient-to-r from-brand-600 to-indigo-700 px-6 py-6 text-white flex items-center gap-4">
          <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Leave Application Form</h2>
            <p className="text-xs text-brand-100 mt-0.5">Apply for time-off and request workflow approvals.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          
          {/* Section: Employee Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Employee Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Employee ID</label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.employeeId || ''} 
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-850 rounded-xl text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.name || ''} 
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-850 rounded-xl text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none" 
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Department</label>
                <input 
                  type="text" 
                  disabled 
                  value={user?.department || ''} 
                  className="w-full mt-1 px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200/50 dark:border-slate-850 rounded-xl text-xs text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none" 
                />
              </div>
            </div>
          </div>

          {/* Section: Leave Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Leave Details
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="form-label text-xs">Leave Type</label>
                <select 
                  required
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                >
                  <option value="">Select Type</option>
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">Start Date</label>
                <input 
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="form-label text-xs">End Date</label>
                <input 
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-input text-xs dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                />
              </div>
            </div>

            {totalDays > 0 && (
              <div className="flex items-center gap-2.5 bg-brand-50/30 dark:bg-brand-500/5 text-xs text-brand-700 dark:text-brand-400 font-bold p-3.5 rounded-xl border border-brand-100/35 dark:border-brand-500/10">
                <BookmarkCheck size={16} />
                Calculated leave duration: {totalDays} {totalDays === 1 ? 'day' : 'days'}.
              </div>
            )}
          </div>

          {/* Section: Reason */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Reason
            </h3>

            <div className="space-y-1">
              <VoiceInputField
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                onVoiceDataChange={({ voiceTranscript, speechLanguage, speechConfidence }) => {
                  setVoiceTranscript(voiceTranscript);
                  setSpeechLanguage(speechLanguage);
                  setSpeechConfidence(speechConfidence);
                }}
                placeholder="Describe why you need this time-off..."
                label="Reason for Leave"
                required={true}
                rows={3}
              />
            </div>
          </div>

          {/* Section: Declarations */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Declarations
            </h3>

            {/* Declaration Checkbox */}
            <div className="flex items-start gap-2.5 pt-3">
              <input 
                type="checkbox" 
                id="declaration-cb"
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
                className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20"
              />
              <label htmlFor="declaration-cb" className="text-xs text-slate-500 dark:text-slate-400 select-none cursor-pointer">
                I confirm that all information provided in this application is accurate and complete.
              </label>
            </div>
          </div>

          {/* Form Submit */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-6">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 font-semibold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4.5 w-4.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Submitting Application…
                </>
              ) : (
                <>
                  <BookmarkCheck size={14} />
                  Submit Application
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default LeaveApplication;
