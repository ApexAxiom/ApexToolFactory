import type { PropsWithChildren, ReactNode } from 'react';

export interface FormFieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export function FormField({ label, hint, error, children }: PropsWithChildren<FormFieldProps>) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      <div className="space-y-1 text-sm font-normal text-slate-700">{children}</div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
