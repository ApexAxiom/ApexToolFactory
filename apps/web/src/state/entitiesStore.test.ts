import { describe, expect, it } from 'vitest';

import { getVisibleEntities, type Entity } from './entitiesStore';

const mk = (label: string, source: 'typed' | 'auto'): Entity => ({
  id: label,
  label,
  rank: 1,
  source
});

describe('entitiesStore selectors', () => {
  it('limits typed results to five, alphabetical', () => {
    const entities = ['z', 'b', 'a', 'c', 'y', 'x', 'm'].map((l) => mk(l, 'typed'));
    const visible = getVisibleEntities(entities);
    expect(visible.map((e) => e.label)).toEqual(['a', 'b', 'c', 'm', 'x']);
  });

  it('shows all auto results, alphabetical', () => {
    const entities = ['z', 'b', 'a', 'c'].map((l) => mk(l, 'auto'));
    const visible = getVisibleEntities(entities);
    expect(visible.map((e) => e.label)).toEqual(['a', 'b', 'c', 'z']);
  });
});


