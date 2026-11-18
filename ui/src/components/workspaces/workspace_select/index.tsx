import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SelectHandle } from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { multiWindow } from "@/api/commands/win/multi_window";
import {
  type WorkspaceListItem,
  type WorkspaceSnapshot,
  workspace,
} from "@/api/commands/workspace";
import { isDesktop, isSystemLocaleCN, os } from "@/api/common";
import type { DialogWindowResultMap } from "@/api/common/dialogs/dialog_types";
import { confirmNative } from "@/api/common/dialogs/native_dialogs";
import type {
  WorkspaceSelectAction,
  WorkspaceSelectViewModel,
} from "@/api/common/dialogs/workspace_select_model";
import { getErrorMessage } from "@/api/common/error_message";
import { isTauri } from "@/api/common/platform";
import { useEditorCloseActions } from "@/hooks/editor/use_editor_close_actions";
import { useLayoutMode } from "@/hooks/layout";
import { useAndroidDoubleBackToExit } from "@/hooks/navigation";
import { useUiPreferences } from "@/hooks/settings";
import { useToast } from "@/hooks/ui";
import { useWorkspaceNavigation, useWorkspaceSession } from "@/hooks/workspace";
import { useWorkspaceCatalogRevision } from "@/hooks/workspace/use_workspace_catalog_revision";
import { useWorkspaceLocation } from "@/hooks/workspace/use_workspace_location";
import { useWorkspaceOpenActions } from "@/hooks/workspace/use_workspace_open_actions";
import { useWorkspaceSelectDialogBridge } from "@/hooks/workspace/use_workspace_select_dialog_bridge";
import { useWorkspaceStorageTarget } from "@/hooks/workspace/use_workspace_storage_target";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";
import { workspaceStateRevisionStore } from "@/stores/workspace/workspace_state_revision_store";

import { CreateWorkspaceSheet } from "./create_workspace_sheet";
import { EditWorkspaceSheet } from "./edit_workspace_sheet";
import { chooseScanIdConflictKeeper } from "./scan_id_conflict_dialog";
import { WorkspaceDetailsSheet } from "./workspace_details_sheet";
import { type WorkspaceGroupMode, WorkspaceGroupModeSelect } from "./workspace_group";
import { WorkspaceLocationSheet } from "./workspace_location_sheet";
import { WorkspaceSelectView } from "./workspace_select_view";
import {
  WorkspaceSortSelect,
  type WorkspaceSortValue,
  isWorkspaceTitleSortValue,
  sortWorkspaces,
} from "./workspace_sort";

const MIN_PULL_TO_REFRESH_DURATION_MS = 500;

function getDefaultNewNoteName() {
  return isSystemLocaleCN() ? "我的笔记" : "My Notes";
}

async function waitForMinimumDuration(startedAt: number, minimumDurationMs: number) {
  const remainingDuration = minimumDurationMs - (Date.now() - startedAt);
  if (remainingDuration <= 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, remainingDuration);
  });
}

export function WorkspaceSelect() {
  useAndroidDoubleBackToExit();
  const { resetToWorkspace } = useWorkspaceNavigation();
  return <WorkspaceSelectContent onWorkspaceOpened={resetToWorkspace} />;
}

