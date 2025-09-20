import React from 'react';

import Reader from './pages/Reader';

/**
 * Renders the Book Lens application shell focused on the Reader experience.
 *
 * @returns {JSX.Element} The application root element.
 * @example
 * ```tsx
 * import { createRoot } from 'react-dom/client';
 * import App from './app';
 *
 * createRoot(document.getElementById('root')!).render(<App />);
 * ```
 */
export default function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Reader />
    </div>
  );
}
