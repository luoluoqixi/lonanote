import { type Href, Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SelectHandle, confirmNative } from "rn-ui-kit";

import { type FileNode, workspace, workspaceFile, workspaceIndex } from "@/api/commands/workspace";
import { detectWorkspaceFileKind, getFileName, os } from "@/api/common";
import { useAndroidDoubleBackToExit } from "@/hooks/navigation";
import { useUiPreferences } from "@/hooks/settings";
import { useToast } from "@/hooks/ui";
import {
  useCurrentWorkspaceId,
  useWorkspaceEditorSession,
  useWorkspaceNavigation,
  useWorkspaceSession,
  useWorkspaceState,
} from "@/hooks/workspace";

import {
  type CreateWorkspaceEntryKind,
  CreateWorkspaceEntrySheet,
} from "./create_workspace_entry_sheet";
import { RenameWorkspaceEntrySheet } from "./rename_workspace_entry_sheet";
import { WorkspaceExplorerHeader } from "./workspace_explorer_header";
import { WorkspaceExplorerList } from "./workspace_explorer_list";
import {
  type WorkspaceExplorerGroupMode,
  WorkspaceExplorerGroupModeSelect,
  WorkspaceExplorerSortSelect,
  type WorkspaceExplorerSortValue,
  isWorkspaceExplorerNameSortValue,
  sortWorkspaceExplorerEntries,
} from "./workspace_explorer_sort";
import { useWorkspaceExplorerToolbar } from "./workspace_explorer_toolbar_host";

export type WorkspaceExplorerMode = "directory" | "tree";

type LoadEntriesOptions = {
  minimumDurationMs?: number;
  showLoading?: boolean;
};

const DEFAULT_WORKSPACE_EXPLORER_MODE: WorkspaceExplorerMode = "directory";

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

function getParentPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function joinWorkspacePath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

function getAvailableEntryName(entries: FileNode[], baseName: string, extension = ""): string {
  const names = new Set(entries.map((entry) => getFileName(entry.path).toLocaleLowerCase()));
  let sequence = 1;
  let candidate = `${baseName}${extension}`;

  while (names.has(candidate.toLocaleLowerCase())) {
    sequence += 1;
    candidate = `${baseName} ${sequence}${extension}`;
  }

  return candidate;
}

