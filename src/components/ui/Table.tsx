import type { PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

export function Table({ children }: PropsWithChildren) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">{children}</table>
    </div>
  );
}

export function THead({ children }: PropsWithChildren) {
  return <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">{children}</thead>;
}

export function TBody({ children }: PropsWithChildren) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export function TR({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <tr className={twMerge('hover:bg-slate-50 transition', className)}>{children}</tr>;
}

export function TH({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <th className={twMerge('px-4 py-3 text-left font-semibold text-slate-600', className)}>{children}</th>;
}

export function TD({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <td className={twMerge('px-4 py-3 text-slate-700', className)}>{children}</td>;
}
