import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: "Pest Estimator" };

/**
 * Wraps the application with global HTML structure and styles.
 * @param props.children - React children to render inside the layout.
 * @returns Root layout HTML structure.
 * @example
 * ```tsx
 * export default function Layout(props: { children: ReactNode }) {
 *   return <RootLayout {...props} />;
 * }
 * ```
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
