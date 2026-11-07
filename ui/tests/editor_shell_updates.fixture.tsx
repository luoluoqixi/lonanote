import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window();
globalThis.window = win as unknown as Window;
globalThis.document = win.document as unknown as Document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
mock.module("../src/api/common/platform", () => ({ isDesktop: () => true }));
mock.module("../src/api/commands/system/clipboard", () => ({ clipboard: {} }));
mock.module("../src/components/editor/controllers", () => ({
  saveCoordinator: {},
  editorCommandCoordinator: {},
}));
mock.module("../src/components/editor/controllers/editor_window_service", () => ({
  editorWindowService: {},
}));
mock.module("../src/components/editor/desktop/editor_menu_actions", () => ({
  executeEditorMenuAction: () => {},
}));
mock.module("../src/hooks/ui", () => ({ useToast: () => ({ toast: {} }) }));
mock.module("../src/hooks/editor/use_text_menu_target", () => ({
  useTextMenuTarget: () => ({ active: false, isActive: () => false }),
}));
const { createRoot } = await import("react-dom/client");
const { editorStore } = await import("../src/stores/editor");
const { useAppSaveActions } = await import("../src/hooks/editor/use_app_save_actions");
const { useAppEditActions } = await import("../src/hooks/editor/use_app_edit_actions");

test("60 次独立滚动快照不刷新菜单；只读、选区和活动标签变化仍刷新", async () => {
  const opened = editorStore.getState().openEditor({ kind: "untitled" });
  const id = opened.editorId;
  editorStore.getState().setEditorBridgeState(id, "ready");
  editorStore.setState((state) => ({
    documentsById: {
      ...state.documentsById,
      [opened.documentId]: { ...state.documentsById[opened.documentId], editOwnerEditorId: id },
    },
  }));
  const initial = editorStore.getState().editorsById[id].editorState;
  editorStore.getState().setEditorStateSnapshot(id, { ...initial, focused: true });
  let renders = 0;
  let saves: ReturnType<typeof useAppSaveActions>;
  let edits: ReturnType<typeof useAppEditActions>;
  function MenuHarness() {
    renders++;
    saves = useAppSaveActions();
    edits = useAppEditActions();
    return null;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(() => root.render(<MenuHarness />));
  const before = renders;
  for (let scrollTop = 1; scrollTop <= 60; scrollTop++) {
    await act(() => {
      const snapshot = editorStore.getState().editorsById[id].editorState;
      editorStore.getState().setEditorStateSnapshot(id, {
        ...snapshot,
        viewState: { selection: { anchor: 0, head: 0 }, scrollTop },
      });
    });
  }
  console.log(`60 次滚动的外围菜单额外 render: ${renders - before}`);
  expect(renders - before).toBe(0);
  expect(editorStore.getState().editorsById[id].editorState.viewState?.scrollTop).toBe(60);
  expect(saves!.canSave).toBe(true);
  expect(edits!.enabled.copy).toBe(false);
  await act(() => {
    const snapshot = editorStore.getState().editorsById[id].editorState;
    editorStore.getState().setEditorStateSnapshot(id, { ...snapshot, selectionEmpty: false });
  });
  expect(edits!.enabled.copy).toBe(true);
  await act(() =>
    editorStore.setState((state) => ({
      editorsById: { ...state.editorsById, [id]: { ...state.editorsById[id], readOnly: true } },
    })),
  );
  expect(saves!.canSave).toBe(false);
  expect(edits!.enabled.cut).toBe(false);
  expect(edits!.enabled.copy).toBe(true);
  await act(() => editorStore.getState().closeEditor(id));
  expect(edits!.enabled.copy).toBe(false);
  expect(saves!.canSaveAll).toBe(false);
  await act(() => root.unmount());
  host.remove();
});
