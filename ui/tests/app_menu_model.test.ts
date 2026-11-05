import { expect, test } from "bun:test";

import {
  getActiveSaveableDocumentId,
  getRecentWorkspaces,
  getSaveableDocumentIds,
  getViewMenuNodes,
  resolveAppMenuPresentation,
} from "../src/components/app_menu/app_menu_model";
import { editorStore } from "../src/stores/editor";

test("菜单与图标分别按布局、真实平台判断", () => {
  for (const platform of ["windows", "linux"]) {
    expect(resolveAppMenuPresentation(platform, true, "mobile")).toEqual({
      visible: true,
      native: false,
      icon: true,
    });
  }
  expect(resolveAppMenuPresentation("macos", true, "desktop")).toEqual({
    visible: true,
    native: true,
    icon: false,
  });
  for (const platform of ["android", "ios", "web"]) {
    expect(resolveAppMenuPresentation(platform, false, "desktop")).toEqual({
      visible: true,
      native: false,
      icon: false,
    });
    expect(resolveAppMenuPresentation(platform, false, "mobile").visible).toBe(false);
  }
});

test("刷新窗口只在开发模式加入视图菜单，且位于全屏动作之后", () => {
  const developmentItems = getViewMenuNodes({
    desktop: true,
    layoutMode: "desktop",
    canZoomIn: true,
    canZoomOut: true,
    modifier: "Ctrl",
    fullscreenReady: true,
    development: true,
  });
  const productionItems = getViewMenuNodes({
    desktop: true,
    layoutMode: "desktop",
    canZoomIn: true,
    canZoomOut: true,
    modifier: "Ctrl",
    fullscreenReady: true,
    development: false,
  });

  expect(developmentItems.at(-1)).toMatchObject({
    type: "item",
    title: "刷新窗口",
    action: "refreshWindow",
    enabled: true,
  });
  expect(productionItems.some((node) => node.type === "item" && node.action === "refreshWindow"))
    .toBe(false);
});

test("最近工作区过滤未打开记录并稳定排序，不按名称去重", () => {
  const items = [
    { id: "b", displayName: "笔记", lastOpenedAt: 20 },
    { id: "a", displayName: "笔记", lastOpenedAt: 20 },
    { id: "c", displayName: "旧笔记", lastOpenedAt: 10 },
    { id: "d", displayName: "未打开", lastOpenedAt: null },
  ];
  expect(getRecentWorkspaces(items).map((item) => item.id)).toEqual(["a", "b", "c"]);
  expect(items[0].id).toBe("b");
});

test("保存过滤未加载、只读、冲突、媒体及 untitled，按文档去重", () => {
  const store = editorStore.getState();
  const first = store.openEditor({
    kind: "workspaceFile",
    workspaceId: "menu-test",
    filePath: "a.md",
  });
  store.setDocumentLoadState(first.documentId, "ready");
  const untitled = store.openEditor({ kind: "untitled" });
  store.setDocumentLoadState(untitled.documentId, "ready");
  const ids = getSaveableDocumentIds(editorStore.getState(), false);
  expect(ids).toContain(first.documentId);
  expect(ids).not.toContain(untitled.documentId);
  store.setDocumentLoadState(first.documentId, "loading");
  expect(getSaveableDocumentIds(editorStore.getState(), false)).not.toContain(first.documentId);
  for (const id of [...editorStore.getState().openEditorIds]) store.closeEditor(id);
});

test("同文档存在可写标签时，当前只读副本仍不能主动保存", () => {
  const store = editorStore.getState();
  const writable = store.openEditor({
    kind: "workspaceFile",
    workspaceId: "menu-save",
    filePath: "a.md",
  });
  store.setDocumentLoadState(writable.documentId, "ready");
  const readonly = store.openEditor(
    { kind: "workspaceFile", workspaceId: "menu-save", filePath: "a.md" },
    { duplicate: true, readOnly: true },
  );
  expect(getSaveableDocumentIds(editorStore.getState(), true)).toContain(writable.documentId);
  expect(getActiveSaveableDocumentId(editorStore.getState(), true)).toBeNull();
  store.closeEditor(readonly.editorId);
  store.setActiveEditor(writable.editorId);
  expect(getActiveSaveableDocumentId(editorStore.getState(), true)).toBe(writable.documentId);
  store.closeEditor(writable.editorId);
});
