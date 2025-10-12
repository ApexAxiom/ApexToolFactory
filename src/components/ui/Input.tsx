import { forwardRef, type InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <div className="space-y-1">
      <input
        ref={ref}
        className={twMerge(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-1',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-400' : '',
          className,
        )}
        {...props}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  ),
);

Input.displayName = 'Input';
