import React, { useCallback } from 'react';

interface AskBarProps {
  readonly disabled?: boolean;
  readonly ariaLiveMessage?: string | undefined;
}

/**
 * Persistent Ask Bar anchored at the bottom of the viewport for contextual queries.
 *
 * @param {AskBarProps} props Component configuration.
 * @returns {JSX.Element} Accessible search form ready for input.
 * @example
 * ```tsx
 * <AskBar disabled={false} ariaLiveMessage="Listening for your question" />
 * ```
 */
export default function AskBar({
  disabled = false,
  ariaLiveMessage
}: AskBarProps): JSX.Element {
  const handleSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-6">
      <form
        aria-label="Ask Book Lens"
        className="mx-auto flex w-full max-w-xl flex-col gap-2 px-4 pb-6"
        onSubmit={handleSubmit}
        role="search"
      >
        <label className="sr-only" htmlFor="ask-input">
          Ask Book Lens
        </label>
        <div className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-4 py-2 shadow-lg backdrop-blur">
          <input
            autoComplete="off"
            className="min-h-[44px] flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-500"
            disabled={disabled}
            id="ask-input"
            inputMode="text"
            placeholder={disabled ? 'Camera access is required' : 'Ask Book Lens…'}
            type="text"
          />
          <button
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-900 transition-colors duration-150 ease-out disabled:bg-slate-500 disabled:text-slate-300"
            disabled={disabled}
            type="submit"
          >
            Ask
          </button>
        </div>
        {ariaLiveMessage ? (
          <span aria-live="polite" className="text-center text-xs text-slate-400">
            {ariaLiveMessage}
          </span>
        ) : null}
      </form>
    </div>
  );
}
