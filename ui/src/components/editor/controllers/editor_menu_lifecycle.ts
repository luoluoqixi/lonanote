import { editorStore } from "@/stores/editor";

/** 离开标签即永久作废本轮菜单，切回不能重新激活异步剪贴板事务。 */
export function registerEditorMenuInvalidation(editorId: string, invalidate: () => void) {
  return editorStore.subscribe((state, previous) => {
    if (previous.activeEditorId === editorId && state.activeEditorId !== editorId) invalidate();
  });
}
