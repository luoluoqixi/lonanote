import { expect, test } from "bun:test";

import {
  applyEditorWindowProjection,
  createEditorWindowProjection,
} from "../src/components/editor/controllers/editor_window_projection";
import { editorStore } from "../src/stores/editor";

test("跨窗口日常投影只传文本增量并恢复相同文档", () => {
  const opened = editorStore.getState().openEditor({ kind: "untitled" });
  const state = editorStore.getState();
  const previous = {
    document: {
      ...state.documentsById[opened.documentId],
      draft: "hello",
      savedText: "hello",
      draftRevision: 1,
    },
    editor: state.editorsById[opened.editorId],
    historyStatus: { canUndo: false, canRedo: false },
  };
  const next = {
    ...previous,
    document: { ...previous.document, draft: "hello world", draftRevision: 2 },
    historyStatus: { canUndo: true, canRedo: false },
  };
  const message = createEditorWindowProjection(previous, next);
  expect(message.kind).toBe("incremental");
  if (message.kind !== "incremental") throw new Error("缺少增量");
  expect(message.change).toEqual({ from: 5, to: 5, insert: " world" });
  expect("draft" in message.document).toBe(false);
  expect("savedText" in message.document).toBe(false);
  expect(applyEditorWindowProjection(previous, message)).toEqual(next);
  expect(() =>
    applyEditorWindowProjection(
      { ...previous, document: { ...previous.document, draftRevision: 0 } },
      message,
    ),
  ).toThrow("缺口");
});
test("初始化checkpoint及保存内容变更也可精确恢复", () => {
  const opened = editorStore.getState().openEditor({ kind: "untitled" });
  const state = editorStore.getState();
  const first = {
    document: state.documentsById[opened.documentId],
    editor: state.editorsById[opened.editorId],
  };
  const checkpoint = createEditorWindowProjection(undefined, first);
  expect(checkpoint.kind).toBe("checkpoint");
  expect(applyEditorWindowProjection(undefined, checkpoint)).toEqual(first);
  const next = { ...first, document: { ...first.document, savedText: "saved", savedRevision: 1 } };
  expect(applyEditorWindowProjection(first, createEditorWindowProjection(first, next))).toEqual(
    next,
  );
});