export function WorkspaceSelectContent({
  embedded = false,
  nativeRequestId,
  onWorkspaceOpened,
}: {
  embedded?: boolean;
  nativeRequestId?: string;
  onWorkspaceOpened: () => void;
}) {
  const { toast } = useToast();
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";
  const { closeWorkspace, withWorkspaceClose } = useEditorCloseActions();
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaceSession();
  const { preferences, updateAndSave: updateUiPreferencesAndSave } = useUiPreferences();
  const { revision: catalogRevision, invalidateCatalog } = useWorkspaceCatalogRevision();
  const desktopCatalogRevision = isTauri() ? catalogRevision : 0;
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const workspaceSortValue = preferences.workspaceSelect.sortValue;
  const workspaceGroupMode = preferences.workspaceSelect.groupMode;
  const isGroupModeDisabled = isWorkspaceTitleSortValue(workspaceSortValue);
  const effectiveGroupMode = isGroupModeDisabled ? "none" : workspaceGroupMode;
  const groupModeBeforeTitleSortRef = useRef(workspaceGroupMode);

  useEffect(() => {
    if (!isGroupModeDisabled) {
      groupModeBeforeTitleSortRef.current = workspaceGroupMode;
    }
  }, [isGroupModeDisabled, workspaceGroupMode]);
  const [isWorkspaceSortSelectOpen, setIsWorkspaceSortSelectOpen] = useState(false);
  const [isWorkspaceGroupModeSelectOpen, setIsWorkspaceGroupModeSelectOpen] = useState(false);
  const [isWorkspaceSelectionMode, setIsWorkspaceSelectionMode] = useState(false);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [isOpeningWorkspace, setIsOpeningWorkspace] = useState(false);
  const [pendingRebindWorkspace, setPendingRebindWorkspace] = useState<WorkspaceListItem | null>(
    null,
  );
  const [isOpeningFolder, setIsOpeningFolder] = useState(false);
  const openingFolderRef = useRef(false);
  const [isScanningWorkspaces, setIsScanningWorkspaces] = useState(false);
  const scanInProgressRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingWorkspaces, setIsRefreshingWorkspaces] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isCreateWorkspaceSheetOpen, setIsCreateWorkspaceSheetOpen] = useState(false);
  const workspaceSortSelectRef = useRef<SelectHandle>(null);
  const workspaceGroupModeSelectRef = useRef<SelectHandle>(null);
  const [displayName, setDisplayName] = useState("");
  const createTarget = useWorkspaceStorageTarget();
  const creatingRef = useRef(false);
  const locationBusyRef = useRef(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceListItem | null>(null);
  const [editedWorkspaceName, setEditedWorkspaceName] = useState("");
  const [isEditWorkspaceSheetOpen, setIsEditWorkspaceSheetOpen] = useState(false);
  const [detailsWorkspace, setDetailsWorkspace] = useState<WorkspaceListItem | null>(null);
  const [isWorkspaceDetailsSheetOpen, setIsWorkspaceDetailsSheetOpen] = useState(false);
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const requestIdRef = useRef(0);
  const currentOs = os();
  const usesNativeIosHeader = !desktop && !embedded && currentOs === "ios";
  const tracksNavigationBarScrollEdge =
    !desktop && !embedded && (usesNativeIosHeader || currentOs === "android");

  const refreshWorkspaces = useCallback(
    async (minimumDurationMs = 0) => {
      const requestId = ++requestIdRef.current;
      const startedAt = Date.now();

      try {
        const records = await workspace.list();
        await waitForMinimumDuration(startedAt, minimumDurationMs);

        if (requestId === requestIdRef.current) {
          setWorkspaces(records);
          // 桌面由 Rust 广播 Catalog 变化，读取后再次通知会造成刷新循环。
          if (!isTauri()) invalidateCatalog();
          setHasError(false);
        }
      } catch (nextError: unknown) {
        await waitForMinimumDuration(startedAt, minimumDurationMs);

        if (requestId === requestIdRef.current) {
          console.error("[workspace-select] load workspaces failed", nextError);
          setHasError(true);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [invalidateCatalog],
  );

  const location = useWorkspaceLocation({
    busyRef: locationBusyRef,
    isBlocked: () =>
      scanInProgressRef.current ||
      openingFolderRef.current ||
      creatingRef.current ||
      isOpeningWorkspace ||
      isDeletingWorkspace ||
      isUpdatingWorkspace,
    onChanged: refreshWorkspaces,
  });

  const handlePullToRefresh = useCallback(
    () => refreshWorkspaces(MIN_PULL_TO_REFRESH_DURATION_MS),
    [refreshWorkspaces],
  );

  const handleMenuRefresh = useCallback(async () => {
    if (isRefreshingWorkspaces) return;

    setIsRefreshingWorkspaces(true);
    try {
      await refreshWorkspaces();
    } finally {
      setIsRefreshingWorkspaces(false);
    }
  }, [isRefreshingWorkspaces, refreshWorkspaces]);

  const scanWorkspaces = useCallback(async () => {
    if (
      scanInProgressRef.current ||
      locationBusyRef.current ||
      openingFolderRef.current ||
      isOpeningWorkspace ||
      isDeletingWorkspace ||
      isUpdatingWorkspace ||
      isCreatingWorkspace
    ) {
      return;
    }

    scanInProgressRef.current = true;
    setIsScanningWorkspaces(true);
    try {
      const result = await workspace.scanManaged();
      let registeredCount = result.registeredCount;
      let regeneratedCount = 0;
      let skippedGroups = 0;
      for (const conflict of result.idConflicts) {
        try {
          const keepIndex = await chooseScanIdConflictKeeper(conflict, nativeRequestId);
          if (keepIndex === null) {
            skippedGroups += 1;
            continue;
          }
          const resolved = await workspace.resolveScanIdConflict(conflict.conflictId, keepIndex);
          registeredCount += resolved.registeredCount;
          regeneratedCount += resolved.regeneratedCount;
        } catch (error) {
          skippedGroups += 1;
          console.error("[workspace-select] resolve scan ID conflict failed", error);
          toast.error(getErrorMessage(error, "处理重复 Workspace ID 失败"));
        } finally {
          await workspace.discardScanIdConflict(conflict.conflictId);
        }
      }
      const problemCount = result.bindingConflictCount + result.invalidCount;
      const messages = [
        registeredCount > 0 ? `已新增 ${registeredCount} 个工作区` : "未发现新的工作区",
      ];
      if (regeneratedCount > 0) messages.push(`已更新 ${regeneratedCount} 个重复 ID`);
      if (skippedGroups > 0) messages.push(`已跳过 ${skippedGroups} 组重复 ID`);
      if (problemCount > 0) messages.push(`已跳过 ${problemCount} 个异常目录`);
      if (problemCount > 0 || skippedGroups > 0) {
        toast.warning(messages.join("，"));
      } else {
        toast.success(messages.join("，"));
      }
    } catch (error) {
      console.error("[workspace-select] scan managed workspaces failed", error);
      toast.error(getErrorMessage(error, "扫描工作区失败"));
    } finally {
      await refreshWorkspaces();
      scanInProgressRef.current = false;
      setIsScanningWorkspaces(false);
    }
  }, [
    isOpeningWorkspace,
    isDeletingWorkspace,
    isUpdatingWorkspace,
    isCreatingWorkspace,
    refreshWorkspaces,
    toast,
  ]);

  const openCreateWorkspaceSheet = useCallback(() => {
    if (
      scanInProgressRef.current ||
      openingFolderRef.current ||
      locationBusyRef.current ||
      creatingRef.current
    )
      return;
    setDisplayName(getDefaultNewNoteName());
    setIsCreateWorkspaceSheetOpen(true);
    void createTarget.load();
  }, [createTarget.load]);

  const createWorkspace = useCallback(
    async (submission?: DialogWindowResultMap["workspace.create"]) => {
      if (
        creatingRef.current ||
        locationBusyRef.current ||
        scanInProgressRef.current ||
        openingFolderRef.current ||
        (!submission && (createTarget.isLoading || createTarget.isChoosing))
      ) {
        return;
      }

      const nextDisplayName = (submission?.displayName ?? displayName).trim();
      if (!nextDisplayName) {
        toast.error("请输入工作区名称");
        return;
      }
      const providerId = submission?.providerId ?? createTarget.providerId;
      const isManaged = submission?.isManaged ?? createTarget.isManaged;
      const externalBinding = submission?.externalBinding ?? createTarget.externalBinding;
      if (!providerId) {
        toast.error("请选择存储位置");
        return;
      }

      if (!isManaged && !externalBinding) {
        toast.error("请选择目标文件夹");
        return;
      }
      creatingRef.current = true;
      setIsCreatingWorkspace(true);
      try {
        let createdWorkspace: WorkspaceSnapshot | null = null;
        const create = async () => {
          createdWorkspace = isManaged
            ? await workspace.createManaged(providerId, nextDisplayName)
            : await workspace.createExternal(externalBinding!, nextDisplayName);
          if (currentWorkspaceId && !isTauri()) {
            try {
              await workspace.close(currentWorkspaceId);
            } catch (error) {
              await workspace.close(createdWorkspace.id).catch(() => undefined);
              throw error;
            }
          }
        };
        const completed = currentWorkspaceId
          ? await withWorkspaceClose(currentWorkspaceId, create)
          : (await create(), true);
        if (!completed || !createdWorkspace) return;
        if (currentWorkspaceId)
          workspaceExplorerStore.getState().resetWorkspace(currentWorkspaceId);
        const created = createdWorkspace as WorkspaceSnapshot;
        setCurrentWorkspaceId(created.id);
        setIsCreateWorkspaceSheetOpen(false);
        void refreshWorkspaces();
        toast.success(`已创建工作区“${created.displayName}”`);
      } catch (error) {
        console.error("[workspace-select] create workspace failed", error);
        toast.error(getErrorMessage(error, "创建工作区失败"));
      } finally {
        creatingRef.current = false;
        setIsCreatingWorkspace(false);
      }
    },
    [
      currentWorkspaceId,
      withWorkspaceClose,
      displayName,
      isCreatingWorkspace,
      refreshWorkspaces,
      setCurrentWorkspaceId,
      createTarget,
      toast,
    ],
  );

  const openEditWorkspaceSheet = useCallback(
    (workspaceItem: WorkspaceListItem) => {
      if (scanInProgressRef.current || locationBusyRef.current || creatingRef.current) return;
      void multiWindow
        .assertWorkspaceEditable(workspaceItem.id)
        .then(() => {
          if (scanInProgressRef.current || locationBusyRef.current || creatingRef.current) return;
          setEditingWorkspace(workspaceItem);
          setEditedWorkspaceName(workspaceItem.displayName);
          setIsEditWorkspaceSheetOpen(true);
        })
        .catch((error) => toast.warning(getErrorMessage(error, "无法编辑该工作区")));
    },
    [toast],
  );

  const handleEditWorkspaceSheetOpenChange = useCallback((open: boolean) => {
    setIsEditWorkspaceSheetOpen(open);

    if (!open) {
      setEditingWorkspace(null);
      setEditedWorkspaceName("");
    }
  }, []);

  const updateWorkspace = useCallback(
    async (submittedName?: string) => {
      if (
        !editingWorkspace ||
        isUpdatingWorkspace ||
        scanInProgressRef.current ||
        locationBusyRef.current ||
        creatingRef.current
      ) {
        return;
      }

      const nextDisplayName = (submittedName ?? editedWorkspaceName).trim();
      if (!nextDisplayName) {
        toast.error("请输入工作区名称");
        return;
      }

      setIsUpdatingWorkspace(true);
      try {
        const updatedWorkspace = await workspace.updateDisplayName(
          editingWorkspace.id,
          nextDisplayName,
        );
        workspaceStateRevisionStore.getState().invalidate(editingWorkspace.id);
        handleEditWorkspaceSheetOpenChange(false);
        await refreshWorkspaces();
        toast.success(`已更新工作区“${updatedWorkspace.displayName}”`);
      } catch (error) {
        console.error("[workspace-select] update workspace failed", error);
        toast.error(getErrorMessage(error, "更新工作区失败"));
      } finally {
        setIsUpdatingWorkspace(false);
      }
    },
    [
      editedWorkspaceName,
      editingWorkspace,
      handleEditWorkspaceSheetOpenChange,
      isUpdatingWorkspace,
      refreshWorkspaces,
      toast,
    ],
  );

  const deleteWorkspaces = useCallback(
    async (workspaceItems: WorkspaceListItem[]) => {
      if (
        isDeletingWorkspace ||
        scanInProgressRef.current ||
        locationBusyRef.current ||
        creatingRef.current ||
        workspaceItems.length === 0
      ) {
        return;
      }

      const isSingleWorkspace = workspaceItems.length === 1;
      const result = await confirmNative({
        parentRequestId: nativeRequestId,
        buttons: [
          { key: "cancel", style: "cancel", text: "取消" },
          { key: "delete", style: "destructive", text: "删除" },
        ],
        message: isSingleWorkspace
          ? `删除工作区“${workspaceItems[0]?.displayName}”及其中的所有文件后无法恢复，是否继续？`
          : `删除选中的 ${workspaceItems.length} 个工作区及其中的所有文件后无法恢复，是否继续？`,
        title: "警告",
      });

      if (
        result !== "delete" ||
        scanInProgressRef.current ||
        locationBusyRef.current ||
        creatingRef.current
      ) {
        return;
      }

      setIsDeletingWorkspace(true);

      const removedWorkspaceIds: string[] = [];
      let failedCount = 0;
      let fileCleanupFailedCount = 0;

      try {
        for (const workspaceItem of workspaceItems) {
          try {
            if (!(await closeWorkspace(workspaceItem.id))) break;
            workspaceExplorerStore.getState().resetWorkspace(workspaceItem.id);
            const removedWorkspace = await workspace.remove(workspaceItem.id, true);
            removedWorkspaceIds.push(workspaceItem.id);

            if (removedWorkspace.fileCleanup.status === "failed") {
              fileCleanupFailedCount += 1;
            }
          } catch (error) {
            failedCount += 1;
            console.error(`[workspace-select] delete workspace ${workspaceItem.id} failed`, error);
          }
        }

        if (currentWorkspaceId && removedWorkspaceIds.includes(currentWorkspaceId)) {
          setCurrentWorkspaceId(null);
        }
        setSelectedWorkspaceIds((currentIds) =>
          currentIds.filter((id) => !removedWorkspaceIds.includes(id)),
        );
        await refreshWorkspaces();

        if (failedCount > 0) {
          const removedCount = removedWorkspaceIds.length;
          if (removedCount > 0) {
            toast.warning(`已删除 ${removedCount} 个工作区，${failedCount} 个删除失败`);
          } else {
            toast.error("删除工作区失败");
          }
          return;
        }

        if (fileCleanupFailedCount > 0) {
          toast.warning(
            isSingleWorkspace
              ? "工作区已移除，但部分文件删除失败"
              : `工作区已移除，其中 ${fileCleanupFailedCount} 个工作区的部分文件删除失败`,
          );
          return;
        }

        toast.success(
          isSingleWorkspace
            ? `已删除工作区“${workspaceItems[0]?.displayName}”`
            : `已删除 ${workspaceItems.length} 个工作区`,
        );
      } finally {
        setIsDeletingWorkspace(false);
      }
    },
    [
      currentWorkspaceId,
      closeWorkspace,
      isDeletingWorkspace,
      refreshWorkspaces,
      setCurrentWorkspaceId,
      toast,
      nativeRequestId,
    ],
  );

  const sortedWorkspaces = useMemo(
    () => sortWorkspaces(workspaces, workspaceSortValue),
    [workspaceSortValue, workspaces],
  );
  const selectedWorkspaces = useMemo(
    () => workspaces.filter((workspaceItem) => selectedWorkspaceIds.includes(workspaceItem.id)),
    [selectedWorkspaceIds, workspaces],
  );

  const changeWorkspaceSortValue = useCallback(
    async (nextValue: WorkspaceSortValue) => {
      setIsWorkspaceSortSelectOpen(false);

      try {
        await updateUiPreferencesAndSave((currentPreferences) => ({
          ...currentPreferences,
          workspaceSelect: {
            ...currentPreferences.workspaceSelect,
            groupMode: isWorkspaceTitleSortValue(nextValue)
              ? "none"
              : groupModeBeforeTitleSortRef.current,
            sortValue: nextValue,
          },
        }));
      } catch (error) {
        console.error("[workspace-select] update sort preference failed", error);
        toast.error(getErrorMessage(error, "保存排序方式失败"));
      }
    },
    [toast, updateUiPreferencesAndSave],
  );

  const changeWorkspaceGroupMode = useCallback(
    async (nextValue: WorkspaceGroupMode) => {
      if (isGroupModeDisabled) {
        return;
      }

      setIsWorkspaceGroupModeSelectOpen(false);

      try {
        await updateUiPreferencesAndSave((currentPreferences) => ({
          ...currentPreferences,
          workspaceSelect: {
            ...currentPreferences.workspaceSelect,
            groupMode: nextValue,
          },
        }));
      } catch (error) {
        console.error("[workspace-select] update group preference failed", error);
        toast.error(getErrorMessage(error, "保存分组方式失败"));
      }
    },
    [isGroupModeDisabled, toast, updateUiPreferencesAndSave],
  );

  const sharedOpen = useWorkspaceOpenActions({
    parentRequestId: nativeRequestId,
    onOpened: onWorkspaceOpened,
    onChanged: refreshWorkspaces,
    onMissing: setPendingRebindWorkspace,
  });
  const handleWorkspacePress = async (workspaceId: string) => {
    if (
      scanInProgressRef.current ||
      locationBusyRef.current ||
      creatingRef.current ||
      openingFolderRef.current ||
      isOpeningWorkspace ||
      isScanningWorkspaces ||
      isDeletingWorkspace ||
      isUpdatingWorkspace
    )
      return;
    setIsOpeningWorkspace(true);
    try {
      await sharedOpen.openWorkspace(workspaceId);
    } finally {
      setIsOpeningWorkspace(false);
    }
  };

  const handleSelectedWorkspaceIdsChange = useCallback(
    (nextSelectedIds: Array<string | number>) => {
      setSelectedWorkspaceIds(nextSelectedIds.filter((id): id is string => typeof id === "string"));
    },
    [],
  );
  const openFolder = async () => {
    if (
      openingFolderRef.current ||
      locationBusyRef.current ||
      creatingRef.current ||
      scanInProgressRef.current ||
      isOpeningWorkspace ||
      isCreatingWorkspace ||
      isDeletingWorkspace ||
      isUpdatingWorkspace
    )
      return;
    openingFolderRef.current = true;
    setIsOpeningFolder(true);
    try {
      await sharedOpen.openFolder();
    } finally {
      openingFolderRef.current = false;
      setIsOpeningFolder(false);
    }
  };

  const areAllWorkspacesSelected =
    workspaces.length > 0 &&
    workspaces.every((workspaceItem) => selectedWorkspaceIds.includes(workspaceItem.id));
  const toggleSelectAllWorkspaces = useCallback(() => {
    setSelectedWorkspaceIds(
      areAllWorkspacesSelected ? [] : workspaces.map((workspaceItem) => workspaceItem.id),
    );
  }, [areAllWorkspacesSelected, workspaces]);
  const toggleWorkspaceSelectionMode = useCallback(() => {
    setIsWorkspaceSelectionMode((currentValue) => !currentValue);
    setSelectedWorkspaceIds([]);
  }, []);
  const finishWorkspaceSelection = useCallback(() => {
    setIsWorkspaceSelectionMode(false);
    setSelectedWorkspaceIds([]);
  }, []);

  useEffect(() => {
    if (pendingRebindWorkspace && !isOpeningWorkspace) {
      location.open(pendingRebindWorkspace, "rebind");
      setPendingRebindWorkspace(null);
    }
  }, [pendingRebindWorkspace, isOpeningWorkspace, location.open]);

  useEffect(() => {
    void refreshWorkspaces();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refreshWorkspaces, desktopCatalogRevision]);

  const viewModel: WorkspaceSelectViewModel = {
    embedded,
    desktop,
    currentWorkspaceId,
    supportsOpenFolder: isDesktop(),
    groupMode: effectiveGroupMode,
    sortValue: workspaceSortValue,
    workspaces: sortedWorkspaces,
    selectedWorkspaceIds,
    areAllWorkspacesSelected,
    isGroupModeDisabled,
    isOpeningFolder:
      isOpeningFolder || isOpeningWorkspace || location.isWorking || isCreatingWorkspace,
    isOpeningWorkspace: isOpeningWorkspace || sharedOpen.busy,
    isScanningWorkspaces,
    isRefreshingWorkspaces,
    isWorkspaceSelectionMode,
    isDeletingWorkspace,
    isUpdatingWorkspace: isUpdatingWorkspace || location.isWorking || isCreatingWorkspace,
    isLoading,
    hasError,
    tracksNavigationBarScrollEdge,
    usesNativeIosHeader,
  };
  const handleViewAction = async (action: WorkspaceSelectAction): Promise<void> => {
    // 来自子 WebView 的消息只选择本地已有的操作，绝不执行任意 command。
    if ("workspaceId" in action) {
      const item = workspaces.find((item) => item.id === action.workspaceId);
      if (!item) return;
      switch (action.type) {
        case "open":
          await handleWorkspacePress(item.id);
          return;
        case "openInNewWindow":
          await sharedOpen.openInNewWindow(item.id);
          return;
        case "delete":
          await deleteWorkspaces([item]);
          return;
        case "edit":
          openEditWorkspaceSheet(item);
          return;
        case "relocate":
          location.open(item, "relocate");
          return;
        case "rebind":
          location.open(item, "rebind");
          return;
        case "details":
          setDetailsWorkspace(item);
          setIsWorkspaceDetailsSheetOpen(true);
          return;
        case "reveal":
          try {
            const path = await workspace.nativeRootPath(item.id);
            if (!path) throw new Error("此工作区不提供本地文件夹路径");
            await fs.showInFolder(path);
          } catch (error) {
            toast.error(`打开所在文件夹失败：${getErrorMessage(error, "未知错误")}`);
          }
          return;
      }
    }
    switch (action.type) {
      case "create":
        openCreateWorkspaceSheet();
        return;
      case "openFolder":
        await openFolder();
        return;
      case "scan":
        await scanWorkspaces();
        return;
      case "refresh":
        await handleMenuRefresh();
        return;
      case "pullRefresh":
        await handlePullToRefresh();
        return;
      case "finishSelection":
        finishWorkspaceSelection();
        return;
      case "toggleSelectAll":
        toggleSelectAllWorkspaces();
        return;
      case "toggleSelection":
        toggleWorkspaceSelectionMode();
        return;
      case "openSort":
        workspaceSortSelectRef.current?.open();
        return;
      case "openGroup":
        if (!isGroupModeDisabled) workspaceGroupModeSelectRef.current?.open();
        return;
      case "sort":
        await changeWorkspaceSortValue(action.value);
        return;
      case "group":
        await changeWorkspaceGroupMode(action.value);
        return;
      case "select":
        handleSelectedWorkspaceIdsChange(
          action.ids.filter((id) => workspaces.some((item) => item.id === id)),
        );
        return;
      case "deleteSelected":
        await deleteWorkspaces(selectedWorkspaces);
        return;
      case "editSelected":
        if (selectedWorkspaces.length === 1) openEditWorkspaceSheet(selectedWorkspaces[0]);
        return;
    }
  };
  useWorkspaceSelectDialogBridge(nativeRequestId, viewModel, handleViewAction);

  return (
    <>
      {!nativeRequestId ? (
        <WorkspaceSelectView model={viewModel} onAction={handleViewAction} />
      ) : null}
      <WorkspaceSortSelect
        onOpenChange={setIsWorkspaceSortSelectOpen}
        onValueChange={(nextValue) => {
          void changeWorkspaceSortValue(nextValue);
        }}
        open={isWorkspaceSortSelectOpen}
        selectRef={workspaceSortSelectRef}
        value={workspaceSortValue}
      />
      <WorkspaceGroupModeSelect
        onOpenChange={setIsWorkspaceGroupModeSelectOpen}
        onValueChange={(nextValue) => {
          void changeWorkspaceGroupMode(nextValue);
        }}
        open={isWorkspaceGroupModeSelectOpen}
        selectRef={workspaceGroupModeSelectRef}
        value={effectiveGroupMode}
      />
      <CreateWorkspaceSheet
        displayName={displayName}
        isCreating={isCreatingWorkspace}
        onDisplayNameChange={setDisplayName}
        onNativeResult={(result) => {
          if (!result || typeof result !== "object" || Array.isArray(result)) return;
          if (
            !("displayName" in result) ||
            typeof result.displayName !== "string" ||
            !("providerId" in result) ||
            typeof result.providerId !== "string" ||
            !("isManaged" in result) ||
            typeof result.isManaged !== "boolean"
          )
            return;
          void createWorkspace(result as DialogWindowResultMap["workspace.create"]);
        }}
        onOpenChange={setIsCreateWorkspaceSheetOpen}
        onSubmit={() => {
          void createWorkspace();
        }}
        open={isCreateWorkspaceSheetOpen}
        target={createTarget}
      />
      <EditWorkspaceSheet
        displayName={editedWorkspaceName}
        isUpdating={isUpdatingWorkspace}
        onDisplayNameChange={setEditedWorkspaceName}
        onNativeResult={(result) => {
          if (
            !result ||
            typeof result !== "object" ||
            Array.isArray(result) ||
            !("action" in result)
          )
            return;
          if (
            result.action === "save" &&
            "displayName" in result &&
            typeof result.displayName === "string"
          ) {
            void updateWorkspace(result.displayName);
          } else if (result.action === "relocate" && editingWorkspace) {
            setIsEditWorkspaceSheetOpen(false);
            location.open(editingWorkspace, "relocate");
          } else if (result.action === "rebind" && editingWorkspace) {
            setIsEditWorkspaceSheetOpen(false);
            location.open(editingWorkspace, "rebind");
          }
        }}
        onOpenChange={handleEditWorkspaceSheetOpenChange}
        onSubmit={() => {
          void updateWorkspace();
        }}
        open={isEditWorkspaceSheetOpen}
        workspaceId={editingWorkspace?.id}
        onRelocate={() => {
          if (!editingWorkspace) return;
          setIsEditWorkspaceSheetOpen(false);
          location.open(editingWorkspace, "relocate");
        }}
        onRebind={() => {
          if (!editingWorkspace) return;
          setIsEditWorkspaceSheetOpen(false);
          location.open(editingWorkspace, "rebind");
        }}
      />
      <WorkspaceLocationSheet location={location} />
      <WorkspaceDetailsSheet
        onOpenChange={setIsWorkspaceDetailsSheetOpen}
        open={isWorkspaceDetailsSheetOpen}
        workspaceItem={detailsWorkspace}
      />
    </>
  );
}
