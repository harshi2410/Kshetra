import React, { useId } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Reusable Select component for LandOS.
 */
export default function Select({
  label,
  options = [], // Array of { value, label, disabled } or strings
  value,
  onChange,
  placeholder = 'Select an option...',
  helperText,
  error,
  disabled = false,
  required = false,
  id: customId,
  name,
  className = '',
  containerClassName = '',
  ...rest
}) {
  const generatedId = useId();
  const selectId = customId || generatedId;
  const helperId = `${selectId}-helper`;

  const hasError = Boolean(error);
  const errorMessage = typeof error === 'string' ? error : null;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-medium text-[var(--color-text-primary)] flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[var(--color-danger)] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center w-full">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={helperText || errorMessage ? helperId : undefined}
          className={`
            w-full text-sm font-sans py-2 pl-3.5 pr-10 appearance-none transition-all duration-200 cursor-pointer
            bg-[var(--color-bg-app)] text-[var(--color-text-primary)]
            border rounded-[var(--radius-md)]
            disabled:bg-[var(--color-bg-surface)] disabled:cursor-not-allowed disabled:opacity-60
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${hasError 
              ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]/20' 
              : 'border-[var(--color-border-subtle)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20 hover:border-[var(--color-text-muted)]'
            }
            ${className}
          `}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}

          {options.map((opt, idx) => {
            const isObj = typeof opt === 'object' && opt !== null;
            const val = isObj ? opt.value : opt;
            const lbl = isObj ? opt.label : opt;
            const optDisabled = isObj ? Boolean(opt.disabled) : false;

            return (
              <option key={idx} value={val} disabled={optDisabled}>
                {lbl}
              </option>
            );
          })}
        </select>

        <div className="absolute right-3.5 flex items-center pointer-events-none text-[var(--color-text-muted)]">
          <ChevronDown className="w-4 h-4" />
        </div>
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
