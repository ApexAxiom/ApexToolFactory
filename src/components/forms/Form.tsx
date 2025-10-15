import type { FormHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export interface FormProps extends Omit<FormHTMLAttributes<HTMLFormElement>, 'title'> {
  heading?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function Form({ heading, description, actions, children, ...props }: PropsWithChildren<FormProps>) {
  return (
    <form className="space-y-6" {...props}>
      {(heading || description) && (
        <header className="space-y-1">
          {heading ? <h2 className="text-lg font-semibold text-slate-900">{heading}</h2> : null}
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </header>
      )}
      <div className="space-y-4">{children}</div>
      {actions ? <div className="flex justify-end gap-2">{actions}</div> : null}
    </form>
  );
}
