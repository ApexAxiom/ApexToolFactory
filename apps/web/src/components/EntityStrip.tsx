import React from 'react';

import { useEntitiesStore } from '../state/entitiesStore';
import EntityChip from './EntityChip';

export default function EntityStrip(): JSX.Element | null {
  const entities = useEntitiesStore((state) => state.entities);

  if (entities.length === 0) {
    return null;
  }

  return (
    <section aria-label="Book Lens matches" className="w-full bg-white/80 supports-[backdrop-filter]:backdrop-blur-md border-t border-slate-200">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 pb-4 pt-3">
        <span className="text-xs uppercase tracking-wide text-slate-500">Matches</span>
        <div className="flex gap-3 overflow-x-auto pb-1" role="list">
          {entities.map((entity, index) => (
            <div key={entity.id} role="listitem">
              <EntityChip
                badge={index + 1}
                description={entity.description}
                label={entity.label}
                url={entity.url}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
