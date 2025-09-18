import React, { useCallback, useMemo, useState } from 'react';

interface AskBarProps {
  readonly disabled?: boolean;
  readonly ariaLiveMessage?: string | undefined;
  readonly onSubmit?: (value: string) => Promise<void> | void;
  readonly loading?: boolean;
  readonly errorMessage?: string | null;
  readonly infoMessage?: string | null;
  readonly placeholder?: string;
}

export default function AskBar({
  disabled = false,
  ariaLiveMessage,
  onSubmit,
  loading = false,
  errorMessage,
  infoMessage,
  placeholder
}: AskBarProps): JSX.Element {
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setTouched(true);

      const trimmed = value.trim();
      if (!trimmed) {
        return;
      }

      try {
        await onSubmit?.(trimmed);
        setValue('');
        setTouched(false);
      } catch {
        // keep the value so the user can adjust it
      }
    },
    [onSubmit, value]
  );

  const isDisabled = disabled || loading;
  const showEmptyError = touched && value.trim().length === 0 && !errorMessage;
  const helperText = useMemo(() => {
    if (errorMessage) {
      return errorMessage;
    }

    if (showEmptyError) {
      return 'Type something to ask.';
    }

    return null;
  }, [errorMessage, showEmptyError]);

  const resolvedPlaceholder = placeholder ?? 'Ask Book Lens.';

  return (
    <div className="relative z-10 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-4">
      <form
        aria-busy={loading}
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
            disabled={isDisabled}
            id="ask-input"
            inputMode="text"
            onChange={handleChange}
            placeholder={isDisabled ? 'Camera access is required' : resolvedPlaceholder}
            value={value}
            type="text"
          />
          <button
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-900 transition-colors duration-150 ease-out disabled:bg-slate-500 disabled:text-slate-300"
            disabled={isDisabled}
            type="submit"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </div>
        {helperText ? (
          <span aria-live="polite" className="text-center text-xs text-red-300">
            {helperText}
          </span>
        ) : null}
        {infoMessage ? (
          <p aria-live="polite" className="text-center text-xs text-slate-300">
            {infoMessage}
          </p>
        ) : null}
        {ariaLiveMessage ? (
          <span aria-live="polite" className="sr-only">
            {ariaLiveMessage}
          </span>
        ) : null}
      </form>
    </div>
  );
}
