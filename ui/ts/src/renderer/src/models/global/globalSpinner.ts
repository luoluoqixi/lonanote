import { create } from 'zustand';

export interface GlobalSpinner {
  open: boolean;
  content: string | null;
}

export const useGlobalSpinnerStore = create<GlobalSpinner>(() => ({
  open: false,
  content: null,
}));
