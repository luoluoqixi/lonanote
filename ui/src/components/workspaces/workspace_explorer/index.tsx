import { type Href, Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SelectHandle, confirmNative } from "rn-ui-kit";

import {
  type FileNode,
  type FileTreeSortType,
  workspace,
  workspaceFile,
  workspaceIndex,
} from "@/api/commands/workspace";
import { detectWorkspaceFileKind, getFileName, os } from "@/api/common";
import { useToast } from "@/hooks/ui";
import {
  useCurrentWorkspaceId,
  useWorkspaceEditorSession,
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
  DEFAULT_WORKSPACE_EXPLORER_GROUP_MODE,
  DEFAULT_WORKSPACE_EXPLORER_SORT_VALUE,
  type WorkspaceExplorerGroupMode,
  WorkspaceExplorerGroupModeSelect,
  WorkspaceExplorerSortSelect,
  type WorkspaceExplorerSortValue,
  sortWorkspaceExplorerEntries,
} from "./workspace_explorer_sort";
import { useWorkspaceExplorerToolbar } from "./workspace_explorer_toolbar_host";

export type WorkspaceExplorerMode = "directory" | "tree";

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

function normalizeGroupMode(value: string | string[] | undefined): WorkspaceExplorerGroupMode {
  const groupMode = Array.isArray(value) ? value[0] : value;
  return groupMode === "none" ? "none" : DEFAULT_WORKSPACE_EXPLORER_GROUP_MODE;
}

export function WorkspaceExplorer() {
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
  const { groupMode: initialGroupMode, path } = useLocalSearchParams<{
    groupMode?: string | string[];
    path?: string | string[];
  }>();
  const { toast } = useToast();
  const { openNoteEditor } = useWorkspaceEditorSession(workspaceId);
  const { refresh: refreshWorkspace, state: workspaceState } = useWorkspaceState(workspaceId);
  const currentPath = (Array.isArray(path) ? path[0] : path) ?? "";
  const [entries, setEntries] = useState<FileNode[]>([]);
  const [sortValue, setSortValue] = useState<WorkspaceExplorerSortValue>(
    DEFAULT_WORKSPACE_EXPLORER_SORT_VALUE,
  );
  const [groupMode, setGroupMode] = useState<WorkspaceExplorerGroupMode>(
    normalizeGroupMode(initialGroupMode),
  );
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
  const requestIdRef = useRef(0);
  const sortSelectRef = useRef<SelectHandle>(null);
  const groupModeSelectRef = useRef<SelectHandle>(null);
  const tracksNavigationBarScrollEdge = os() === "ios";

  const loadEntries = useCallback(
    async (minimumDurationMs = 0) => {
      const requestId = ++requestIdRef.current;
      const startedAt = Date.now();
      if (minimumDurationMs === 0) {
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

  useEffect(() => {
    if (workspaceState?.settings.fileTreeSortType) {
      setSortValue(workspaceState.settings.fileTreeSortType);
    }
  }, [workspaceState?.settings.fileTreeSortType]);

  const sortedEntries = useMemo(
    () => sortWorkspaceExplorerEntries(entries, sortValue),
    [entries, sortValue],
  );
  const title = currentPath ? getFileName(currentPath) : (workspaceState?.displayName ?? "工作区");
  const areAllEntriesSelected =
    entries.length > 0 && entries.every((entry) => selectedEntryPaths.includes(entry.path));
  const selectedEntries = useMemo(
    () => entries.filter((entry) => selectedEntryPaths.includes(entry.path)),
    [entries, selectedEntryPaths],
  );
  const isUpdatingEntries = isRenamingEntry || isDeletingEntries;

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

  const createEntry = useCallback(async () => {
    if (isCreatingEntry) {
      return;
    }

    const trimmedName = createEntryName.trim();
    const validationError = validateEntryName(trimmedName);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const normalizedName =
      createEntryKind === "note" && !trimmedName.toLocaleLowerCase().endsWith(".md")
        ? `${trimmedName}.md`
        : trimmedName;
    const path = joinWorkspacePath(currentPath, normalizedName);
    setIsCreatingEntry(true);

    try {
      if (await workspaceFile.exists(workspaceId, path)) {
        toast.error(`“${normalizedName}”已存在`);
        return;
      }

      if (createEntryKind === "note") {
        await workspaceFile.writeText(workspaceId, path, "", {
          createParent: false,
          overwrite: false,
        });
      } else {
        await workspaceFile.createDirectory(workspaceId, path);
      }

      setIsCreateEntrySheetOpen(false);
      await loadEntries();
      toast.success(createEntryKind === "note" ? "笔记已创建" : "文件夹已创建");
    } catch (error) {
      console.error("[workspace-explorer] create entry failed", error);
      toast.error(
        getErrorMessage(error, createEntryKind === "note" ? "创建笔记失败" : "创建文件夹失败"),
      );
    } finally {
      setIsCreatingEntry(false);
    }
  }, [
    createEntryKind,
    createEntryName,
    currentPath,
    isCreatingEntry,
    loadEntries,
    toast,
    workspaceId,
  ]);

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
          params: { groupMode, path: entry.path },
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
    [groupMode, openNoteEditor, router, toast],
  );

  const changeSortValue = useCallback(
    async (nextSortValue: FileTreeSortType) => {
      const previousSortValue = sortValue;
      setSortValue(nextSortValue);
      setIsSortSelectOpen(false);

      if (!workspaceState) {
        return;
      }

      try {
        await workspace.setSettings(workspaceId, {
          ...workspaceState.settings,
          fileTreeSortType: nextSortValue,
        });
        await refreshWorkspace();
      } catch (error) {
        console.error("[workspace-explorer] update sort setting failed", error);
        setSortValue(previousSortValue);
        toast.error(getErrorMessage(error, "保存排序方式失败"));
      }
    },
    [refreshWorkspace, sortValue, toast, workspaceId, workspaceState],
  );

  const finishSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedEntryPaths([]);
  }, []);

  useWorkspaceExplorerToolbar({
    canGoBack: currentPath.length > 0,
    isSelectionMode,
    isUpdating: isUpdatingEntries,
    onCreateDirectory: () => openCreateEntrySheet("directory"),
    onCreateNote: () => openCreateEntrySheet("note"),
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
        isSelectionMode={isSelectionMode}
        onCreateDirectory={() => openCreateEntrySheet("directory")}
        onCreateNote={() => openCreateEntrySheet("note")}
        onFinishSelection={finishSelection}
        onOpenGroupMode={() => groupModeSelectRef.current?.open()}
        onOpenSort={() => sortSelectRef.current?.open()}
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
        groupMode={groupMode}
        hasError={hasError}
        isLoading={isLoading}
        isSelectionMode={isSelectionMode}
        isUpdating={isUpdatingEntries}
        onDeleteEntry={(entry) => {
          void deleteEntries([entry]);
        }}
        onEditEntry={openRenameEntrySheet}
        onEntryPress={openEntry}
        onRefresh={() => loadEntries(300)}
        onSelectedEntryPathsChange={(selectedIds) => {
          setSelectedEntryPaths(selectedIds.filter((id): id is string => typeof id === "string"));
        }}
        selectedEntryPaths={selectedEntryPaths}
        sortValue={sortValue}
        tracksNavigationBarScrollEdge={tracksNavigationBarScrollEdge}
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
          setGroupMode(nextValue);
          setIsGroupModeSelectOpen(false);
        }}
        open={isGroupModeSelectOpen}
        selectRef={groupModeSelectRef}
        value={groupMode}
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
