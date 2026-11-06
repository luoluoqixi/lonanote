import { describe, expect, test } from "bun:test";

import { getDocumentSaveCapabilities } from "../src/components/editor/controllers/document_save_capabilities";
import { createUntitledDocument } from "../src/components/editor/controllers/untitled_documents";
import { editorStore } from "../src/stores/editor/editor_store";

describe("无标题文档", () => {
  test("首次保存提交期间，目标父目录的转移必须等待", () => {
    const { documentId } = editorStore.getState().openEditor({ kind: "untitled" });
    const release = editorStore.getState().reserveDocumentTarget(documentId, { kind: "workspaceFile", workspaceId: "pending", filePath: "notes/a.md" });
    try { expect(() => editorStore.getState().reserveWorkspacePaths("pending", ["notes"])).toThrow(); }
    finally { release(); }
  });
  test("保存目标在文件操作预占范围内时，必须在写入前拒绝", () => {
    const { documentId } = editorStore.getState().openEditor({ kind: "untitled" });
    const release = editorStore.getState().reserveWorkspacePaths("reserved", [""]);
    try {
      expect(() =>
        editorStore
          .getState()
          .reserveDocumentTarget(documentId, {
            kind: "workspaceFile",
            workspaceId: "reserved",
            filePath: "note.md",
          }),
      ).toThrow();
    } finally {
      release();
    }
  });
  test("不需要工作区，窗口内编号递增且身份独立", () => {
    const a = createUntitledDocument();
    const b = createUntitledDocument();
    const state = editorStore.getState();
    expect(a.documentId).not.toBe(b.documentId);
    expect(state.documentsById[a.documentId].title).toBe("无标题-1");
    expect(state.documentsById[b.documentId].title).toBe("无标题-2");
    expect(state.documentsById[a.documentId].ref.kind).toBe("untitled");
    expect(state.documentsById[a.documentId].draft).toBe("");
  });

  test("空白文档可以主动保存，但始终禁止自动保存", () => {
    const { documentId, editorId } = createUntitledDocument();
    const state = editorStore.getState();
    const doc = state.documentsById[documentId];
    const view = state.editorsById[editorId];
    expect(getDocumentSaveCapabilities(doc, view, "tauri")).toEqual({
      canSave: true,
      canAutoSave: false,
    });
    expect(getDocumentSaveCapabilities(doc, { ...view, readOnly: true }, "native").canSave).toBe(
      false,
    );
  });

  test("绑定保留标签、草稿与修订，并拒绝过期身份和重复目标", () => {
    const { documentId, editorId } = createUntitledDocument();
    editorStore.getState().setDocumentDraft(documentId, "未保存内容");
    const before = editorStore.getState();
    const draft = before.documentsById[documentId];
    const target = { kind: "workspaceFile" as const, workspaceId: "test", filePath: "note.md" };
    before.bindDocumentFile(documentId, target, 0);
    const bound = editorStore.getState();
    expect(bound.openEditorIds).toEqual(before.openEditorIds);
    expect(bound.editorsById[editorId]).toBe(before.editorsById[editorId]);
    expect(bound.documentsById[documentId]).toMatchObject({
      documentId,
      draft: draft.draft,
      draftRevision: draft.draftRevision,
      savedRevision: draft.savedRevision,
      identityRevision: 1,
      title: "note.md",
      ref: target,
    });
    expect(bound.documentIdByKey[draft.documentKey]).toBeUndefined();
    expect(() =>
      bound.bindDocumentFile(documentId, { kind: "looseFile", absolutePath: "other.md" }, 0),
    ).toThrow();
    const other = createUntitledDocument();
    const snapshot = editorStore.getState();
    expect(() => snapshot.bindDocumentFile(other.documentId, target, 0)).toThrow();
    expect(editorStore.getState()).toBe(snapshot);
  });
});
