import { type Href, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Dropdown, type SelectHandle, confirmNative } from "rn-ui-kit";

import {
  type StorageCapabilities,
  type WorkspaceIndexEntry,
  workspaceFile,
} from "@/api/commands/workspace";
import { detectWorkspaceFileKind, getFileName } from "@/api/common";
import { useMediaNavigation } from "@/hooks/media";
import { useUiPreferences } from "@/hooks/settings";
import { useToast } from "@/hooks/ui";
import {
  useWorkspaceEditorSession,
  useWorkspaceExplorer,
  useWorkspaceState,
} from "@/hooks/workspace";
import { useWorkspaceFileActions } from "@/hooks/workspace/use_workspace_file_actions";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";

import { CreateWorkspaceEntrySheet } from "./create_workspace_entry_sheet";
import { RenameWorkspaceEntrySheet } from "./rename_workspace_entry_sheet";
import { WorkspaceTree } from "./tree/tree";
import { flattenVisibleRows, selectTreePath } from "./tree/tree_model";
import type { TreeHandle, TreeSelectionMode, WorkspaceTreeNodeRow } from "./tree/tree_types";
import { WorkspaceEntryDetailsSheet } from "./workspace_entry_details_sheet";
import { createWorkspaceExplorerMenu } from "./workspace_explorer_menu";
import {
  WorkspaceExplorerSortSelect,
  sortWorkspaceExplorerEntries,
} from "./workspace_explorer_sort";

const noCapabilities = {
  canRead: false,
  canWrite: false,
  canCreateDirectory: false,
  canDelete: false,
  canRename: false,
};

