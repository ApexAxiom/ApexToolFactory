import create from "zustand";

export interface Entity {
  id: string;
  label: string;
  description?: string;
  url?: string;
  rank: number;
}

interface State {
  entities: Entity[];
  setEntities: (entities: Entity[]) => void;
  clear: () => void;
}

export const useEntitiesStore = create<State>((set) => ({
  entities: [],
  setEntities: (entities) =>
    set({
      entities: [...entities].sort((a, b) => b.rank - a.rank)
    }),
  clear: () => set({ entities: [] })
}));
