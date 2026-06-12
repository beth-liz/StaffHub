import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

/**
 * ConfirmModal — Reusable confirmation dialog.
 *
 * Props:
 *   isOpen        {boolean}   Controls visibility
 *   onClose       {function}  Called when user cancels or clicks backdrop
 *   onConfirm     {function}  Called when user clicks the confirm button
 *   loading       {boolean}   Shows spinner on confirm button when true
 *   title         {string}    Modal heading
 *   message       {ReactNode} Description / body text
 *   confirmLabel  {string}    Label for confirm button (default: 'Confirm')
 *   variant       {string}    'danger' | 'warning' (default: 'danger')
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-100 animate-fade-in space-y-4">
        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 ${
              isDanger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
            }`}
          >
            {isDanger ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <h3 className={`text-lg font-bold ${isDanger ? 'text-red-700' : 'text-amber-700'}`}>
            {title}
          </h3>
        </div>

        {/* Message */}
        <p className="text-sm text-slate-500 leading-relaxed pl-14 -mt-1">
          {message}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-white text-sm font-semibold shadow-md transition-colors disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Processing…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
