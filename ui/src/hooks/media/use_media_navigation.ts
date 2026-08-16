import { useStore } from "zustand";

import { mediaNavigationStore } from "@/stores/media";

export function useMediaNavigation() {
  const mediaSequence = useStore(mediaNavigationStore.store, (state) => state.mediaSequence);

  return {
    mediaSequence,
    setMediaSequence: mediaNavigationStore.setMediaSequence,
  };
}
