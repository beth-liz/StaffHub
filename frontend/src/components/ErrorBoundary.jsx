import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — catches unhandled React render errors so the entire
 * app doesn't white-screen.  Displays a friendly recovery UI.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console in development; hook into error tracking in production
    if (import.meta.env.DEV) {
      console.group('[ErrorBoundary] Uncaught render error');
      console.error(error);
      console.info('Component stack:', info.componentStack);
      console.groupEnd();
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="glass-card p-10 max-w-lg w-full text-center space-y-6">
          {/* Icon */}
          <div className="h-20 w-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <AlertTriangle size={40} />
          </div>

          {/* Copy */}
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-800">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              An unexpected error occurred in the application. This has been logged.
              You can try to reload this section or return to the dashboard.
            </p>
          </div>

          {/* Error detail (dev only) */}
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-slate-900 text-red-400 rounded-xl p-4 overflow-auto max-h-36 border border-slate-800">
              {this.state.error.toString()}
            </pre>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={15} />
              Try Again
            </button>
            <Link
              to="/"
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-600/20 transition-colors"
            >
              <Home size={15} />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
