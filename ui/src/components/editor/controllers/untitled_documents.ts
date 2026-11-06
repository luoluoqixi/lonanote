import { type OpenEditorResult, editorStore } from "@/stores/editor/editor_store";

let nextUntitledNumber = 1;

export function createUntitledDocument(): OpenEditorResult {
  return editorStore.getState().openEditor({
    kind: "untitled",
    initialTitle: `无标题-${nextUntitledNumber++}`,
  });
}
