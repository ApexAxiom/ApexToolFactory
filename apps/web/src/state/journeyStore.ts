import create from 'zustand';

interface JourneyItem {
  id: string;
  createdAt: number;
}

interface State {
  items: JourneyItem[];
  add: (item: JourneyItem) => void;
}

export const useJourneyStore = create<State>((set) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] }))
}));
