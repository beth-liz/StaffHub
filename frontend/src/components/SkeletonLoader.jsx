import React from 'react';

/**
 * SkeletonLoader — reusable animated skeleton rows for table loading state.
 *
 * Props:
 *   rows     {number}  Number of skeleton rows to render (default: 5)
 *   columns  {number}  Number of skeleton cells per row (default: 5)
 */
export const TableSkeleton = ({ rows = 5, columns = 5 }) => (
  <div className="glass-card overflow-hidden animate-pulse">
    {/* Fake header */}
    <div className="flex gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="h-3 bg-slate-200 rounded flex-1" />
      ))}
    </div>
    {/* Fake rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-4 px-6 py-4 border-b border-slate-50 last:border-0"
      >
        {/* Avatar */}
        <div className="h-10 w-10 bg-slate-200 rounded-xl flex-shrink-0" />
        {Array.from({ length: columns - 1 }).map((_, j) => (
          <div
            key={j}
            className="h-3 bg-slate-200 rounded flex-1"
            style={{ opacity: 1 - j * 0.15 }}
          />
        ))}
      </div>
    ))}
  </div>
);

/**
 * StatCardSkeleton — skeleton for dashboard stat cards
 */
export const StatCardSkeleton = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="glass-card p-6 animate-pulse flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-3 w-24 bg-slate-200 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
          <div className="h-3 w-20 bg-slate-200 rounded" />
        </div>
        <div className="h-12 w-12 bg-slate-200 rounded-2xl" />
      </div>
    ))}
  </div>
);

/**
 * FormSkeleton — skeleton for form pages (add/edit)
 */
export const FormSkeleton = ({ fields = 6 }) => (
  <div className="glass-card p-8 max-w-3xl mx-auto animate-pulse space-y-6">
    <div className="h-6 w-48 bg-slate-200 rounded" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: fields }).map((n, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 bg-slate-200 rounded" />
          <div className="h-10 bg-slate-200 rounded-xl" />
        </div>
      ))}
    </div>
  </div>
);

export default TableSkeleton;
