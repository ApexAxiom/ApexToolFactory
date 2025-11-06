"use client";
import type { ReactNode } from "react";

/**
 * Renders a button that triggers the browser print dialog.
 */
export default function PrintButton({ children = "Print" }: { children?: ReactNode }) {
  return (
    <button type="button" className="btn print:hidden" onClick={() => window.print()}>
      {children}
    </button>
  );
}
