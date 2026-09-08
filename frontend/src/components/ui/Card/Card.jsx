import React from 'react';

/**
 * Reusable Card Component with compound sub-components.
 */
export default function Card({
  children,
  hoverable = false,
  className = '',
  onClick,
  ...rest
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-[var(--color-bg-app)] 
        border border-[var(--color-border-subtle)] 
        rounded-[var(--radius-lg)] 
        shadow-[var(--shadow-card)] 
        overflow-hidden 
        transition-all duration-200
        ${hoverable ? 'hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 cursor-pointer' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </div>
  );
}

Card.Header = function CardHeader({ children, className = '', ...rest }) {
  return (
    <div
      className={`px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.Title = function CardTitle({ children, className = '', ...rest }) {
  return (
    <h3
      className={`text-base font-semibold text-[var(--color-text-primary)] leading-tight ${className}`}
      {...rest}
    >
      {children}
    </h3>
  );
};

Card.Description = function CardDescription({ children, className = '', ...rest }) {
  return (
    <p
      className={`text-xs text-[var(--color-text-secondary)] mt-0.5 ${className}`}
      {...rest}
    >
      {children}
    </p>
  );
};

Card.Actions = function CardActions({ children, className = '', ...rest }) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`} {...rest}>
      {children}
    </div>
  );
};

Card.Content = function CardContent({ children, className = '', ...rest }) {
  return (
    <div className={`p-6 text-sm text-[var(--color-text-primary)] ${className}`} {...rest}>
      {children}
    </div>
  );
};

Card.Footer = function CardFooter({ children, className = '', ...rest }) {
  return (
    <div
      className={`px-6 py-3 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-4 text-xs text-[var(--color-text-secondary)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
