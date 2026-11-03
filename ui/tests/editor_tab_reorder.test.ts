import { expect, test } from "bun:test";
import type { ScrollView, View } from "react-native";

import { readEditorTabGeometry } from "../src/components/editor/desktop/editor_tab_geometry.web";
import { getTabContentBounds, getTabDropTarget, getTabDragScrollSpeed } from "../src/components/editor/desktop/editor_tab_reorder";
import { editorStore } from "../src/stores/editor/editor_store";

test("标签排序保持活动项、文档实例和未保存草稿，支持混合查看器", () => {
  const state = editorStore.getState();
  const a = state.openEditor({ kind: "looseFile", absolutePath: "/reorder-a.md" });
  const b = state.openEditor({ kind: "looseFile", absolutePath: "/reorder-b.md" });
  const image = state.openViewer({ kind: "workspaceFile", workspaceId: "reorder", filePath: "a.png" }, "image");
  state.setDocumentDraft(a.documentId, "未保存内容");
  const document = editorStore.getState().documentsById[a.documentId];
  editorStore.getState().moveEditor(image, a.editorId);
  expect(editorStore.getState().openEditorIds.slice(-3)).toEqual([image, a.editorId, b.editorId]);
  expect(editorStore.getState().activeEditorId).toBe(image);
  expect(editorStore.getState().documentsById[a.documentId]).toBe(document);
  editorStore.getState().moveEditor(a.editorId, null);
  expect(editorStore.getState().openEditorIds.at(-1)).toBe(a.editorId);
  const order = editorStore.getState().openEditorIds;
  state.closeEditor(b.editorId);
  editorStore.getState().moveEditor(image, b.editorId);
  expect(editorStore.getState().openEditorIds).toEqual(order.filter((id) => id !== b.editorId));
  editorStore.getState().moveEditor("closed", null);
  state.closeEditor(a.editorId);
  state.closeEditor(image);
});

test("插入位置按不同宽度标签的中点判断，并排除被拖动项", () => {
  const bounds = new Map([
    ["a", { x: 0, width: 100 }],
    ["b", { x: 100, width: 200 }],
    ["c", { x: 300, width: 100 }],
  ]);
  expect(getTabDropTarget(["a", "b", "c"], bounds, "b", 30)).toEqual({ beforeId: "a", x: 0 });
  expect(getTabDropTarget(["a", "b", "c"], bounds, "b", 310)).toEqual({ beforeId: "c", x: 300 });
  expect(getTabDropTarget(["a", "b", "c"], bounds, "b", 390)).toEqual({ beforeId: null, x: 400 });
});

test("仅在视口内部靠近边缘时自动滚动", () => {
  expect(getTabDragScrollSpeed(150, 300)).toBe(0);
  expect(getTabDragScrollSpeed(5, 300)).toBeLessThan(0);
  expect(getTabDragScrollSpeed(295, 300)).toBeGreaterThan(0);
  expect(getTabDragScrollSpeed(-20, 300)).toBe(0);
  expect(getTabDragScrollSpeed(320, 300)).toBe(0);
});

test("标签实际矩形换算为内容坐标，排除侧栏偏移、滚动和容器缩放", () => {
  expect(getTabContentBounds(120, 1, 0, 232, 132)).toEqual({ x: 112, width: 132 });
  expect(getTabContentBounds(120, 1, 80, 152, 132)).toEqual({ x: 112, width: 132 });
  expect(getTabContentBounds(240, 2, 80, 304, 264)).toEqual({ x: 112, width: 132 });
  const bounds = new Map([
    ["a", getTabContentBounds(120, 1, 0, 120, 112)],
    ["b", getTabContentBounds(120, 1, 0, 232, 132)],
    ["c", getTabContentBounds(120, 1, 0, 364, 136)],
  ]);
  expect(getTabDropTarget(["a", "b", "c"], bounds, "c", 700)).toEqual({ beforeId: null, x: 380 });
});

test("Web 拖动测量使用实际标签边界，末尾指示线不会落进标签栏空白区域", () => {
  const viewport = {
    clientWidth: 900, scrollWidth: 900, scrollLeft: 80,
    getBoundingClientRect: () => ({ left: 120, top: 30, width: 900, height: 36 }),
  };
  const scrollView = { getScrollableNode: () => viewport } as unknown as ScrollView;
  const nodes = new Map<string, View>([
    ["a", { isConnected: true, getBoundingClientRect: () => ({ left: 40, width: 112 }) } as unknown as View],
    ["b", { isConnected: true, getBoundingClientRect: () => ({ left: 152, width: 132 }) } as unknown as View],
    ["c", { isConnected: true, getBoundingClientRect: () => ({ left: 284, width: 136 }) } as unknown as View],
  ]);
  const geometry = readEditorTabGeometry(scrollView, nodes)!;
  expect(geometry.bounds.get("c")).toEqual({ x: 244, width: 136 });
  const target = getTabDropTarget(["a", "b", "c"], geometry.bounds, "c", 700);
  expect(target.x - geometry.scrollLeft).toBe(300);
  expect(target.beforeId).toBeNull();
});
