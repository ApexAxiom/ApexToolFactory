import type { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  className?: string;
}

const toneClass: Record<Required<BadgeProps>['tone'], string> = {
  info: 'bg-sky-100 text-sky-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
};

export function Badge({ tone = 'info', className, children }: PropsWithChildren<BadgeProps>) {
  return (
    <span className={twMerge('inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', toneClass[tone], className)}>
      {children}
    </span>
  );
}
