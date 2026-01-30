import { persist } from "zustand/middleware";
import { create } from "zustand";

export type AnimationsState = {
  userEnabled: boolean | null;
  setUserEnabled: (v: boolean | null) => void;
};

export const useSparksStore = create<AnimationsState>()(
  persist(
    (set) => ({
      userEnabled: null,
      setUserEnabled: (v: boolean | null) => set({ userEnabled: v }),
    }),
    {
      name: "vectura:sparks",
      partialize: (state) => ({ userEnabled: state.userEnabled }),
    }
  )
);

