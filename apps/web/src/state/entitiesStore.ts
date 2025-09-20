import create from "zustand";

export type EntitySource = 'typed' | 'auto';

export interface Entity {
  id: string;
  label: string;
  description?: string;
  url?: string;
  rank: number;
  source: EntitySource;
}

interface State {
  entities: Entity[];
  setEntities: (entities: Entity[]) => void;
  clear: () => void;
}

export const useEntitiesStore = create<State>((set) => ({
  entities: [],
  setEntities: (entities) => set({ entities: [...entities] }),
  clear: () => set({ entities: [] })
}));

export function getVisibleEntities(entities: readonly Entity[]): Entity[] {
  if (entities.length === 0) return [];
  const source = entities[0]?.source;
  const alphabetical = [...entities].sort((a, b) => a.label.localeCompare(b.label));
  if (source === 'typed') {
    return alphabetical.slice(0, 5);
  }
  return alphabetical;
}
