import React from 'react';

/**
 * Reusable Loader Component supporting Spinner and Skeleton loaders.
 */
export default function Loader({
  size = 'md',
  text,
  className = '',
  ...rest
}) {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <div className={`inline-flex flex-col items-center justify-center gap-2 ${className}`} {...rest}>
      <svg
        className={`animate-landos-spin text-[var(--color-primary)] ${sizeStyles[size] || sizeStyles.md}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {text && (
        <span className="text-xs font-medium text-[var(--color-text-secondary)] animate-pulse">
          {text}
        </span>
      )}
    </div>
  );
}

Loader.SkeletonText = function SkeletonText({ lines = 3, width = 'w-full', className = '' }) {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3.5 rounded-[var(--radius-sm)] animate-landos-shimmer ${i === lines - 1 && lines > 1 ? 'w-2/3' : width}`}
        />
      ))}
    </div>
  );
};

Loader.SkeletonCard = function SkeletonCard({ className = '' }) {
  return (
    <div className={`p-6 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-app)] flex flex-col gap-4 shadow-xs ${className}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full animate-landos-shimmer shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <div className="h-4 w-1/3 rounded-[var(--radius-sm)] animate-landos-shimmer" />
          <div className="h-3 w-1/4 rounded-[var(--radius-sm)] animate-landos-shimmer" />
        </div>
      </div>
      <Loader.SkeletonText lines={3} />
      <div className="h-9 w-full rounded-[var(--radius-md)] animate-landos-shimmer mt-2" />
    </div>
  );
};

Loader.SkeletonTable = function SkeletonTable({ rows = 5, cols = 4, className = '' }) {
  return (
    <div className={`w-full border border-[var(--color-border-subtle)] rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-bg-app)] ${className}`}>
      <div className="p-4 bg-[var(--color-bg-surface)] border-b border-[var(--color-border-subtle)] flex gap-4">
        {Array.from({ length: cols }).map((_, c) => (
          <div key={c} className="h-4 flex-1 rounded-[var(--radius-sm)] animate-landos-shimmer" />
        ))}
      </div>
      <div className="divide-y divide-[var(--color-border-subtle)] p-4 flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-3.5 flex-1 rounded-[var(--radius-sm)] animate-landos-shimmer" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
