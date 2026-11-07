import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { type EditorStoreState, editorStore } from "@/stores/editor";

/** 外围 UI 只订阅实际需要的字段，避免滚动快照逐帧刷新整个工作台。 */
export function useEditorSelector<T>(selector: (state: EditorStoreState) => T): T {
  return useStore(editorStore, useShallow(selector));
}
