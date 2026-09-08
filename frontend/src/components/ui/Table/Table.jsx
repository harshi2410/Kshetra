import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import Loader from '../Loader';
import EmptyState from '../EmptyState';

/**
 * Reusable generic Table component.
 */
export default function Table({
  children,
  stickyHeader = false,
  loading = false,
  empty = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are no records to display at this time.',
  pagination,
  className = '',
  ...rest
}) {
  return (
    <div className="w-full flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className={`w-full overflow-x-auto ${stickyHeader ? 'max-h-[600px] overflow-y-auto' : ''}`}>
        <table className={`w-full text-left text-sm border-collapse ${className}`} {...rest}>
          {children}
        </table>

        {loading && (
          <div className="p-8 flex items-center justify-center bg-[var(--color-bg-app)]/80 backdrop-blur-xs">
            <Loader size="md" text="Loading table data..." />
          </div>
        )}

        {!loading && empty && (
          <div className="py-12 px-4">
            <EmptyState title={emptyTitle} description={emptyDescription} />
          </div>
        )}
      </div>

      {pagination && (
        <div className="p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
          {pagination}
        </div>
      )}
    </div>
  );
}

Table.Header = function TableHeader({ children, sticky = false, className = '', ...rest }) {
  return (
    <thead
      className={`bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider ${sticky ? 'sticky top-0 z-10 shadow-xs' : ''} ${className}`}
      {...rest}
    >
      {children}
    </thead>
  );
};

Table.Head = function TableHead({
  children,
  sortable = false,
  sortDirection = null, // 'asc' | 'desc' | null
  onSort,
  className = '',
  ...rest
}) {
  return (
    <th
      onClick={sortable ? onSort : undefined}
      className={`px-4 py-3.5 font-medium select-none ${sortable ? 'cursor-pointer hover:text-[var(--color-text-primary)] transition-colors' : ''} ${className}`}
      {...rest}
    >
      <div className="inline-flex items-center gap-1.5">
        <span>{children}</span>
        {sortable && (
          <span className="text-[var(--color-text-muted)]">
            {sortDirection === 'asc' && <ArrowUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
            {sortDirection === 'desc' && <ArrowDown className="w-3.5 h-3.5 text-[var(--color-primary)]" />}
            {!sortDirection && <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
          </span>
        )}
      </div>
    </th>
  );
};

Table.Body = function TableBody({ children, className = '', ...rest }) {
  return (
    <tbody className={`divide-y divide-[var(--color-border-subtle)] text-[var(--color-text-primary)] ${className}`} {...rest}>
      {children}
    </tbody>
  );
};

Table.Row = function TableRow({ children, hoverable = true, className = '', ...rest }) {
  return (
    <tr
      className={`transition-colors duration-150 ${hoverable ? 'hover:bg-[var(--color-bg-surface-hover)]' : ''} ${className}`}
      {...rest}
    >
      {children}
    </tr>
  );
};

Table.Cell = function TableCell({ children, className = '', ...rest }) {
  return (
    <td className={`px-4 py-3.5 align-middle text-sm text-[var(--color-text-primary)] ${className}`} {...rest}>
      {children}
    </td>
  );
};
