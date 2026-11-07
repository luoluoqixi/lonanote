import { type OpenEditorResult, editorStore } from "@/stores/editor/editor_store";

import { editorWindowRuntime } from "./editor_window_runtime";

let nextUntitledNumber = 1;

export function createUntitledDocument(groupId?: string): OpenEditorResult {
  if (editorWindowRuntime.isRemote()) throw new Error("辅助窗口必须通过 owner 新建文档");
  return editorStore.getState().openEditor(
    {
      kind: "untitled",
      initialTitle: `无标题-${nextUntitledNumber++}`,
    },
    { groupId },
  );
}

/** 辅助窗口的新文档先由 owner 创建权威文档，再接收投影。 */
export async function createUntitledDocumentForWindow(groupId?: string): Promise<OpenEditorResult> {
  if (!editorWindowRuntime.isRemote()) return createUntitledDocument(groupId);
  const state = editorStore.getState();
  const source =
    (groupId ? state.groupsById[groupId]?.tabIds : [])?.find(
      (id) => !!state.editorsById[id] || !!state.viewersById[id],
    ) ?? [...Object.keys(state.editorsById), ...Object.keys(state.viewersById)][0];
  if (!source) throw new Error("当前窗口没有可用于新建文档的 owner 视图");
  const { editorWindowService } = await import("./editor_window_service");
  return editorWindowService.openReference(source, { kind: "untitled" }, groupId);
}
