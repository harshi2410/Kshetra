import React, { useState } from 'react';

/**
 * Reusable Avatar component for users, brokers, customers.
 */
export default function Avatar({
  src,
  alt = '',
  name = '',
  initials,
  size = 'md',
  status,
  className = '',
  ...rest
}) {
  const [imageError, setImageError] = useState(false);

  // Helper to extract initials from name
  const getInitials = () => {
    if (initials) return initials.toUpperCase().slice(0, 2);
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeStyles = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg'
  };

  const statusSizeStyles = {
    xs: 'w-1.5 h-1.5 ring-1',
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-4 h-4 ring-2'
  };

  const statusColorStyles = {
    online: 'bg-[var(--color-success)]',
    offline: 'bg-[var(--color-text-muted)]',
    away: 'bg-[var(--color-warning)]',
    busy: 'bg-[var(--color-danger)]'
  };

  const displayInitials = getInitials();
  const showImage = src && !imageError;

  return (
    <div className={`relative inline-flex shrink-0 ${className}`} {...rest}>
      <div
        className={`
          ${sizeStyles[size] || sizeStyles.md} 
          rounded-full overflow-hidden flex items-center justify-center font-semibold select-none
          bg-[var(--color-primary)]/10 text-[var(--color-primary)] 
          border border-[var(--color-primary)]/20 shadow-xs
        `}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{displayInitials}</span>
        )}
      </div>

      {status && statusColorStyles[status] && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full ring-[var(--color-bg-app)] 
            ${statusSizeStyles[size] || statusSizeStyles.md} 
            ${statusColorStyles[status]}
          `}
          title={`Status: ${status}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}
