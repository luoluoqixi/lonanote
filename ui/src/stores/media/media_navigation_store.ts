import { createStore } from "zustand/vanilla";

export type MediaNavigationSequence = {
  mediaPaths: string[];
  workspaceId: string;
};

type MediaNavigationStoreState = {
  mediaSequence: MediaNavigationSequence | null;
  setMediaSequence: (mediaSequence: MediaNavigationSequence) => void;
};

const mediaNavigationStoreApi = createStore<MediaNavigationStoreState>()((set) => ({
  mediaSequence: null,
  setMediaSequence: (mediaSequence) => {
    set({ mediaSequence });
  },
}));

export const mediaNavigationStore = {
  setMediaSequence: (mediaSequence: MediaNavigationSequence): void => {
    mediaNavigationStoreApi.getState().setMediaSequence(mediaSequence);
  },
  store: mediaNavigationStoreApi,
};
