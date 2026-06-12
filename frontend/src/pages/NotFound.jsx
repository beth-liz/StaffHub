import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-6">
    {/* Large 404 visual */}
    <div className="relative select-none">
      <span className="text-[9rem] md:text-[12rem] font-extrabold text-slate-100 leading-none tracking-tight">
        404
      </span>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-20 w-20 bg-brand-50 text-brand-500 rounded-full flex items-center justify-center shadow-inner">
          <Search size={36} />
        </div>
      </div>
    </div>

    <div className="space-y-2 max-w-md">
      <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">
        Page Not Found
      </h1>
      <p className="text-sm text-slate-500 leading-relaxed">
        The page you are looking for does not exist or has been moved.
        Head back to the dashboard or employee directory.
      </p>
    </div>

    <div className="flex items-center gap-3">
      <button
        onClick={() => window.history.back()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
      >
        <ArrowLeft size={15} />
        Go Back
      </button>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-600/25 transition-all hover:-translate-y-0.5 active:translate-y-0"
      >
        <Home size={15} />
        Dashboard
      </Link>
    </div>
  </div>
);

export default NotFound;
