import type { FormHTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function Form({ title, description, actions, children, ...props }: PropsWithChildren<FormProps>) {
  return (
    <form className="space-y-6" {...props}>
      {(title || description) && (
        <header className="space-y-1">
          {title ? <h2 className="text-lg font-semibold text-slate-900">{title}</h2> : null}
          {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        </header>
      )}
      <div className="space-y-4">{children}</div>
      {actions ? <div className="flex justify-end gap-2">{actions}</div> : null}
    </form>
  );
}
