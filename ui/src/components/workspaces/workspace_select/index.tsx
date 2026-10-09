import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SelectHandle, confirmNative } from "rn-ui-kit";

import {
  type StorageProviderId,
  type WorkspaceListItem,
  type WorkspaceSnapshot,
  workspace,
} from "@/api/commands/workspace";
import { isSystemLocaleCN, os } from "@/api/common";
import { useAndroidDoubleBackToExit } from "@/hooks/navigation";
import { useUiPreferences } from "@/hooks/settings";
import { useToast } from "@/hooks/ui";
import { useWorkspaceNavigation, useWorkspaceSession } from "@/hooks/workspace";

import { CreateWorkspaceSheet } from "./create_workspace_sheet";
import { EditWorkspaceSheet } from "./edit_workspace_sheet";
import { WorkspaceDetailsSheet } from "./workspace_details_sheet";
import { type WorkspaceGroupMode, WorkspaceGroupModeSelect } from "./workspace_group";
import { WorkspaceSelectHeader } from "./workspace_select_header";
import { WorkspaceSelectList } from "./workspace_select_list";
import { WorkspaceSelectionToolbar } from "./workspace_selection_toolbar";
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

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
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
  const { toast } = useToast();
  const { resetToWorkspace } = useWorkspaceNavigation();
  const { currentWorkspaceId, setCurrentWorkspaceId } = useWorkspaceSession();
  const { preferences, updateAndSave: updateUiPreferencesAndSave } = useUiPreferences();
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
  const [isScanningWorkspaces, setIsScanningWorkspaces] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreateWorkspaceSheetOpen, setIsCreateWorkspaceSheetOpen] = useState(false);
  const workspaceSortSelectRef = useRef<SelectHandle>(null);
  const workspaceGroupModeSelectRef = useRef<SelectHandle>(null);
  const [displayName, setDisplayName] = useState("");
  const [storageProviderIds, setStorageProviderIds] = useState<StorageProviderId[]>([]);
  const [storageProviderId, setStorageProviderId] = useState<StorageProviderId | null>(null);
  const [storageProviderError, setStorageProviderError] = useState<string | null>(null);
  const [isLoadingStorageProviders, setIsLoadingStorageProviders] = useState(false);
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceListItem | null>(null);
  const [editedWorkspaceName, setEditedWorkspaceName] = useState("");
  const [isEditWorkspaceSheetOpen, setIsEditWorkspaceSheetOpen] = useState(false);
  const [detailsWorkspace, setDetailsWorkspace] = useState<WorkspaceListItem | null>(null);
  const [isWorkspaceDetailsSheetOpen, setIsWorkspaceDetailsSheetOpen] = useState(false);
  const [isUpdatingWorkspace, setIsUpdatingWorkspace] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  const requestIdRef = useRef(0);
  const storageProviderRequestIdRef = useRef(0);
  const currentOs = os();
  const usesNativeIosHeader = currentOs === "ios";
  const tracksNavigationBarScrollEdge = usesNativeIosHeader || currentOs === "android";

  const refreshWorkspaces = useCallback(async (minimumDurationMs = 0) => {
    const requestId = ++requestIdRef.current;
    const startedAt = Date.now();

    try {
      const records = await workspace.list();
      await waitForMinimumDuration(startedAt, minimumDurationMs);

      if (requestId === requestIdRef.current) {
        setWorkspaces(records);
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
  }, []);

  const handlePullToRefresh = useCallback(
    () => refreshWorkspaces(MIN_PULL_TO_REFRESH_DURATION_MS),
    [refreshWorkspaces],
  );

  const scanWorkspaces = useCallback(async () => {
    if (isScanningWorkspaces) {
      return;
    }

    setIsScanningWorkspaces(true);
    try {
      const result = await workspace.scanManaged();
      await refreshWorkspaces();
      if (result.registeredCount > 0) {
        toast.success(`已新增 ${result.registeredCount} 个工作区`);
        return;
      }
      const problemCount = result.bindingConflictCount + result.invalidCount;
      if (problemCount > 0) {
        toast.warning(`未发现可新增的工作区，已跳过 ${problemCount} 个异常目录`);
      } else {
        toast.success("未发现新的工作区");
      }
    } catch (error) {
      console.error("[workspace-select] scan managed workspaces failed", error);
      toast.error(getErrorMessage(error, "扫描工作区失败"));
    } finally {
      setIsScanningWorkspaces(false);
    }
  }, [isScanningWorkspaces, refreshWorkspaces, toast]);

  const loadManagedStorageProviders = useCallback(async () => {
    const requestId = ++storageProviderRequestIdRef.current;
    setIsLoadingStorageProviders(true);
    setStorageProviderError(null);

    try {
      const nextStorageProviderIds = await workspace.listManagedStorageProviderIds();

      if (requestId === storageProviderRequestIdRef.current) {
        setStorageProviderIds(nextStorageProviderIds);
        setStorageProviderId((currentProviderId) =>
          currentProviderId && nextStorageProviderIds.includes(currentProviderId)
            ? currentProviderId
            : (nextStorageProviderIds[0] ?? null),
        );
      }
    } catch (error) {
      console.error("[workspace-select] load managed storage providers failed", error);

      if (requestId === storageProviderRequestIdRef.current) {
        setStorageProviderIds([]);
        setStorageProviderId(null);
        setStorageProviderError(getErrorMessage(error, "无法加载存储位置"));
      }
    } finally {
      if (requestId === storageProviderRequestIdRef.current) {
        setIsLoadingStorageProviders(false);
      }
    }
  }, []);

  const openCreateWorkspaceSheet = useCallback(() => {
    setDisplayName(getDefaultNewNoteName());
    setStorageProviderIds([]);
    setStorageProviderId(null);
    setStorageProviderError(null);
    setIsCreateWorkspaceSheetOpen(true);
    void loadManagedStorageProviders();
  }, [loadManagedStorageProviders]);

  const createWorkspace = useCallback(async () => {
    if (isCreatingWorkspace) {
      return;
    }

    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      toast.error("请输入工作区名称");
      return;
    }
    if (!storageProviderId) {
      toast.error("请选择存储位置");
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const createdWorkspace = await workspace.createManaged(storageProviderId, nextDisplayName);
      setCurrentWorkspaceId(createdWorkspace.id);
      setIsCreateWorkspaceSheetOpen(false);
      void refreshWorkspaces();
      toast.success(`已创建工作区“${createdWorkspace.displayName}”`);
    } catch (error) {
      console.error("[workspace-select] create workspace failed", error);
      toast.error(getErrorMessage(error, "创建工作区失败"));
    } finally {
      setIsCreatingWorkspace(false);
    }
  }, [
    displayName,
    isCreatingWorkspace,
    refreshWorkspaces,
    setCurrentWorkspaceId,
    storageProviderId,
    toast,
  ]);

  const openEditWorkspaceSheet = useCallback((workspaceItem: WorkspaceListItem) => {
    setEditingWorkspace(workspaceItem);
    setEditedWorkspaceName(workspaceItem.displayName);
    setIsEditWorkspaceSheetOpen(true);
  }, []);

  const handleEditWorkspaceSheetOpenChange = useCallback((open: boolean) => {
    setIsEditWorkspaceSheetOpen(open);

    if (!open) {
      setEditingWorkspace(null);
      setEditedWorkspaceName("");
    }
  }, []);

  const updateWorkspace = useCallback(async () => {
    if (!editingWorkspace || isUpdatingWorkspace) {
      return;
    }

    const nextDisplayName = editedWorkspaceName.trim();
    if (!nextDisplayName) {
      toast.error("请输入工作区名称");
      return;
    }

    setIsUpdatingWorkspace(true);
    let openedForUpdate = false;

    try {
      const isWorkspaceOpen = await workspace.isOpen(editingWorkspace.id);
      if (!isWorkspaceOpen) {
        await workspace.open(editingWorkspace.id);
        openedForUpdate = true;
      }

      const updatedWorkspace = await workspace.updateDisplayName(
        editingWorkspace.id,
        nextDisplayName,
      );
      handleEditWorkspaceSheetOpenChange(false);
      await refreshWorkspaces();
      toast.success(`已更新工作区“${updatedWorkspace.displayName}”`);
    } catch (error) {
      console.error("[workspace-select] update workspace failed", error);
      toast.error(getErrorMessage(error, "更新工作区失败"));
    } finally {
      if (openedForUpdate && currentWorkspaceId !== editingWorkspace.id) {
        try {
          await workspace.close(editingWorkspace.id);
        } catch (error) {
          console.error("[workspace-select] close workspace after update failed", error);
        }
      }

      setIsUpdatingWorkspace(false);
    }
  }, [
    currentWorkspaceId,
    editedWorkspaceName,
    editingWorkspace,
    handleEditWorkspaceSheetOpenChange,
    isUpdatingWorkspace,
    refreshWorkspaces,
    toast,
  ]);

  const deleteWorkspaces = useCallback(
    async (workspaceItems: WorkspaceListItem[]) => {
      if (isDeletingWorkspace || workspaceItems.length === 0) {
        return;
      }

      const isSingleWorkspace = workspaceItems.length === 1;
      const result = await confirmNative({
        buttons: [
          { key: "cancel", style: "cancel", text: "取消" },
          { key: "delete", style: "destructive", text: "删除" },
        ],
        message: isSingleWorkspace
          ? `删除工作区“${workspaceItems[0]?.displayName}”及其中的所有文件后无法恢复，是否继续？`
          : `删除选中的 ${workspaceItems.length} 个工作区及其中的所有文件后无法恢复，是否继续？`,
        title: "警告",
      });

      if (result !== "delete") {
        return;
      }

      setIsDeletingWorkspace(true);

      const removedWorkspaceIds: string[] = [];
      let failedCount = 0;
      let fileCleanupFailedCount = 0;

      try {
        for (const workspaceItem of workspaceItems) {
          try {
            await workspace.close(workspaceItem.id);
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
    [currentWorkspaceId, isDeletingWorkspace, refreshWorkspaces, setCurrentWorkspaceId, toast],
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

  const handleWorkspacePress = useCallback(
    async (workspaceId: string) => {
      if (
        isOpeningWorkspace ||
        isScanningWorkspaces ||
        isDeletingWorkspace ||
        isUpdatingWorkspace
      ) {
        return;
      }

      setIsOpeningWorkspace(true);
      let didResetNavigation = false;

      try {
        if (currentWorkspaceId && currentWorkspaceId !== workspaceId) {
          await workspace.close(currentWorkspaceId);
          setCurrentWorkspaceId(null);
        }

        const enterWorkspace = (openedWorkspace: WorkspaceSnapshot) => {
          setCurrentWorkspaceId(openedWorkspace.id);
          resetToWorkspace();
          didResetNavigation = true;
        };
        const openResult = await workspace.openWithDiagnostics(workspaceId);
        if (openResult.status === "opened") {
          enterWorkspace(openResult.workspace);
          return;
        }
        if (openResult.status === "directoryMissing") {
          const result = await confirmNative({
            buttons: [
              { key: "cancel", style: "cancel", text: "取消" },
              { key: "delete", style: "destructive", text: "删除记录" },
            ],
            message:
              "无法找到此工作区的文件夹。是否从工作区列表中删除这条记录？此操作不会删除任何文件。",
            title: "工作区文件夹不存在",
          });
          if (result === "delete") {
            await workspace.remove(workspaceId, false);
            await refreshWorkspaces();
            toast.success("已删除工作区记录");
          }
          return;
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
          return;
        }
        const openedWorkspace = await workspace.resolveIdMismatch(
          workspaceId,
          resolution === "generate-new-id" ? "generateNewId" : "useManifestId",
        );
        await refreshWorkspaces();
        enterWorkspace(openedWorkspace);
      } catch (error) {
        console.error("[workspace-select] open workspace failed", error);
        toast.error(getErrorMessage(error, "打开工作区失败"));
      } finally {
        if (!didResetNavigation) {
          setIsOpeningWorkspace(false);
        }
      }
    },
    [
      currentWorkspaceId,
      isDeletingWorkspace,
      isOpeningWorkspace,
      isScanningWorkspaces,
      isUpdatingWorkspace,
      refreshWorkspaces,
      resetToWorkspace,
      setCurrentWorkspaceId,
      toast,
    ],
  );

  const handleSelectedWorkspaceIdsChange = useCallback(
    (nextSelectedIds: Array<string | number>) => {
      setSelectedWorkspaceIds(nextSelectedIds.filter((id): id is string => typeof id === "string"));
    },
    [],
  );
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
    void refreshWorkspaces();

    return () => {
      requestIdRef.current += 1;
    };
  }, [refreshWorkspaces]);

  return (
    <>
      <WorkspaceSelectHeader
        areAllWorkspacesSelected={areAllWorkspacesSelected}
        canSelectWorkspaces={workspaces.length > 0}
        isGroupModeDisabled={isGroupModeDisabled}
        isScanningWorkspaces={isScanningWorkspaces}
        isWorkspaceSelectionMode={isWorkspaceSelectionMode}
        onCreateWorkspace={openCreateWorkspaceSheet}
        onFinishWorkspaceSelection={finishWorkspaceSelection}
        onOpenWorkspaceGroupMode={() => {
          if (!isGroupModeDisabled) {
            workspaceGroupModeSelectRef.current?.open();
          }
        }}
        onOpenWorkspaceSort={() => workspaceSortSelectRef.current?.open()}
        onScanWorkspaces={() => {
          void scanWorkspaces();
        }}
        onToggleSelectAllWorkspaces={toggleSelectAllWorkspaces}
        onToggleWorkspaceSelectionMode={toggleWorkspaceSelectionMode}
      />
      <WorkspaceSelectList
        groupMode={effectiveGroupMode}
        hasError={hasError}
        isDeletingWorkspace={isDeletingWorkspace}
        isLoading={isLoading}
        isOpeningWorkspace={isOpeningWorkspace}
        isScanningWorkspaces={isScanningWorkspaces}
        isUpdatingWorkspace={isUpdatingWorkspace}
        isWorkspaceSelectionMode={isWorkspaceSelectionMode}
        onCreateWorkspace={openCreateWorkspaceSheet}
        onDeleteWorkspace={(workspaceItem) => {
          void deleteWorkspaces([workspaceItem]);
        }}
        onEditWorkspace={openEditWorkspaceSheet}
        onWorkspaceDetails={(workspaceItem) => {
          setDetailsWorkspace(workspaceItem);
          setIsWorkspaceDetailsSheetOpen(true);
        }}
        onRefresh={handlePullToRefresh}
        onSelectedWorkspaceIdsChange={handleSelectedWorkspaceIdsChange}
        onWorkspacePress={(workspaceId) => {
          void handleWorkspacePress(workspaceId);
        }}
        selectedWorkspaceIds={selectedWorkspaceIds}
        sortValue={workspaceSortValue}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
        usesNativeIosHeader={usesNativeIosHeader}
        workspaces={sortedWorkspaces}
      />
      {isWorkspaceSelectionMode ? (
        <WorkspaceSelectionToolbar
          isDeleting={isDeletingWorkspace}
          isUpdating={isUpdatingWorkspace}
          onDelete={() => {
            void deleteWorkspaces(selectedWorkspaces);
          }}
          onEdit={() => {
            const selectedWorkspace = selectedWorkspaces[0];
            if (selectedWorkspaces.length === 1 && selectedWorkspace) {
              openEditWorkspaceSheet(selectedWorkspace);
            }
          }}
          selectedCount={selectedWorkspaces.length}
        />
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
        isLoadingStorageProviders={isLoadingStorageProviders}
        onDisplayNameChange={setDisplayName}
        onOpenChange={setIsCreateWorkspaceSheetOpen}
        onStorageProviderChange={setStorageProviderId}
        onSubmit={() => {
          void createWorkspace();
        }}
        open={isCreateWorkspaceSheetOpen}
        storageProviderError={storageProviderError}
        storageProviderIds={storageProviderIds}
        storageProviderId={storageProviderId}
      />
      <EditWorkspaceSheet
        displayName={editedWorkspaceName}
        isUpdating={isUpdatingWorkspace}
        onDisplayNameChange={setEditedWorkspaceName}
        onOpenChange={handleEditWorkspaceSheetOpenChange}
        onSubmit={() => {
          void updateWorkspace();
        }}
        open={isEditWorkspaceSheetOpen}
      />
      <WorkspaceDetailsSheet
        onOpenChange={setIsWorkspaceDetailsSheetOpen}
        open={isWorkspaceDetailsSheetOpen}
        workspaceItem={detailsWorkspace}
      />
    </>
  );
}
