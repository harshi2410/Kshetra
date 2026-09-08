import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Centered Modal Dialog component.
 */
export default function Modal({
  isOpen = false,
  onClose,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  closeOnOverlayClick = true,
  className = '',
  ...rest
}) {
  // Handle ESC key press
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
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[95vw]'
  };

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 overflow-y-auto animate-landos-fade"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closeOnOverlayClick ? onClose : undefined}
      />

      {/* Modal Card Container */}
      <div
        className={`
          relative w-full ${sizeStyles[size] || sizeStyles.md} 
          bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)] 
          rounded-[var(--radius-lg)] shadow-[var(--shadow-modal)] 
          z-10 animate-landos-modal flex flex-col overflow-hidden
          ${className}
        `}
        {...rest}
      >
        {children}
      </div>
    </div>
  );
}

Modal.Header = function ModalHeader({ children, onClose, className = '', ...rest }) {
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
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

Modal.Title = function ModalTitle({ children, className = '', ...rest }) {
  return (
    <h2 className={`text-lg font-semibold text-[var(--color-text-primary)] ${className}`} {...rest}>
      {children}
    </h2>
  );
};

Modal.Content = function ModalContent({ children, className = '', ...rest }) {
  return (
    <div className={`p-6 text-sm text-[var(--color-text-primary)] overflow-y-auto max-h-[70vh] ${className}`} {...rest}>
      {children}
    </div>
  );
};

Modal.Footer = function ModalFooter({ children, className = '', ...rest }) {
  return (
    <div
      className={`px-6 py-4 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-subtle)] flex items-center justify-end gap-3 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
