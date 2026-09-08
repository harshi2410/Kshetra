import React from 'react';

/**
 * Reusable Badge component for LandOS.
 */
export default function Badge({
  variant = 'primary',
  size = 'md',
  dot = false,
  icon,
  children,
  className = '',
  ...rest
}) {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 leading-none font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 leading-tight font-semibold'
  };

  const variantStyles = {
    primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20',
    success: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success)]/20',
    warning: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning)]/20',
    danger: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger)]/20',
    info: 'bg-[var(--color-info-bg)] text-[var(--color-info)] border border-[var(--color-info)]/20',
    outline: 'bg-transparent text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]'
  };

  const dotColorStyles = {
    primary: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
    info: 'bg-[var(--color-info)]',
    outline: 'bg-[var(--color-text-secondary)]'
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[var(--radius-full)] select-none shrink-0 ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...rest}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColorStyles[variant] || dotColorStyles.primary}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
