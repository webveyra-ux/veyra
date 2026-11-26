import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'soft' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-[#7655D9] text-white hover:bg-[#5B3EB5] active:bg-[#5B3EB5] shadow-xs disabled:bg-[#7655D9]/50',
  secondary:
    'bg-[#242331] text-white hover:bg-[#363448] disabled:bg-[#242331]/50',
  soft:
    'bg-[#F5F0FF] text-[#5B3EB5] hover:bg-[#EDE5FF] border border-[#EDE5FF] disabled:opacity-60',
  outline:
    'bg-white text-[#242331] border border-[#E9E5EF] hover:border-[#7655D9]/50 hover:bg-[#F5F0FF]/50 disabled:opacity-60',
  ghost:
    'bg-transparent text-[#242331] hover:bg-[#F5F0FF] disabled:opacity-50',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-400',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-9 px-3.5 text-xs rounded-xl gap-1.5',
  md: 'min-h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'min-h-12 px-6 text-base rounded-2xl gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      type = 'button',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed select-none',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
