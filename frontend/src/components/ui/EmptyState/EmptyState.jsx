import React from 'react';
import { Inbox } from 'lucide-react';

/**
 * Reusable Empty State component.
 */
export default function EmptyState({
  icon,
  title = 'No records found',
  description = 'There is currently no information to show here.',
  action,
  className = '',
  ...rest
}) {
  const IconComponent = icon || <Inbox className="w-8 h-8 text-[var(--color-text-muted)]" />;

  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-subtle)] bg-[var(--color-bg-app)]/50 ${className}`}
      {...rest}
    >
      <div className="w-14 h-14 rounded-full bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center justify-center mb-4 shadow-xs">
        {IconComponent}
      </div>

      <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">
        {title}
      </h3>

      <p className="text-xs text-[var(--color-text-secondary)] max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
