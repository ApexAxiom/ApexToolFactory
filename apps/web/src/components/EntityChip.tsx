import React from 'react';

interface Props {
  readonly label: string;
  readonly badge: number;
  readonly description?: string | undefined;
  readonly url?: string | undefined;
}

export default function EntityChip({ label, badge, description, url }: Props): JSX.Element {
  const content = (
    <div className="flex h-full min-w-[200px] flex-col gap-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 shadow-lg supports-[backdrop-filter]:backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/90 text-xs font-semibold text-white">
          {badge}
        </span>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
      </div>
      {description ? (
        <p className="overflow-hidden text-ellipsis text-xs text-slate-600">{description}</p>
      ) : null}
    </div>
  );

  if (url) {
    return (
      <a
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        href={url}
        rel="noreferrer"
        target="_blank"
      >
        {content}
      </a>
    );
  }

  return content;
}
