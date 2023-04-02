import { create } from "zustand";

export const useProgramStore = create((set) => ({
  program: null,
  setPrograms: (program) => set({ program }),
}));
