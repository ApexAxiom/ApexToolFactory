import type { ReactNode } from "react";

/**
 * Renders a stylized card container for grouping content blocks.
 * @param props.children - Inner content to render within the card.
 * @param props.className - Optional Tailwind classes to append.
 * @returns JSX element containing the provided children wrapped in a card.
 * @example
 * ```tsx
 * <Card className="mt-4">Content</Card>
 * ```
 */
export default function Card({children, className=""}:{children:ReactNode,className?:string}) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}
