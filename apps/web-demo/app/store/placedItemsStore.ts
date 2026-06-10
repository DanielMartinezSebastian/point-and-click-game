import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlacedSceneItem } from "@pointclick-engine/engine-core";

type PlacedItemsStoreState = {
  items: PlacedSceneItem[];
  setItems: (items: PlacedSceneItem[]) => void;
  addItem: (item: PlacedSceneItem) => void;
  removeItemByInteractionId: (interactionId: string) => void;
  removeItemById: (id: string) => void;
  initialItemsCreated: boolean;
  markInitialItemsCreated: () => void;
};

const STORAGE_KEY = "placed-items-state";

export const usePlacedItemsStore = create<PlacedItemsStoreState>()(
  persist(
    (set) => ({
      items: [],
      setItems: (items) => set({ items }),
      addItem: (item) =>
        set((s) => {
          if (s.items.some((i) => i.id === item.id)) return s;
          return { items: [...s.items, item] };
        }),
      removeItemByInteractionId: (interactionId) =>
        set((s) => ({ items: s.items.filter((i) => i.interactionId !== interactionId) })),
      removeItemById: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      initialItemsCreated: false,
      markInitialItemsCreated: () => set({ initialItemsCreated: true }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
