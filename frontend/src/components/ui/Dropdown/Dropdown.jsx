import React, { useState, useRef, useEffect, createContext, useContext } from 'react';

const DropdownContext = createContext(null);

/**
 * Reusable Dropdown menu component with outside click and ESC support.
 */
export default function Dropdown({ children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const toggle = () => setIsOpen((prev) => !prev);
  const close = () => setIsOpen(false);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <DropdownContext.Provider value={{ isOpen, toggle, close }}>
      <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

Dropdown.Trigger = function DropdownTrigger({ children, className = '', ...rest }) {
  const { toggle, isOpen } = useContext(DropdownContext);
  return (
    <div
      onClick={toggle}
      aria-expanded={isOpen}
      aria-haspopup="true"
      className={`inline-flex items-center cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

Dropdown.Menu = function DropdownMenu({
  children,
  align = 'right', // 'right' | 'left'
  className = '',
  ...rest
}) {
  const { isOpen } = useContext(DropdownContext);
  if (!isOpen) return null;

  const alignStyles = align === 'left' ? 'left-0' : 'right-0';

  return (
    <div
      className={`
        absolute ${alignStyles} mt-2 w-56 py-1 z-[var(--z-dropdown)] 
        bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)] 
        rounded-[var(--radius-md)] shadow-[var(--shadow-elevated)] 
        animate-landos-fade overflow-hidden ${className}
      `}
      role="menu"
      {...rest}
    >
      {children}
    </div>
  );
};

Dropdown.Header = function DropdownHeader({ children, className = '', ...rest }) {
  return (
    <div
      className={`px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

Dropdown.Item = function DropdownItem({
  children,
  icon,
  danger = false,
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  const { close } = useContext(DropdownContext);

  const handleClick = (e) => {
    if (disabled) return;
    if (onClick) onClick(e);
    close();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      role="menuitem"
      className={`
        w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left transition-colors select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${danger 
          ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]' 
          : 'text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)]'
        }
        ${className}
      `}
      {...rest}
    >
      {icon && <span className="w-4 h-4 inline-flex shrink-0 items-center justify-center">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
};

Dropdown.Divider = function DropdownDivider({ className = '' }) {
  return <div className={`my-1 border-t border-[var(--color-border-subtle)] ${className}`} />;
};
