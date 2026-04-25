import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

interface PanelProps extends PropsWithChildren {
  className?: string;
}

export function Panel({ children, className }: PanelProps) {
  return (
    <section className={cn("rounded-lg border border-line bg-white p-5 shadow-subtle", className)}>
      {children}
    </section>
  );
}
