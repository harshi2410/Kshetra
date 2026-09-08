import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Slide-over Drawer Component (Right or Left).
 */
export default function Drawer({
  isOpen = false,
  onClose,
  placement = 'right', // 'right' | 'left'
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  children,
  closeOnOverlayClick = true,
  className = '',
  ...rest
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-xs',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
  };

  const placementStyles = placement === 'left' ? 'left-0 animate-landos-drawer-left' : 'right-0 animate-landos-drawer-right';

  return (
    <div
      className="fixed inset-0 z-[var(--z-sidebar)] overflow-hidden animate-landos-fade"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Drawer Container Panel */}
      <div
        className={`
          fixed top-0 bottom-0 w-full ${sizeStyles[size] || sizeStyles.md} 
          bg-[var(--color-bg-app)] border-x border-[var(--color-border-subtle)] 
          shadow-[var(--shadow-modal)] flex flex-col z-10 ${placementStyles}
          ${className}
        `}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}

Drawer.Header = function DrawerHeader({ children, onClose, className = '', ...rest }) {
  return (
    <div
      className={`px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-4 ${className}`}
      {...rest}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] focus:outline-none transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

Drawer.Title = function DrawerTitle({ children, className = '', ...rest }) {
  return (
    <h2 className={`text-lg font-semibold text-[var(--color-text-primary)] ${className}`} {...rest}>
      {children}
    </h2>
  );
};

Drawer.Content = function DrawerContent({ children, className = '', ...rest }) {
  return (
    <div className={`p-6 flex-1 overflow-y-auto text-sm text-[var(--color-text-primary)] ${className}`} {...rest}>
      {children}
    </div>
  );
};

Drawer.Footer = function DrawerFooter({ children, className = '', ...rest }) {
  return (
    <div
      className={`px-6 py-4 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-3 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
