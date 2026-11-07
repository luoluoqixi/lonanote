import { type Href, useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { useState } from "react";

import { fs } from "@/api/commands/fs";
import { workspaceFile } from "@/api/commands/workspace";
import { isDesktop } from "@/api/common/platform";
import { getDefaultWorkspaceEntryName } from "@/api/common/utils/workspace_entry_name";
import { createSingleFlight } from "@/components/app_menu/app_menu_actions";
import { documentRegistry } from "@/components/editor/controllers";
import { EDITOR_FILE_EXTENSIONS } from "@/components/editor/desktop/editor_file_drop";
import { getQuickCreateParent } from "@/components/editor/desktop/editor_note_creation";
import { getEditorTabRef } from "@/components/editor/desktop/editor_tab_menu_actions";
import { useLayoutMode } from "@/hooks/layout";
import { useToast } from "@/hooks/ui";
import { useCurrentWorkspaceId, useWorkspaceExplorerSelectedEntries } from "@/hooks/workspace";
import { useWorkspaceFileActions } from "@/hooks/workspace/use_workspace_file_actions";
import { editorStore } from "@/stores/editor";

const runCreate = createSingleFlight();
const runOpen = createSingleFlight();

export function useEditorFileActions() {
  const workspaceId = useCurrentWorkspaceId();
  const getSnapshot = editorStore.getState;
  const getSelected = useWorkspaceExplorerSelectedEntries();
  const fileActions = useWorkspaceFileActions();
  const { layoutMode } = useLayoutMode();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ path?: string }>();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const create = async (
    kind: "note" | "directory",
    options?: { workspaceId: string; parentPath: string; navigate?: boolean },
  ) =>
    runCreate(async () => {
      const targetId = options?.workspaceId ?? workspaceId;
      if (!targetId) return;
      setBusy(true);
      try {
        const snapshot = getSnapshot();
        const ref = snapshot.activeEditorId
          ? getEditorTabRef(snapshot.activeEditorId, snapshot)
          : null;
        const parentPath =
          options?.parentPath ??
          getQuickCreateParent(
            kind,
            ref,
            targetId,
            getSelected(targetId),
            pathname === "/workspace" ? (params.path ?? "") : "",
          );
        const entries = await workspaceFile.list(targetId, parentPath);
        const result = await fileActions.createEntry({
          workspaceId: targetId,
          parentPath,
          name: getDefaultWorkspaceEntryName(entries, kind),
          kind,
        });
        const path = result.succeededPaths[0];
        if (!path) return;
        if (kind === "note") {
          const opened = documentRegistry.openEditor({
            kind: "workspaceFile",
            workspaceId: targetId,
            filePath: path,
          });
          if (layoutMode === "mobile" || options?.navigate)
            router.push({
              pathname: "/editor/[editorId]",
              params: { editorId: opened.editorId, path },
            } as Href);
        } else if (layoutMode === "mobile" || options?.navigate) {
          router.push({ pathname: "/workspace", params: { path } } as Href);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "创建失败");
      } finally {
        setBusy(false);
      }
    });
  const openLooseFile = () =>
    runOpen(async () => {
      if (!isDesktop()) return;
      try {
        const result = await fs.showSelectDialog({
          type: "openFile",
          title: "打开 Markdown 文件",
          filters: [{ name: "Markdown", extensions: EDITOR_FILE_EXTENSIONS }],
        });
        if (result?.path) {
          const opened = documentRegistry.openEditor({
            kind: "looseFile",
            absolutePath: result.path,
          });
          if (layoutMode === "mobile")
            router.push({
              pathname: "/editor/[editorId]",
              params: { editorId: opened.editorId },
            } as Href);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "打开文件失败");
      }
    });
  return {
    createNote: () => create("note"),
    createDirectory: () => create("directory"),
    quickCreate: create,
    openLooseFile,
    busy,
  };
}
