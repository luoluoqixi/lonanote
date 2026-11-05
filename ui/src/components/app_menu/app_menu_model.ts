import type { EditorStoreState } from "@/stores/editor";

export type AppMenuActionId =
  | "zoomIn"
  | "zoomOut"
  | "zoomReset"
  | "resetLayout"
  | "toggleFullscreen"
  | "refreshWindow"
  | "newFile"
  | "newFolder"
  | "newWindow"
  | "openFile"
  | "openFolder"
  | "save"
  | "saveAll"
  | "settings"
  | "quit"
  | "undo"
  | "redo"
  | "cut"
  | "copy"
  | "paste"
  | "selectAll"
  | "about"
  | `workspace:${string}`;
export type AppMenuNode =
  | { type: "separator" }
  | { type: "item"; title: string; action: AppMenuActionId; enabled: boolean; shortcut?: string }
  | { type: "submenu"; title: string; items: AppMenuNode[] };
export type AppMenuGroup = { id: string; title: string; items: AppMenuNode[] };

export function getViewMenuNodes(options: {
  desktop: boolean;
  layoutMode: "desktop" | "mobile";
  canZoomIn: boolean;
  canZoomOut: boolean;
  modifier: "Ctrl" | "Cmd";
  fullscreenReady: boolean;
  development: boolean;
}): AppMenuNode[] {
  const { desktop, layoutMode, canZoomIn, canZoomOut, modifier, fullscreenReady, development } =
    options;
  const item = (
    title: string,
    action: AppMenuActionId,
    enabled = true,
    shortcut?: string,
  ): AppMenuNode => ({ type: "item", title, action, enabled, shortcut });
  const items: AppMenuNode[] = [
    item("放大", "zoomIn", canZoomIn, `${modifier}++`),
    item("缩小", "zoomOut", canZoomOut, `${modifier}+-`),
    item("实际大小", "zoomReset", desktop, `${modifier}+0`),
    item("重置布局", "resetLayout", desktop || layoutMode === "desktop"),
    { type: "separator" },
    item("切换全屏", "toggleFullscreen", fullscreenReady, "F11"),
  ];
  if (development) items.push(item("刷新窗口", "refreshWindow"));
  return items;
}

export function resolveAppMenuPresentation(
  platform: string,
  tauri: boolean,
  layoutMode: "desktop" | "mobile",
) {
  const desktop = tauri && ["windows", "linux", "macos"].includes(platform);
  return {
    visible: desktop || layoutMode === "desktop",
    native: desktop && platform === "macos",
    icon: desktop && ["windows", "linux"].includes(platform),
  };
}

export function getRecentWorkspaces<T extends { id: string; lastOpenedAt: number | null }>(
  items: readonly T[],
): T[] {
  return items
    .filter((item) => item.lastOpenedAt !== null)
    .sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0) || a.id.localeCompare(b.id));
}

export function getSaveableDocumentIds(
  state: Pick<EditorStoreState, "openEditorIds" | "editorsById" | "documentsById">,
  desktop: boolean,
): string[] {
  return [
    ...new Set(
      state.openEditorIds.flatMap((id) => {
        const view = state.editorsById[id];
        const doc = view && state.documentsById[view.documentId];
        return doc &&
          !view.readOnly &&
          !view.previewMode &&
          doc.loadState === "ready" &&
          !doc.conflict &&
          doc.ref.kind !== "untitled" &&
          (doc.ref.kind !== "looseFile" || desktop)
          ? [doc.documentId]
          : [];
      }),
    ),
  ];
}

export function getActiveSaveableDocumentId(
  state: Pick<
    EditorStoreState,
    "activeEditorId" | "openEditorIds" | "editorsById" | "documentsById"
  >,
  desktop: boolean,
): string | null {
  if (!state.activeEditorId) return null;
  return (
    getSaveableDocumentIds({ ...state, openEditorIds: [state.activeEditorId] }, desktop)[0] ?? null
  );
}
