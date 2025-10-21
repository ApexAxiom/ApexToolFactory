import type { ReactNode } from "react";

/**
 * Displays floating action controls for save/cancel actions.
 * @param props.children - Buttons or controls rendered inside the bar.
 * @returns Sticky positioned toolbar element.
 * @example
 * ```tsx
 * <SaveBar>
 *   <button type="button">Save</button>
 * </SaveBar>
 * ```
 */
export default function SaveBar({children}:{children:ReactNode}) {
  return (
    <div className="fixed bottom-4 right-4">
      <div className="card px-4 py-3 flex gap-3">{children}</div>
    </div>
  );
}
