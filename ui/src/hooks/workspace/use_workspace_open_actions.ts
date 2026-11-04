import { useRef, useState } from "react";
import { confirmNative } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import {
  type ExternalWorkspaceStorageBindingRequest,
  type WorkspaceListItem,
  type WorkspaceSnapshot,
  workspace,
} from "@/api/commands/workspace";
import { getFileName, isDesktop } from "@/api/common";
import { createSingleFlight } from "@/components/app_menu/app_menu_actions";
import { confirmExternalIdRegeneration } from "@/components/workspaces/workspace_select/scan_id_conflict_dialog";
import { useEditorCloseActions } from "@/hooks/editor/use_editor_close_actions";
import { useToast } from "@/hooks/ui";
import { useWorkspaceSession } from "@/hooks/workspace/use_workspace_session";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";

const run = createSingleFlight();
export function useWorkspaceOpenActions(
  options: {
    onOpened?: () => void;
    onMissing?: (item: WorkspaceListItem) => void;
    onChanged?: () => Promise<unknown>;
  } = {},
) {
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaceSession();
  const { withWorkspaceClose } = useEditorCloseActions();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const latest = useRef(options);
  latest.current = options;
  const refreshWorkspaces = async () => {
    await latest.current.onChanged?.();
  };
  const onWorkspaceOpened = () => latest.current.onOpened?.();
  const openTargetWorkspace = async (workspaceId: string) => {
    if (workspaceId === currentWorkspaceId) {
      onWorkspaceOpened();
      return;
    }
    const workspaces = await workspace.list();
    const setPendingRebindWorkspace = (item: WorkspaceListItem) => latest.current.onMissing?.(item);
    const openTarget = async (): Promise<WorkspaceSnapshot | null> => {
      const openResult = await workspace.openWithDiagnostics(workspaceId);
      if (openResult.status === "opened") {
        return openResult.workspace;
      }
      if (openResult.status === "directoryMissing") {
        const result = await confirmNative({
          buttons: [
            { key: "cancel", style: "cancel", text: "取消" },
            { key: "locate", text: "重新定位" },
            { key: "delete", style: "destructive", text: "删除记录" },
          ],
          message:
            "无法找到此工作区的文件夹。如果已移动文件夹，可以重新定位；删除记录不会删除任何文件。",
          title: "工作区文件夹不存在",
        });
        if (result === "locate") {
          const missing = workspaces.find((item) => item.id === workspaceId);
          if (missing) setPendingRebindWorkspace(missing);
        }
        if (result === "delete") {
          await workspace.remove(workspaceId, false);
          await refreshWorkspaces();
          toast.success("已删除工作区记录");
        }
        return null;
      }

      const resolution = openResult.manifestIdRegistered
        ? await confirmNative({
            buttons: [
              { key: "cancel", style: "cancel", text: "取消" },
              { key: "generate-new-id", text: "生成新 ID" },
            ],
            message: `当前记录的 ID：${openResult.expectedId}\n文件夹中的 ID：${openResult.actualId}\n\n文件夹中的 ID 已被另一个工作区使用。是否为此文件夹生成新的 ID 并继续进入？`,
            title: "Workspace ID 已存在",
          })
        : await confirmNative({
            buttons: [
              { key: "cancel", style: "cancel", text: "取消" },
              { key: "update-id", text: "更新 ID" },
            ],
            message: `当前记录的 ID：${openResult.expectedId}\n文件夹中的 ID：${openResult.actualId}\n\n是否使用文件夹中的 ID 更新工作区记录并继续进入？`,
            title: "Workspace ID 不匹配",
          });
      if (resolution !== "update-id" && resolution !== "generate-new-id") {
        return null;
      }
      const openedWorkspace = await workspace.resolveIdMismatch(
        workspaceId,
        resolution === "generate-new-id" ? "generateNewId" : "useManifestId",
      );
      await refreshWorkspaces();
      return openedWorkspace;
    };
    let opened: WorkspaceSnapshot | null = null;
    const enter = async () => {
      opened = await openTarget();
      if (!opened) return false;
      if (currentWorkspaceId) {
        try {
          await workspace.close(currentWorkspaceId);
        } catch (error) {
          await workspace.close(opened.id).catch(() => undefined);
          throw error;
        }
      }
      return true;
    };
    const completed = currentWorkspaceId
      ? await withWorkspaceClose(currentWorkspaceId, enter)
      : await enter();
    if (!completed || !opened) return;
    if (currentWorkspaceId) workspaceExplorerStore.getState().resetWorkspace(currentWorkspaceId);
    setCurrentWorkspaceId((opened as WorkspaceSnapshot).id);
    await refreshWorkspaces();
    onWorkspaceOpened();
  };
  const perform = (operation: () => Promise<void>) =>
    run(async () => {
      setBusy(true);
      try {
        await operation();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "打开工作区失败");
      } finally {
        setBusy(false);
      }
    });
  return {
    busy,
    openWorkspace: (id: string) => perform(() => openTargetWorkspace(id)),
    openFolder: () =>
      perform(async () => {
        if (!isDesktop()) return;
        const selected = await fs.showSelectDialog({ type: "openFolder", title: "打开文件夹" });
        if (!selected?.path) return;
        const binding: ExternalWorkspaceStorageBindingRequest = {
          kind: "external",
          providerId: "desktop-folder",
          providerSchemaVersion: 1,
          resourceRef: selected.path,
        };
        const result = await workspace.ensureExternal(
          binding,
          getFileName(selected.path.replace(/\\/g, "/")),
        );
        if (result.status === "idConflict" && !(await confirmExternalIdRegeneration(selected.path)))
          return;
        const target =
          result.status === "ready"
            ? result.workspace
            : await workspace.resolveExternalIdConflict(binding, result.workspaceId);
        await refreshWorkspaces();
        await openTargetWorkspace(target.id);
      }),
  };
}
