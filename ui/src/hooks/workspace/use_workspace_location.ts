import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

import {
  type WorkspaceListItem,
  type WorkspaceStorageBindingRequest,
  workspace,
} from "@/api/commands/workspace";
import { getErrorMessage } from "@/api/common/error_message";
import { closeWorkspaceViewerSessions } from "@/components/editor/controllers/workspace_editor_lifecycle";
import { changeWorkspaceStorage } from "@/components/workspaces/workspace_select/workspace_storage_change";
import { useEditorCloseActions } from "@/hooks/editor/use_editor_close_actions";
import { useToast } from "@/hooks/ui";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";
import { workspaceResourceSessionStore } from "@/stores/workspace/workspace_resource_session_store";

import { useWorkspaceSession } from "./use_workspace_session";
import { useWorkspaceStorageTarget } from "./use_workspace_storage_target";

export type WorkspaceLocationMode = "relocate" | "rebind";

export function useWorkspaceLocation({
  busyRef,
  isBlocked,
  onChanged,
}: {
  busyRef: RefObject<boolean>;
  isBlocked: () => boolean;
  onChanged: () => Promise<void>;
}) {
  const target = useWorkspaceStorageTarget();
  const [item, setItem] = useState<WorkspaceListItem | null>(null);
  const [mode, setMode] = useState<WorkspaceLocationMode>("relocate");
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<{ id: string; value: string } | null>(null);
  const { withWorkspaceClose } = useEditorCloseActions();
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaceSession();
  const { toast } = useToast();
  const latestBlockedRef = useRef(isBlocked);
  latestBlockedRef.current = isBlocked;

  useEffect(() => {
    if (!item) return;
    let disposed = false;
    void workspace
      .nativeRootPath(item.id)
      .then((path) => {
        if (!disposed) setCurrentPath({ id: item.id, value: path ?? "此存储位置不提供本地路径" });
      })
      .catch(() => {
        if (!disposed)
          setCurrentPath({
            id: item.id,
            value: "无法读取当前位置，文件夹可能已移动或暂时不可访问",
          });
      });
    return () => {
      disposed = true;
    };
  }, [item]);

  const open = useCallback(
    (nextItem: WorkspaceListItem, nextMode: WorkspaceLocationMode) => {
      if (busyRef.current || latestBlockedRef.current()) return;
      setItem(nextItem);
      setMode(nextMode);
      setError(null);
      void target.load(nextItem.storage.providerId, nextItem.storage.directoryName ?? "");
    },
    [busyRef, target.load],
  );

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && !busyRef.current && !target.isChoosing) setItem(null);
    },
    [busyRef, target.isChoosing],
  );

  const submit = useCallback(async () => {
    if (
      !item ||
      busyRef.current ||
      latestBlockedRef.current() ||
      target.isLoading ||
      target.isChoosing
    )
      return;
    const providerId = target.providerId;
    if (!providerId) return;
    const directoryName = target.directoryName.trim();
    if (target.isManaged && !directoryName) {
      setError("请输入文件夹名");
      return;
    }
    if (!target.isManaged && !target.externalBinding) {
      setError("请选择目标文件夹");
      return;
    }
    const binding: WorkspaceStorageBindingRequest = target.isManaged
      ? { kind: "managed", providerId, providerSchemaVersion: 1, directoryName }
      : target.externalBinding!;
    busyRef.current = true;
    setIsWorking(true);
    setError(null);
    try {
      const result = await changeWorkspaceStorage(
        item.id,
        async () => {
          if (mode === "rebind") {
            await workspace.rebind(item.id, binding);
            return null;
          }
          const relocated = await workspace.relocate(
            item.id,
            binding.kind === "managed"
              ? { kind: "managed", providerId, preferredDirectoryName: directoryName }
              : { kind: "external", binding },
          );
          return relocated.sourceCleanup;
        },
        {
          isOpen: workspace.isOpen,
          close: workspace.close,
          open: workspace.open,
          withClose: withWorkspaceClose,
          sessionChanged: (id) => workspaceResourceSessionStore.getState().invalidate(id),
        },
      );
      if (!result.completed) return;
      closeWorkspaceViewerSessions(item.id);
      const projectionWarning = await workspaceExplorerStore
        .getState()
        .restartWorkspace(item.id)
        .then(() => null)
        .catch((error) => getErrorMessage(error, "文件列表刷新失败"));
      if (currentWorkspaceId === item.id && result.wasOpen && !result.reopened) {
        setCurrentWorkspaceId(null);
      }
      setItem(null);
      const warnings: string[] = [];
      if (projectionWarning) warnings.push(projectionWarning);
      try {
        await onChanged();
      } catch (refreshError) {
        warnings.push(`列表刷新失败：${getErrorMessage(refreshError, "请刷新工作区列表")}`);
      }
      const cleanup = result.sourceCleanup;
      if (cleanup?.status === "failed")
        warnings.push(`旧文件夹未删除：${cleanup.message ?? "请检查旧位置"}`);
      if (result.reopenError) warnings.push(`重新打开失败：${result.reopenError}`);
      const success = mode === "rebind" ? "已重新定位工作区" : "已更改存储位置";
      if (warnings.length) toast.warning(`${success}，${warnings.join("；")}`);
      else toast.success(success);
    } catch (nextError) {
      if (currentWorkspaceId === item.id && !(await workspace.isOpen(item.id).catch(() => false))) {
        setCurrentWorkspaceId(null);
        closeWorkspaceViewerSessions(item.id);
        workspaceExplorerStore.getState().resetWorkspace(item.id);
      }
      setError(getErrorMessage(nextError, mode === "rebind" ? "重新定位失败" : "迁移失败"));
    } finally {
      busyRef.current = false;
      setIsWorking(false);
    }
  }, [
    item,
    busyRef,
    target,
    mode,
    withWorkspaceClose,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    onChanged,
    toast,
  ]);

  return {
    item,
    mode,
    target,
    isWorking,
    error,
    open,
    onOpenChange,
    submit,
    currentPath: currentPath?.id === item?.id ? currentPath?.value : "正在读取当前位置…",
  };
}
