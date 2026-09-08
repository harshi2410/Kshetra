import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

/**
 * Reusable Toast Component with auto-dismiss and theme support.
 */
export default function Toast({
  id,
  variant = 'info', // 'success' | 'error' | 'warning' | 'info'
  title,
  message,
  duration = 4000,
  onClose,
  className = '',
  ...rest
}) {
  useEffect(() => {
    if (duration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  const variantIcons = {
    success: <CheckCircle2 className="w-5 h-5 text-[var(--color-success)] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[var(--color-danger)] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0" />,
    info: <Info className="w-5 h-5 text-[var(--color-info)] shrink-0" />
  };

  const borderVariantStyles = {
    success: 'border-l-4 border-l-[var(--color-success)]',
    error: 'border-l-4 border-l-[var(--color-danger)]',
    warning: 'border-l-4 border-l-[var(--color-warning)]',
    info: 'border-l-4 border-l-[var(--color-info)]'
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 w-full max-w-sm
        bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)]
        rounded-[var(--radius-md)] shadow-[var(--shadow-elevated)]
        animate-landos-fade transition-all duration-200 select-none
        ${borderVariantStyles[variant] || borderVariantStyles.info}
        ${className}
      `}
      role="alert"
      {...rest}
    >
      {variantIcons[variant] || variantIcons.info}

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] leading-tight">
            {title}
          </h4>
        )}
        {message && (
          <p className="text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed">
            {message}
          </p>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={() => onClose(id)}
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] focus:outline-none transition-colors"
          aria-label="Dismiss toast notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

Toast.Container = function ToastContainer({ children, position = 'bottom-right' }) {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2'
  };

  return (
    <div
      className={`fixed z-[var(--z-toast)] flex flex-col gap-2 pointer-events-auto ${positionStyles[position] || positionStyles['bottom-right']}`}
    >
      {children}
    </div>
  );
};
