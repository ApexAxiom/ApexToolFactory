import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-[var(--brand-primary-from)] to-[var(--brand-primary-to)] text-white shadow-soft hover:opacity-90',
  secondary: 'bg-white text-slate-900 border border-slate-200 shadow-sm hover:bg-slate-100',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button ref={ref} className={twMerge(base, variants[variant], className)} style={{ minHeight: '44px' }} {...props} />
  ),
);

Button.displayName = 'Button';
