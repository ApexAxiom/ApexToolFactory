import type { ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export interface ToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
}

export function Toggle({ pressed = false, className, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={twMerge(
        'flex h-8 w-14 items-center rounded-full border border-slate-200 bg-white px-1 transition focus-visible:ring-2 focus-visible:ring-brand-accent',
        pressed ? 'bg-brand-accent/90 text-white' : 'text-slate-500',
        className,
      )}
      {...props}
    >
      <span
        className={twMerge(
          'block h-6 w-6 transform rounded-full bg-white shadow transition',
          pressed ? 'translate-x-6 bg-brand-accent' : 'translate-x-0',
        )}
      />
    </button>
  );
}
