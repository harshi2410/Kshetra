import React from 'react';
import { Search, X } from 'lucide-react';

/**
 * SearchInput Component for quick filtering & search in LandOS.
 */
export default function SearchInput({
  value = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  shortcut = '⌘K',
  disabled = false,
  className = '',
  ...rest
}) {
  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    } else if (onChange) {
      // Simulate synthetic clear event if onChange provided
      onChange({ target: { value: '' } });
    }
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <div className="absolute left-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
        <Search className="w-4 h-4" />
      </div>

      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full text-sm font-sans py-2 pl-10 pr-16 bg-[var(--color-bg-app)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] transition-all duration-200 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 hover:border-[var(--color-text-muted)] disabled:opacity-60 disabled:cursor-not-allowed"
        {...rest}
      />

      <div className="absolute right-3 flex items-center gap-1.5">
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface-hover)] focus:outline-none transition-colors"
            aria-label="Clear search input"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {shortcut && !value && (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-[var(--color-text-muted)] bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded shadow-xs select-none">
            {shortcut}
          </kbd>
        )}
      </div>
    </div>
  );
}