function validateEntryName(name: string): string | null {
  if (!name) {
    return "请输入名称";
  }
  if (name === "." || name === ".." || name.includes("/") || name.includes("\\")) {
    return "名称不能包含路径分隔符";
  }

  return null;
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

export function WorkspaceExplorer() {
  useAndroidDoubleBackToExit();
  const workspaceId = useCurrentWorkspaceId();

  if (!workspaceId) {
    return <Redirect href="/" />;
  }

  return (
    <WorkspaceExplorerForWorkspace
      key={workspaceId}
      mode={DEFAULT_WORKSPACE_EXPLORER_MODE}
      workspaceId={workspaceId}
    />
  );
}

function WorkspaceExplorerForWorkspace({
  mode,
  workspaceId,
}: {
  mode: WorkspaceExplorerMode;
  workspaceId: string;
}) {
  const router = useRouter();
  const { path } = useLocalSearchParams<{
    path?: string | string[];
  }>();
  const { toast } = useToast();
  const { preferences, updateAndSave: updateUiPreferencesAndSave } = useUiPreferences();
  const { resetToWorkspaceSelect } = useWorkspaceNavigation();
  const { clearCurrentWorkspaceId } = useWorkspaceSession();
  const { openNoteEditor } = useWorkspaceEditorSession(workspaceId);
  const { state: workspaceState } = useWorkspaceState(workspaceId);
  const currentPath = (Array.isArray(path) ? path[0] : path) ?? "";
  const [entries, setEntries] = useState<FileNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedEntryPaths, setSelectedEntryPaths] = useState<string[]>([]);
  const [isSortSelectOpen, setIsSortSelectOpen] = useState(false);
  const [isGroupModeSelectOpen, setIsGroupModeSelectOpen] = useState(false);
  const [createEntryKind, setCreateEntryKind] = useState<CreateWorkspaceEntryKind>("note");
  const [createEntryName, setCreateEntryName] = useState("");
  const [isCreateEntrySheetOpen, setIsCreateEntrySheetOpen] = useState(false);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FileNode | null>(null);
  const [editedEntryName, setEditedEntryName] = useState("");
  const [isRenameEntrySheetOpen, setIsRenameEntrySheetOpen] = useState(false);
  const [isRenamingEntry, setIsRenamingEntry] = useState(false);
  const [isDeletingEntries, setIsDeletingEntries] = useState(false);
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);
  const isCreatingEntryRef = useRef(false);
  const requestIdRef = useRef(0);
  const sortSelectRef = useRef<SelectHandle>(null);
  const groupModeSelectRef = useRef<SelectHandle>(null);
  const currentOs = os();
  const usesNativeIosHeader = currentOs === "ios";
  const tracksNavigationBarScrollEdge = usesNativeIosHeader || currentOs === "android";

  const loadEntries = useCallback(
    async ({
      minimumDurationMs = 0,
      showLoading = minimumDurationMs === 0,
    }: LoadEntriesOptions = {}) => {
      const requestId = ++requestIdRef.current;
      const startedAt = Date.now();
      if (showLoading) {
        setIsLoading(true);
      }

      try {
        const node = await workspaceIndex.getNode(workspaceId, currentPath, false);
        await waitForMinimumDuration(startedAt, minimumDurationMs);
        if (requestId === requestIdRef.current) {
          setEntries(node.children ?? []);
          setHasError(false);
        }
      } catch (error) {
        await waitForMinimumDuration(startedAt, minimumDurationMs);
        if (requestId === requestIdRef.current) {
          console.error("[workspace-explorer] load entries failed", error);
          setHasError(true);
        }
        throw error;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [currentPath, workspaceId],
  );

  useEffect(() => {
    void loadEntries().catch(() => undefined);

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadEntries]);

  const sortValue = preferences.workspaceExplorer.sortValue;
  const groupMode = preferences.workspaceExplorer.groupMode;
  const isGroupModeDisabled = isWorkspaceExplorerNameSortValue(sortValue);
  const effectiveGroupMode = isGroupModeDisabled ? "none" : groupMode;

  const sortedEntries = useMemo(
    () =>
      sortWorkspaceExplorerEntries(
        entries,
        sortValue,
        preferences.workspaceExplorer.foldersFirst && effectiveGroupMode === "none",
      ),
    [effectiveGroupMode, entries, preferences.workspaceExplorer.foldersFirst, sortValue],
  );
  const title = currentPath ? getFileName(currentPath) : (workspaceState?.displayName ?? "工作区");
  const areAllEntriesSelected =
    entries.length > 0 && entries.every((entry) => selectedEntryPaths.includes(entry.path));
  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedEntryPaths.includes(entry.path)),
    [entries, selectedEntryPaths],
  );
  const isUpdatingEntries = isCreatingEntry || isRenamingEntry || isDeletingEntries;

  const openCreateEntrySheet = useCallback(
    (entryKind: CreateWorkspaceEntryKind) => {
      setCreateEntryKind(entryKind);
      setCreateEntryName(
        entryKind === "note"
          ? getAvailableEntryName(entries, "未命名笔记", ".md")
          : getAvailableEntryName(entries, "新建文件夹"),
      );
      setIsCreateEntrySheetOpen(true);
    },
    [entries],
  );

  const createWorkspaceEntry = useCallback(
    async ({
      entryKind,
      name,
      openAfterCreate,
    }: {
      entryKind: CreateWorkspaceEntryKind;
      name: string;
      openAfterCreate: boolean;
    }) => {
      if (isCreatingEntryRef.current) {
        return;
      }

      const trimmedName = name.trim();
      const validationError = validateEntryName(trimmedName);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      const normalizedName =
        entryKind === "note" && !trimmedName.toLocaleLowerCase().endsWith(".md")
          ? `${trimmedName}.md`
          : trimmedName;
      const entryPath = joinWorkspacePath(currentPath, normalizedName);
      isCreatingEntryRef.current = true;
      setIsCreatingEntry(true);

      try {
        if (await workspaceFile.exists(workspaceId, entryPath)) {
          toast.error(`“${normalizedName}”已存在`);
          return;
        }

        if (entryKind === "note") {
          await workspaceFile.writeText(workspaceId, entryPath, "", {
            createParent: false,
            overwrite: false,
          });
        } else {
          await workspaceFile.createDirectory(workspaceId, entryPath);
        }

        setIsCreateEntrySheetOpen(false);
        const successMessage = entryKind === "note" ? "笔记已创建" : "文件夹已创建";

        if (openAfterCreate) {
          void loadEntries({ showLoading: false }).catch(() => undefined);
          toast.success(successMessage);

          if (entryKind === "note") {
            const editorId = openNoteEditor(entryPath);
            router.push({
              pathname: "/editor/[editorId]",
              params: { editorId, path: entryPath },
            } as Href);
          } else {
            router.push({
              pathname: "/workspace",
              params: { path: entryPath },
            } as Href);
          }

          return;
        }

        await loadEntries();
        toast.success(successMessage);
      } catch (error) {
        console.error("[workspace-explorer] create entry failed", error);
        toast.error(
          getErrorMessage(error, entryKind === "note" ? "创建笔记失败" : "创建文件夹失败"),
        );
      } finally {
        isCreatingEntryRef.current = false;
        setIsCreatingEntry(false);
      }
    },
    [currentPath, loadEntries, openNoteEditor, router, toast, workspaceId],
  );

  const createEntry = useCallback(async () => {
    await createWorkspaceEntry({
      entryKind: createEntryKind,
      name: createEntryName,
      openAfterCreate: false,
    });
  }, [createEntryKind, createEntryName, createWorkspaceEntry]);

  const quickCreateEntry = useCallback(
    (entryKind: CreateWorkspaceEntryKind) => {
      const name =
        entryKind === "note"
          ? getAvailableEntryName(entries, "未命名笔记", ".md")
          : getAvailableEntryName(entries, "新建文件夹");
      void createWorkspaceEntry({ entryKind, name, openAfterCreate: true });
    },
    [createWorkspaceEntry, entries],
  );

  const openRenameEntrySheet = useCallback((entry: FileNode) => {
    setEditingEntry(entry);
    setEditedEntryName(getFileName(entry.path));
    setIsRenameEntrySheetOpen(true);
  }, []);

  const handleRenameEntrySheetOpenChange = useCallback((open: boolean) => {
    setIsRenameEntrySheetOpen(open);

    if (!open) {
      setEditingEntry(null);
      setEditedEntryName("");
    }
  }, []);

  const renameEntry = useCallback(async () => {
    if (!editingEntry || isRenamingEntry) {
      return;
    }

    const nextName = editedEntryName.trim();
    const validationError = validateEntryName(nextName);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const currentName = getFileName(editingEntry.path);
    if (nextName === currentName) {
      handleRenameEntrySheetOpenChange(false);
      return;
    }

    const nextPath = joinWorkspacePath(getParentPath(editingEntry.path), nextName);
    setIsRenamingEntry(true);

    try {
      if (await workspaceFile.exists(workspaceId, nextPath)) {
        toast.error(`“${nextName}”已存在`);
        return;
      }

      await workspaceFile.rename(workspaceId, editingEntry.path, nextPath);
      handleRenameEntrySheetOpenChange(false);
      setSelectedEntryPaths([]);
      setIsSelectionMode(false);
      await loadEntries();
      toast.success("名称已更新");
    } catch (error) {
      console.error("[workspace-explorer] rename entry failed", error);
      toast.error(getErrorMessage(error, "编辑名称失败"));
    } finally {
      setIsRenamingEntry(false);
    }
  }, [
    editedEntryName,
    editingEntry,
    handleRenameEntrySheetOpenChange,
    isRenamingEntry,
    loadEntries,
    toast,
    workspaceId,
  ]);

  const deleteEntries = useCallback(
    async (targetEntries: FileNode[]) => {
      if (targetEntries.length === 0 || isDeletingEntries) {
        return;
      }

      const isSingleEntry = targetEntries.length === 1;
      const result = await confirmNative({
        buttons: [
          { key: "cancel", style: "cancel", text: "取消" },
          { key: "delete", style: "destructive", text: "删除" },
        ],
        message: isSingleEntry
          ? `将从本地永久删除“${getFileName(targetEntries[0]?.path ?? "")}”，此操作无法恢复。`
          : `将从本地永久删除选中的 ${targetEntries.length} 个项目，此操作无法恢复。`,
        title: "删除本地文件",
      });

      if (result !== "delete") {
        return;
      }

      setIsDeletingEntries(true);
      let deletedCount = 0;

      try {
        for (const entry of targetEntries) {
          try {
            await workspaceFile.remove(workspaceId, entry.path, entry.fileType === "directory");
            deletedCount += 1;
          } catch (error) {
            console.error(`[workspace-explorer] delete entry ${entry.path} failed`, error);
          }
        }

        setSelectedEntryPaths([]);
        setIsSelectionMode(false);
        await loadEntries();

        if (deletedCount === targetEntries.length) {
          toast.success(isSingleEntry ? "项目已删除" : `已删除 ${deletedCount} 个项目`);
        } else if (deletedCount > 0) {
          toast.warning(
            `已删除 ${deletedCount} 个项目，${targetEntries.length - deletedCount} 个删除失败`,
          );
        } else {
          toast.error("删除失败");
        }
      } finally {
        setIsDeletingEntries(false);
      }
    },
    [isDeletingEntries, loadEntries, toast, workspaceId],
  );

  const openEntry = useCallback(
    (entry: FileNode) => {
      if (entry.fileType === "directory") {
        router.push({
          pathname: "/workspace",
          params: { path: entry.path },
        } as Href);
        return;
      }

      const fileKind = detectWorkspaceFileKind(entry.path);
      if (fileKind === "markdown" || fileKind === "text") {
        const editorId = openNoteEditor(entry.path);
        router.push({
          pathname: "/editor/[editorId]",
          params: { editorId, path: entry.path },
        } as Href);
        return;
      }
      if (fileKind === "image" || fileKind === "video") {
        router.push({
          pathname: "/media/[kind]",
          params: { kind: fileKind, path: entry.path },
        } as Href);
        return;
      }

      toast.warning("暂不支持打开此文件类型");
    },
    [openNoteEditor, router, toast],
  );

  const changeSortValue = useCallback(
    async (nextSortValue: WorkspaceExplorerSortValue) => {
      const nextGroupMode = isWorkspaceExplorerNameSortValue(nextSortValue) ? "none" : groupMode;
      setIsSortSelectOpen(false);
      setIsGroupModeSelectOpen(false);

      try {
        await updateUiPreferencesAndSave((currentPreferences) => ({
          ...currentPreferences,
          workspaceExplorer: {
            ...currentPreferences.workspaceExplorer,
            groupMode: nextGroupMode,
            sortValue: nextSortValue,
          },
        }));
      } catch (error) {
        console.error("[workspace-explorer] update sort preference failed", error);
        toast.error(getErrorMessage(error, "保存排序方式失败"));
      }
    },
    [groupMode, toast, updateUiPreferencesAndSave],
  );

  const changeGroupMode = useCallback(
    async (nextGroupMode: WorkspaceExplorerGroupMode) => {
      if (isGroupModeDisabled) {
        return;
      }

      setIsGroupModeSelectOpen(false);

      try {
        await updateUiPreferencesAndSave((currentPreferences) => ({
          ...currentPreferences,
          workspaceExplorer: {
            ...currentPreferences.workspaceExplorer,
            groupMode: nextGroupMode,
          },
        }));
      } catch (error) {
        console.error("[workspace-explorer] update group preference failed", error);
        toast.error(getErrorMessage(error, "保存分组方式失败"));
      }
    },
    [isGroupModeDisabled, toast, updateUiPreferencesAndSave],
  );

  const switchWorkspace = useCallback(async () => {
    if (isSwitchingWorkspace) {
      return;
    }

    setIsSwitchingWorkspace(true);

    try {
      await workspace.close(workspaceId);
      clearCurrentWorkspaceId();
      resetToWorkspaceSelect();
    } catch (error) {
      console.error("[workspace-explorer] close workspace before switching failed", error);
      toast.error(getErrorMessage(error, "关闭当前工作区失败"));
      setIsSwitchingWorkspace(false);
    }
  }, [clearCurrentWorkspaceId, isSwitchingWorkspace, resetToWorkspaceSelect, toast, workspaceId]);

  const finishSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedEntryPaths([]);
  }, []);

  useWorkspaceExplorerToolbar({
    canGoBack: currentPath.length > 0,
    isSelectionMode,
    isUpdating: isUpdatingEntries,
    onCreateDirectory: () => quickCreateEntry("directory"),
    onCreateNote: () => quickCreateEntry("note"),
    onDelete: () => {
      void deleteEntries(selectedEntries);
    },
    onEdit: () => {
      const selectedEntry = selectedEntries[0];
      if (selectedEntries.length === 1 && selectedEntry) {
        openRenameEntrySheet(selectedEntry);
      }
    },
    onGoBack: () => router.back(),
    selectedCount: selectedEntryPaths.length,
  });

  if (mode !== "directory") {
    return null;
  }

  return (
    <>
      <WorkspaceExplorerHeader
        areAllEntriesSelected={areAllEntriesSelected}
        canSelectEntries={entries.length > 0}
        isGroupModeDisabled={isGroupModeDisabled}
        isSelectionMode={isSelectionMode}
        isSwitchingWorkspace={isSwitchingWorkspace}
        onCreateDirectory={() => openCreateEntrySheet("directory")}
        onCreateNote={() => openCreateEntrySheet("note")}
        onFinishSelection={finishSelection}
        onOpenGroupMode={() => {
          if (!isGroupModeDisabled) {
            groupModeSelectRef.current?.open();
          }
        }}
        onOpenSort={() => sortSelectRef.current?.open()}
        onSwitchWorkspace={() => {
          void switchWorkspace();
        }}
        onToggleSelectAllEntries={() => {
          setSelectedEntryPaths(areAllEntriesSelected ? [] : entries.map((entry) => entry.path));
        }}
        onToggleSelectionMode={() => {
          setIsSelectionMode((currentValue) => !currentValue);
          setSelectedEntryPaths([]);
        }}
        title={title}
      />
      <WorkspaceExplorerList
        entries={sortedEntries}
        groupMode={effectiveGroupMode}
        hasError={hasError}
        isLoading={isLoading}
        isSelectionMode={isSelectionMode}
        isUpdating={isUpdatingEntries}
        onDeleteEntry={(entry) => {
          void deleteEntries([entry]);
        }}
        onEditEntry={openRenameEntrySheet}
        onEntryPress={openEntry}
        onRefresh={() => loadEntries({ minimumDurationMs: 300, showLoading: false })}
        onSelectedEntryPathsChange={(selectedIds) => {
          setSelectedEntryPaths(selectedIds.filter((id): id is string => typeof id === "string"));
        }}
        selectedEntryPaths={selectedEntryPaths}
        showsFloatingToolbar={preferences.workspaceExplorer.showFloatingToolbar}
        sortValue={sortValue}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
        usesNativeIosHeader={usesNativeIosHeader}
      />
      <WorkspaceExplorerSortSelect
        onOpenChange={setIsSortSelectOpen}
        onValueChange={(nextValue) => {
          void changeSortValue(nextValue);
        }}
        open={isSortSelectOpen}
        selectRef={sortSelectRef}
        value={sortValue}
      />
      <WorkspaceExplorerGroupModeSelect
        onOpenChange={setIsGroupModeSelectOpen}
        onValueChange={(nextValue) => {
          void changeGroupMode(nextValue);
        }}
        open={isGroupModeSelectOpen}
        selectRef={groupModeSelectRef}
        value={effectiveGroupMode}
      />
      <CreateWorkspaceEntrySheet
        entryKind={createEntryKind}
        isCreating={isCreatingEntry}
        name={createEntryName}
        onNameChange={setCreateEntryName}
        onOpenChange={setIsCreateEntrySheetOpen}
        onSubmit={() => {
          void createEntry();
        }}
        open={isCreateEntrySheetOpen}
      />
      <RenameWorkspaceEntrySheet
        isRenaming={isRenamingEntry}
        name={editedEntryName}
        onNameChange={setEditedEntryName}
        onOpenChange={handleRenameEntrySheetOpenChange}
        onSubmit={() => {
          void renameEntry();
        }}
        open={isRenameEntrySheetOpen}
      />
    </>
  );
}
