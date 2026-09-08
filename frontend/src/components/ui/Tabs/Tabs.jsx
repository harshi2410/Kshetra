import React from 'react';
import Badge from '../Badge';

/**
 * Modern Underline-style Tabs component.
 */
export default function Tabs({
  items = [], // Array of { key, label, icon, badge, disabled }
  activeKey,
  onChange,
  className = '',
  ...rest
}) {
  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      const nextIndex = (index + 1) % items.length;
      if (!items[nextIndex].disabled && onChange) {
        onChange(items[nextIndex].key);
      }
    } else if (e.key === 'ArrowLeft') {
      const prevIndex = (index - 1 + items.length) % items.length;
      if (!items[prevIndex].disabled && onChange) {
        onChange(items[prevIndex].key);
      }
    }
  };

  return (
    <div
      className={`border-b border-[var(--color-border-subtle)] flex items-center gap-1 sm:gap-6 overflow-x-auto scrollbar-none ${className}`}
      role="tablist"
      {...rest}
    >
      {items.map((tab, idx) => {
        const isActive = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange && onChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`
              relative flex items-center gap-2 py-3 px-2 text-sm font-medium transition-all duration-200 select-none whitespace-nowrap outline-none
              disabled:opacity-40 disabled:cursor-not-allowed
              ${isActive 
                ? 'text-[var(--color-primary)] font-semibold' 
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }
            `}
          >
            {tab.icon && (
              <span className={`w-4 h-4 inline-flex shrink-0 ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}>
                {tab.icon}
              </span>
            )}

            <span>{tab.label}</span>

            {tab.badge !== undefined && (
              <Badge
                variant={isActive ? 'primary' : 'outline'}
                size="sm"
              >
                {tab.badge}
              </Badge>
            )}

            {/* Active underline indicator */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--color-primary)] rounded-full transition-all duration-200"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
