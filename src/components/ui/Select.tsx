import { forwardRef, type SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="space-y-1">
      <select
        ref={ref}
        className={twMerge(
          'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-1',
          error ? 'border-red-500 focus:border-red-500 focus:ring-red-400' : '',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  ),
);

Select.displayName = 'Select';
