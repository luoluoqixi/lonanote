import { useStore } from "zustand";

import { desktopViewState } from "@/stores/ui/desktop_view_state";

export function useDesktopLayoutResetRevision() {
  return useStore(desktopViewState, (state) => state.layoutResetRevision);
}
