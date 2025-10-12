import type { PropsWithChildren, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

export interface CardProps {
  title?: ReactNode;
  className?: string;
}

export function Card({ title, className, children }: PropsWithChildren<CardProps>) {
  return (
    <section className={twMerge('card space-y-4', className)}>
      {title ? <header className="flex items-center justify-between">{title}</header> : null}
      <div>{children}</div>
    </section>
  );
}
