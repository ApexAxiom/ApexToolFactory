import create from 'zustand';

interface Entity {
  id: string;
  badge: number;
}

interface State {
  entities: Entity[];
  setEntities: (e: Entity[]) => void;
}

export const useEntitiesStore = create<State>((set) => ({
  entities: [],
  setEntities: (entities) => set({ entities })
}));
