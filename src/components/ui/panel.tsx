import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends PropsWithChildren {
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <section className={cn("rounded-2xl border border-ink/10 bg-white p-6 shadow-panel", className)}>
      {children}
    </section>
  );
}
