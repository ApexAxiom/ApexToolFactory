import React from 'react';

interface Props {
  readonly label: string;
  readonly badge: number;
  readonly description?: string;
  readonly url?: string;
}

export default function EntityChip({ label, badge, description, url }: Props): JSX.Element {
  const content = (
    <div className="flex h-full min-w-[200px] flex-col gap-1 rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-900">
          {badge}
        </span>
        <p className="text-sm font-semibold text-slate-100">{label}</p>
      </div>
      {description ? (
        <p className="overflow-hidden text-ellipsis text-xs text-slate-400">{description}</p>
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
