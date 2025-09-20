import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface AskBarProps {
  readonly disabled?: boolean;
  readonly ariaLiveMessage?: string | undefined;
  readonly onSubmit?: (value: string) => Promise<void> | void;
  readonly loading?: boolean;
  readonly errorMessage?: string | null;
  readonly infoMessage?: string | null;
  readonly placeholder?: string | undefined;
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
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const inputDisabled = disabled; // keep input enabled while loading to avoid blur
  const buttonDisabled = disabled || loading;
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

  // Keep focus while typing; do not blur on state changes like loading
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      // only re-focus if the user had focus previously
      // heuristic: keep focus when value is being typed or when loading toggles
      if (!inputDisabled) {
        inputRef.current.focus();
      }
    }
  }, [inputDisabled]);

  return (
    <div className="relative z-10 bg-gradient-to-t from-white via-white/80 to-transparent pt-4">
      <form
        aria-label="Ask Book Lens"
        className="mx-auto flex w-full max-w-xl flex-col gap-2 px-4 pb-6"
        onSubmit={handleSubmit}
        role="search"
      >
        <label className="sr-only" htmlFor="ask-input">
          Ask Book Lens
        </label>
        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:backdrop-blur-md">
          <input
            autoComplete="off"
            className="min-h-[44px] flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
            disabled={inputDisabled}
            id="ask-input"
            inputMode="text"
            onChange={handleChange}
            placeholder={inputDisabled ? 'Camera access is required' : resolvedPlaceholder}
            ref={inputRef}
            value={value}
            type="text"
          />
          <button
            className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-full bg-slate-900/90 px-4 text-sm font-semibold text-white transition-colors duration-150 ease-out disabled:bg-slate-200 disabled:text-slate-400"
            disabled={buttonDisabled}
            type="submit"
          >
            {loading ? 'Asking...' : 'Ask'}
          </button>
        </div>
        {helperText ? (
          <span aria-live="polite" className="text-center text-xs text-red-600">
            {helperText}
          </span>
        ) : null}
        {infoMessage ? (
          <p aria-live="polite" className="text-center text-xs text-slate-600">
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
