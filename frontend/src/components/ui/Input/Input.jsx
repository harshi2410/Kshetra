import React, { useState, useId } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';

/**
 * Reusable Input component supporting text, password, search, textarea, icons, and error states.
 */
export default function Input({
  label,
  placeholder,
  helperText,
  error,
  disabled = false,
  type = 'text',
  isTextarea = false,
  rows = 3,
  prefixIcon,
  suffixIcon,
  value,
  onChange,
  id: customId,
  name,
  required = false,
  className = '',
  containerClassName = '',
  ...rest
}) {
  const generatedId = useId();
  const inputId = customId || generatedId;
  const helperId = `${inputId}-helper`;
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === 'password';
  const isSearchType = type === 'search';
  const actualInputType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;

  // Icon defaults for search
  const effectivePrefixIcon = prefixIcon || (isSearchType ? <Search className="w-4 h-4 text-[var(--color-text-muted)]" /> : null);

  const baseInputClasses = `
    w-full text-sm font-sans transition-all duration-200
    bg-[var(--color-bg-app)] text-[var(--color-text-primary)]
    placeholder-[var(--color-text-muted)]
    border rounded-[var(--radius-md)]
    disabled:bg-[var(--color-bg-surface)] disabled:cursor-not-allowed disabled:opacity-60
    focus:outline-none focus:ring-2 focus:ring-offset-0
    ${hasError 
      ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20' 
      : 'border-[var(--color-border-subtle)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 hover:border-[var(--color-text-muted)]'
    }
    ${effectivePrefixIcon ? 'pl-10' : 'pl-3.5'}
    ${(suffixIcon || isPasswordType) ? 'pr-10' : 'pr-3.5'}
    ${isTextarea ? 'py-2.5 resize-y' : 'py-2'}
    ${className}
  `;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[var(--color-text-primary)] flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[var(--color-danger)] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        {effectivePrefixIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
            {effectivePrefixIcon}
          </div>
        )}

        {isTextarea ? (
          <textarea
            id={inputId}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            rows={rows}
            aria-invalid={hasError}
            aria-describedby={helperText || errorMessage ? helperId : undefined}
            className={baseInputClasses}
            {...rest}
          />
        ) : (
          <input
            id={inputId}
            name={name}
            type={actualInputType}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            aria-invalid={hasError}
            aria-describedby={helperText || errorMessage ? helperId : undefined}
            className={baseInputClasses}
            {...rest}
          />
        )}

        {isPasswordType && !disabled && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            tabIndex={-1}
            className="absolute right-3.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] focus:outline-none transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {!isPasswordType && suffixIcon && (
          <div className="absolute right-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
            {suffixIcon}
          </div>
        )}
      </div>

      {(errorMessage || helperText) && (
        <p
          id={helperId}
          className={`text-xs ${hasError ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}
        >
          {errorMessage || helperText}
        </p>
      )}
    </div>
  );
}
