import React from 'react';

/**
 * Reusable Button component for LandOS Design System
 * 
 * @param {Object} props
 * @param {'primary' | 'secondary' | 'ghost' | 'danger' | 'success'} [props.variant='primary']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {React.ReactNode} [props.leftIcon]
 * @param {React.ReactNode} [props.rightIcon]
 * @param {boolean} [props.fullWidth=false]
 * @param {'button' | 'submit' | 'reset'} [props.type='button']
 * @param {Function} [props.onClick]
 * @param {string} [props.className='']
 * @param {React.ReactNode} props.children
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  children,
  ...rest
}) {
  const isInteractiveDisabled = disabled || loading;

  // Base layout & typography
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-60';

  // Size variations
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
    md: 'text-sm px-4 py-2 gap-2 min-h-[40px]',
    lg: 'text-base px-6 py-2.5 gap-2.5 min-h-[48px]'
  };

  // Theme-aware Burgundy Design System variants
  const variantStyles = {
    primary: 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] active:bg-[var(--color-primary-dark)] text-white shadow-[var(--shadow-card)]',
    secondary: 'bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-surface-hover)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)]',
    ghost: 'bg-transparent hover:bg-[var(--color-bg-surface-hover)] text-[var(--color-text-primary)] hover:text-[var(--color-primary)]',
    danger: 'bg-[var(--color-danger)] hover:opacity-90 active:opacity-100 text-white shadow-[var(--shadow-card)]',
    success: 'bg-[var(--color-success)] hover:opacity-90 active:opacity-100 text-white shadow-[var(--shadow-card)]'
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={isInteractiveDisabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${widthStyle} ${className}`}
      {...rest}
    >
      {loading && (
        <svg
          className="animate-landos-spin w-4 h-4 text-current"
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
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!loading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      <span className="truncate">{children}</span>
      {!loading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
}