export function WorkspaceTreeHost({
  workspaceId,
  onSelectWorkspace,
}: {
  workspaceId: string;
  onSelectWorkspace?: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const explorer = useWorkspaceExplorer({ workspaceId, mode: "tree" });
  const fileActions = useWorkspaceFileActions();
  const { state: workspaceState } = useWorkspaceState(workspaceId);
  const { preferences, updateAndSave } = useUiPreferences();
  const { openNoteEditor } = useWorkspaceEditorSession(workspaceId);
  const { setMediaSequence } = useMediaNavigation();
  const [capabilities, setCapabilities] =
    useState<Pick<StorageCapabilities, keyof typeof noCapabilities>>(noCapabilities);
  const [create, setCreate] = useState<{
    parent: string;
    kind: "note" | "directory";
    epoch: number;
  } | null>(null);
  const [rename, setRename] = useState<{ path: string; epoch: number } | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<WorkspaceIndexEntry | null>(null);
  const tree = useRef<TreeHandle>(null);
  const sort = useRef<SelectHandle>(null);
  useEffect(() => {
    let current = true;
    workspaceFile
      .capabilities(workspaceId)
      .then((value) => {
        if (current) setCapabilities(value);
      })
      .catch(() => {
        if (current) setCapabilities(noCapabilities);
      });
    return () => {
      current = false;
    };
  }, [workspaceId, explorer.epoch]);
  const rows = useMemo(
    () =>
      flattenVisibleRows(explorer.directories, explorer.expandedPaths, (entries) =>
        sortWorkspaceExplorerEntries(
          entries,
          preferences.workspaceExplorer.sortValue,
          preferences.workspaceExplorer.foldersFirst,
        ),
      ),
    [
      explorer.directories,
      explorer.expandedPaths,
      preferences.workspaceExplorer.sortValue,
      preferences.workspaceExplorer.foldersFirst,
    ],
  );
  const nodeFor = useCallback(
    (path: string) =>
      Object.values(workspaceExplorerStore.getState().workspaces[workspaceId]?.directories ?? {})
        .flatMap((d) => d.snapshot?.entries ?? [])
        .find((e) => e.path === path),
    [workspaceId],
  );
  const onFocus = useCallback(
    (path: string | null) =>
      workspaceExplorerStore
        .getState()
        .setSelection(
          workspaceId,
          workspaceExplorerStore.getState().workspaces[workspaceId]?.selectedPaths ?? [],
          path,
        ),
    [workspaceId],
  );
  const select = useCallback(
    (path: string, mode: TreeSelectionMode) => {
      const selection = selectTreePath({
        rows,
        selectedPaths: explorer.selectedPaths,
        anchorPath: explorer.rangeAnchorPath,
        targetPath: path,
        mode,
      });
      explorer.setSelection(selection.selectedPaths, path, selection.anchorPath);
    },
    [rows, explorer.selectedPaths, explorer.rangeAnchorPath, explorer.setSelection],
  );
  const activate = useCallback(
    (row: WorkspaceTreeNodeRow) => {
      if (row.entry.fileType === "directory") {
        void explorer
          .setExpanded(row.path, !explorer.expandedPaths.includes(row.path))
          .catch(() => undefined);
        return;
      }
      const kind = detectWorkspaceFileKind(row.path);
      if (kind === "markdown" || kind === "text") {
        openNoteEditor(row.path);
        return;
      }
      if (kind === "image" || kind === "video") {
        const paths = rows
          .filter(
            (r) =>
              r.kind === "node" && ["image", "video"].includes(detectWorkspaceFileKind(r.path)),
          )
          .map((r) => r.path);
        setMediaSequence({ mediaPaths: paths, workspaceId });
        router.push({
          pathname: "/media/[kind]",
          params: {
            kind,
            path: row.path,
            mediaIndex: String(Math.max(0, paths.indexOf(row.path))),
          },
        } as Href);
        return;
      }
      router.push({
        pathname: kind === "pdf" ? "/pdf" : "/unknown",
        params: { path: row.path, workspaceId },
      } as Href);
    },
    [
      explorer.setExpanded,
      explorer.expandedPaths,
      openNoteEditor,
      rows,
      router,
      setMediaSequence,
      workspaceId,
    ],
  );
  const refresh = useCallback(() => {
    void explorer
      .refresh()
      .catch((error) => toast.error("刷新失败", { description: String(error) }));
  }, [explorer.refresh, toast]);
  const remove = useCallback(
    async (paths: string[]) => {
      const epoch = explorer.epoch;
      const choice = await confirmNative({
        title: "删除本地文件",
        message: `永久删除 ${paths.length} 个项目？此操作无法恢复。`,
        buttons: [
          { key: "cancel", text: "取消", style: "cancel" },
          { key: "delete", text: "删除", style: "destructive" },
        ],
      });
      if (
        choice !== "delete" ||
        workspaceExplorerStore.getState().workspaces[workspaceId]?.epoch !== epoch
      )
        return;
      await fileActions.deleteEntries({ workspaceId, paths });
    },
    [explorer.epoch, workspaceId, fileActions],
  );
  const openCreate = useCallback(
    (parent: string, kind: "note" | "directory") => {
      setName(kind === "note" ? "未命名笔记.md" : "新建文件夹");
      setCreate({ parent, kind, epoch: explorer.epoch });
    },
    [explorer.epoch],
  );
  const menuItems = useCallback(
    (path: string) => {
      const entry = nodeFor(path);
      const targets = explorer.selectedPaths.includes(path) ? explorer.selectedPaths : [path];
      return createWorkspaceExplorerMenu({
        workspaceId,
        epoch: explorer.epoch,
        targetPaths: targets,
        targetDirectory:
          entry?.fileType === "directory" ? path : path.split("/").slice(0, -1).join("/"),
        capabilities,
        actions: {
          isCurrent: (id, epoch, paths) =>
            workspaceExplorerStore.getState().workspaces[id]?.epoch === epoch &&
            paths.every((p) => Boolean(nodeFor(p))),
          open: (p) => {
            const e = nodeFor(p);
            if (e)
              activate({
                kind: "node",
                key: `node:${p}`,
                path: p,
                parentPath: p.split("/").slice(0, -1).join("/"),
                depth: 0,
                entry: e,
              });
          },
          create: openCreate,
          rename: (p) => {
            setName(getFileName(p));
            setRename({ path: p, epoch: explorer.epoch });
          },
          remove: (paths) => {
            void remove(paths);
          },
          details: (p) => setDetails(nodeFor(p) ?? null),
          select: (paths) => {
            explorer.setSelectionMode(true);
            explorer.setSelection(paths, path, path);
          },
          refresh,
        },
      });
    },
    [
      nodeFor,
      explorer.epoch,
      explorer.selectedPaths,
      explorer.setSelectionMode,
      explorer.setSelection,
      capabilities,
      workspaceId,
      activate,
      openCreate,
      remove,
      refresh,
    ],
  );
  async function submit() {
    const target = create ?? rename;
    if (
      !target ||
      busy ||
      workspaceExplorerStore.getState().workspaces[workspaceId]?.epoch !== target.epoch
    )
      return;
    setBusy(true);
    try {
      const result = create
        ? await fileActions.createEntry({
            workspaceId,
            parentPath: create.parent,
            name,
            kind: create.kind,
          })
        : await fileActions.renameEntry({
            workspaceId,
            path: rename!.path,
            nextPath: [...rename!.path.split("/").slice(0, -1), name.trim()].join("/"),
          });
      if (result.succeededPaths.length) {
        const revealed = create
          ? result.succeededPaths[0]
          : [...rename!.path.split("/").slice(0, -1), name.trim()].join("/");
        setCreate(null);
        setRename(null);
        await explorer.revealPath(revealed).catch(() => undefined);
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={styles.root}>
      <Pressable onPress={onSelectWorkspace} accessibilityLabel="切换工作区" style={styles.heading}>
        <Text className="text-foreground font-semibold" numberOfLines={1}>
          {workspaceState?.displayName ?? "工作区"}
        </Text>
      </Pressable>
      <View style={styles.toolbar}>
        <Dropdown
          triggerLabel="新建"
          items={[
            {
              value: "note",
              label: "笔记",
              disabled: !capabilities.canWrite,
              onSelect: () => openCreate("", "note"),
            },
            {
              value: "directory",
              label: "文件夹",
              disabled: !capabilities.canCreateDirectory,
              onSelect: () => openCreate("", "directory"),
            },
          ]}
        />
        <Dropdown
          triggerLabel="更多"
          items={[
            { value: "refresh", label: "刷新", onSelect: refresh },
            { value: "sort", label: "排序", onSelect: () => sort.current?.open() },
            { value: "collapse", label: "全部折叠", onSelect: explorer.collapseAll },
            {
              value: "selection",
              label: explorer.selectionMode ? "完成选择" : "多选",
              onSelect: () => explorer.setSelectionMode(!explorer.selectionMode),
            },
          ]}
        />
      </View>
      {explorer.selectionMode ? (
        <View style={styles.toolbar}>
          <Text className="text-muted-foreground">已选 {explorer.selectedPaths.length} 项</Text>
          <Button
            disabled={!capabilities.canDelete || !explorer.selectedPaths.length}
            onPress={() => {
              void remove(explorer.selectedPaths);
            }}
          >
            删除
          </Button>
          <Button onPress={() => explorer.setSelectionMode(false)}>完成</Button>
        </View>
      ) : null}
      <WorkspaceTree
        ref={tree}
        epoch={explorer.epoch}
        rows={rows}
        expandedPaths={explorer.expandedPaths}
        selectedPaths={explorer.selectedPaths}
        focusedPath={explorer.focusedPath}
        selectionMode={explorer.selectionMode}
        onSelect={select}
        onFocus={onFocus}
        onExpandedChange={explorer.setExpanded}
        onCollapseAll={explorer.collapseAll}
        onActivate={activate}
        onRetry={(p) => {
          void workspaceExplorerStore
            .getState()
            .loadDirectory(workspaceId, p, { reload: true })
            .catch(() => undefined);
        }}
        menuItems={menuItems}
      />
      {explorer.directories[""]?.snapshot?.entries.length === 0 &&
      !explorer.directories[""]?.loading ? (
        <Text className="text-muted-foreground px-3 py-2">工作区为空</Text>
      ) : null}
      <WorkspaceExplorerSortSelect
        selectRef={sort}
        value={preferences.workspaceExplorer.sortValue}
        onValueChange={(value) => {
          void updateAndSave((p) => ({
            ...p,
            workspaceExplorer: { ...p.workspaceExplorer, sortValue: value },
          })).catch(() => toast.error("保存排序失败"));
        }}
      />
      <CreateWorkspaceEntrySheet
        open={Boolean(create && create.epoch === explorer.epoch)}
        onOpenChange={(open) => {
          if (!open) setCreate(null);
        }}
        entryKind={create?.kind ?? "note"}
        name={name}
        onNameChange={setName}
        isCreating={busy}
        onSubmit={() => {
          void submit();
        }}
      />
      <RenameWorkspaceEntrySheet
        open={Boolean(rename && rename.epoch === explorer.epoch)}
        onOpenChange={(open) => {
          if (!open) setRename(null);
        }}
        name={name}
        onNameChange={setName}
        isRenaming={busy}
        onSubmit={() => {
          void submit();
        }}
      />
      <WorkspaceEntryDetailsSheet
        open={Boolean(details)}
        entry={details}
        onOpenChange={(open) => {
          if (!open) setDetails(null);
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, minWidth: 0 },
  heading: { padding: 10 },
  toolbar: { flexDirection: "row", gap: 4, alignItems: "center", padding: 4, flexWrap: "wrap" },
});
