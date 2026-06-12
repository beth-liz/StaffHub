import React from 'react';
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * SortableHeader — table <th> that renders a sort icon and toggles sort order.
 *
 * Props:
 *   label        {string}    Column label text
 *   field        {string}    The sort field name (e.g. 'name', 'department')
 *   currentSort  {string}    Active sort string (e.g. 'name' or '-name')
 *   onSort       {function}  Called with new sort string when clicked
 *   className    {string}    Extra classes for the <th>
 */
const SortableHeader = ({ label, field, currentSort, onSort, className = '' }) => {
  const isAsc = currentSort === field;
  const isDesc = currentSort === `-${field}`;
  const isActive = isAsc || isDesc;

  const handleClick = () => {
    if (isAsc) {
      onSort(`-${field}`);   // flip to descending
    } else {
      onSort(field);          // default to ascending
    }
  };

  return (
    <th
      className={`py-4 cursor-pointer select-none group ${className}`}
      onClick={handleClick}
      title={`Sort by ${label}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
          isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
        }`}
      >
        {label}
        <span className="flex-shrink-0">
          {isAsc ? (
            <ChevronUp size={13} className="text-brand-500" />
          ) : isDesc ? (
            <ChevronDown size={13} className="text-brand-500" />
          ) : (
            <ChevronsUpDown size={13} className="text-slate-300 group-hover:text-slate-400" />
          )}
        </span>
      </span>
    </th>
  );
};

export default SortableHeader;
