import * as React from 'react';
import { cn } from '@/lib/utils';

interface FieldWrapperProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FieldWrapper({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-[#242331]"
        >
          {label}
          {required && <span className="ml-0.5 text-[#7655D9]">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-[#6B6879]">{hint}</p>}
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, required, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            'w-full min-h-11 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#242331] placeholder:text-[#6B6879]/70 transition-colors',
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-[#E9E5EF] focus:border-[#7655D9]',
            'disabled:bg-[#F6F4FA] disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, required, rows = 4, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          required={required}
          className={cn(
            'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#242331] placeholder:text-[#6B6879]/70 transition-colors',
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-[#E9E5EF] focus:border-[#7655D9]',
            'disabled:bg-[#F6F4FA] disabled:cursor-not-allowed',
            className
          )}
          {...props}
        />
      </FieldWrapper>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, required, children, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    return (
      <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} required={required}>
        <select
          ref={ref}
          id={inputId}
          required={required}
          className={cn(
            'w-full min-h-11 rounded-xl border bg-white px-3.5 py-2.5 text-sm text-[#242331] transition-colors',
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-[#E9E5EF] focus:border-[#7655D9]',
            'disabled:bg-[#F6F4FA] disabled:cursor-not-allowed',
            className
          )}
          {...props}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  }
);
Select.displayName = 'Select';
