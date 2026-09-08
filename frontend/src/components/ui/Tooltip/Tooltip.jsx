import React, { useState } from 'react';

/**
 * Small Reusable Tooltip component.
 */
export default function Tooltip({
  content,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  children,
  className = '',
  delay = 150
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState(null);

  const showTooltip = () => {
    const t = setTimeout(() => setIsVisible(true), delay);
    setTimer(t);
  };

  const hideTooltip = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-[var(--color-text-primary)] border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-[var(--color-text-primary)] border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-[var(--color-text-primary)] border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-[var(--color-text-primary)] border-y-transparent border-l-transparent'
  };

  if (!content) return children;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`
            absolute z-[var(--z-toast)] px-2.5 py-1 text-[11px] font-medium leading-tight whitespace-nowrap
            bg-[var(--color-text-primary)] text-[var(--color-bg-app)] 
            rounded-[var(--radius-sm)] shadow-[var(--shadow-card)] 
            pointer-events-none animate-landos-fade
            ${positionStyles[position] || positionStyles.top}
            ${className}
          `}
        >
          {content}
          <span
            className={`absolute w-0 h-0 border-4 ${arrowStyles[position] || arrowStyles.top}`}
          />
        </div>
      )}
    </div>
  );
}
