import React from 'react';

import { getVisibleEntities, useEntitiesStore } from '../state/entitiesStore';

function PreviewTooltip({ description }: { readonly description?: string | undefined }): JSX.Element | null {
  if (!description) return null;
  return (
    <div className="pointer-events-none absolute left-2 right-2 top-full z-20 mt-2 hidden rounded-xl border border-slate-200 bg-white/80 p-3 text-xs text-slate-700 shadow-lg supports-[backdrop-filter]:backdrop-blur-md group-hover:block">
      {description}
    </div>
  );
}

export default function ResultsPanel(): JSX.Element | null {
  const entities = useEntitiesStore((state) => state.entities);
  if (entities.length === 0) return null;

  const items = getVisibleEntities(entities);

  return (
    <section aria-label="Results" className="w-full">
      <ul className="flex flex-col gap-3">
        {items.map((entity, index) => (
          <li key={entity.id} className="group relative rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm supports-[backdrop-filter]:backdrop-blur-md">
            <div className="mb-1 flex items-center gap-2">
              <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-slate-900/90 px-2 text-xs font-semibold text-white">
                {index + 1}
              </span>
              <a
                href={entity.url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-semibold text-slate-900 hover:underline"
                title={entity.label}
              >
                {entity.label}
              </a>
            </div>
            {entity.description ? (
              <p className="line-clamp-3 text-sm text-slate-600">{entity.description}</p>
            ) : null}
            <PreviewTooltip description={entity.description} />
          </li>
        ))}
      </ul>
    </section>
  );
}


