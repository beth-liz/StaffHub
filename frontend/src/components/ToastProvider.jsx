import React from 'react';
import { Toaster } from 'react-hot-toast';

/**
 * ToastProvider — wraps the app to enable react-hot-toast.
 * Import and use `toast` from 'react-hot-toast' in any component.
 *
 * Usage:
 *   import toast from 'react-hot-toast';
 *   toast.success('Saved!');
 *   toast.error('Something went wrong');
 */
const ToastProvider = ({ children }) => (
  <>
    {children}
    <Toaster
      position="top-right"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#0f172a',
          color: '#f1f5f9',
          borderRadius: '12px',
          border: '1px solid #1e293b',
          fontSize: '13px',
          fontWeight: '500',
          padding: '12px 16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          maxWidth: '380px',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#fff' },
          style: {
            background: '#0f172a',
            borderLeft: '4px solid #10b981',
          },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: '#fff' },
          style: {
            background: '#0f172a',
            borderLeft: '4px solid #ef4444',
          },
          duration: 5000,
        },
        loading: {
          style: {
            background: '#0f172a',
            borderLeft: '4px solid #6366f1',
          },
        },
      }}
    />
  </>
);

export default ToastProvider;
