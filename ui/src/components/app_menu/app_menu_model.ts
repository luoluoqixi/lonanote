import type { EditorStoreState } from "@/stores/editor";

export type AppMenuActionId =
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
