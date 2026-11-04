import { createStore } from "zustand/vanilla";

/** 真实窗口状态的只读投影，不能用持久化的窗口快照代替。 */
export const desktopViewState = createStore<{
  fullscreen: boolean;
  ready: boolean;
  layoutResetRevision: number;
}>(() => ({
  fullscreen: false,
  ready: false,
  layoutResetRevision: 0,
}));
