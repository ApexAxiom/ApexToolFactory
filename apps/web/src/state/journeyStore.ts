import create from "zustand";

interface JourneyItem {
  id: string;
  createdAt: number;
  query: string;
  resultCount: number;
}

interface State {
  items: JourneyItem[];
  add: (item: JourneyItem) => void;
}

export const useJourneyStore = create<State>((set) => ({
  items: [],
  add: (item) =>
    set((state) => ({
      items: [item, ...state.items].slice(0, 20)
    }))
}));
