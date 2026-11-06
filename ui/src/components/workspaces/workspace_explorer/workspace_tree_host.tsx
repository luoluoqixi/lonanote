import { type Href, useRouter } from "expo-router";
import {
  ArrowDownWideNarrow,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ClipboardPaste,
  Copy,
  ExternalLink,
  FileInput,
  FilePlus2,
  Files,
  FolderInput,
  FolderOpen,
  FolderPlus,
  Info,
  Pencil,
  RefreshCw,
  Scissors,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  ContextMenu,
  Dropdown,
  type SelectHandle,
  Tooltip,
  confirmNative,
  useUiTheme,
} from "rn-ui-kit";

import { fs } from "@/api/commands/fs";
import { clipboard } from "@/api/commands/system/clipboard";
import { openExternalFile } from "@/api/commands/utils";
import {
  type StorageCapabilities,
  type WorkspaceIndexEntry,
  workspaceFile,
} from "@/api/commands/workspace";
import { detectWorkspaceFileKind, getFileMimeType, getFileName } from "@/api/common";
import { isDesktop } from "@/api/common/platform";
import {
  getDefaultWorkspaceEntryName,
  getWorkspaceEntryCreateParent,
} from "@/api/common/utils/workspace_entry_name";
import { useEditorSession } from "@/hooks/editor";
import { useLayoutMode } from "@/hooks/layout";
import { useMediaNavigation } from "@/hooks/media";
import { useUiPreferences } from "@/hooks/settings";
import { useToast } from "@/hooks/ui";
import {
  useWorkspaceEditorSession,
  useWorkspaceExplorer,
  useWorkspaceState,
} from "@/hooks/workspace";
import { useWorkspaceFileActions } from "@/hooks/workspace/use_workspace_file_actions";
import { useWorkspaceTransfers } from "@/hooks/workspace/use_workspace_transfers";
import { workspaceExplorerStore } from "@/stores/workspace/workspace_explorer_runtime";

import { CreateWorkspaceEntrySheet } from "./create_workspace_entry_sheet";
import { RenameWorkspaceEntrySheet } from "./rename_workspace_entry_sheet";
import { WorkspaceTree } from "./tree/tree";
import { flattenVisibleRows, selectTreePath } from "./tree/tree_model";
import type { TreeHandle, TreeSelectionMode, WorkspaceTreeNodeRow } from "./tree/tree_types";
import { WorkspaceEntryDetailsSheet } from "./workspace_entry_details_sheet";
import { createWorkspaceExplorerMenu } from "./workspace_explorer_menu";
import {
  WORKSPACE_EXPLORER_SORT_GROUPS,
  WorkspaceExplorerSortSelect,
  isWorkspaceExplorerSortValue,
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
}: {
  workspaceId: string;
  onSelectWorkspace?: () => void;
}) {
  const router = useRouter();
  const theme = useUiTheme();
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";
  const { activeEditorId, editorsById, documentsById, viewersById, openViewer } =
    useEditorSession();
  const activeRef = activeEditorId
    ? (viewersById[activeEditorId]?.ref ??
      documentsById[editorsById[activeEditorId]?.documentId]?.ref)
    : null;
  const activePath =
    activeRef?.kind === "workspaceFile" && activeRef.workspaceId === workspaceId
      ? activeRef.filePath
      : null;
  const { toast } = useToast();
  const explorer = useWorkspaceExplorer({ workspaceId, mode: "tree" });
  const fileActions = useWorkspaceFileActions();
  const transfers = useWorkspaceTransfers(workspaceId);
  const { state: workspaceState } = useWorkspaceState(workspaceId);
  const { preferences, updateAndSave } = useUiPreferences();
  const { openNoteEditor } = useWorkspaceEditorSession(workspaceId);
  const { setMediaSequence } = useMediaNavigation();
  const [nativePathAvailable, setNativePathAvailable] = useState(false);
  useEffect(() => {
    let current = true;
    if (isDesktop())
      void workspaceFile
        .nativePath(workspaceId, "")
        .then((path) => {
          if (current) setNativePathAvailable(Boolean(path));
        })
        .catch(() => {
          if (current) setNativePathAvailable(false);
        });
    return () => {
      current = false;
    };
  }, [workspaceId, explorer.epoch]);
  const [capabilities, setCapabilities] =
    useState<Pick<StorageCapabilities, keyof typeof noCapabilities>>(noCapabilities);
  const [create, setCreate] = useState<{
    parent: string;
    kind: "note" | "directory";
    epoch: number;
  } | null>(null);
  const [rename, setRename] = useState<{ path: string; epoch: number } | null>(null);
  const [name, setName] = useState("");
  const createRequest = useRef(0);
  useEffect(
    () => () => {
      createRequest.current += 1;
    },
    [workspaceId, explorer.epoch],
  );
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<WorkspaceIndexEntry | null>(null);
  const detailsRequest = useRef(0);
  useEffect(() => {
    setDetails(null);
    return () => {
      detailsRequest.current += 1;
    };
  }, [workspaceId, explorer.epoch]);
  const tree = useRef<TreeHandle>(null);
  const treeActivatedEditor = useRef<{ id: string; path: string } | null>(null);
  const syncActivePath = useEffectEvent((path: string) => {
    const source = treeActivatedEditor.current;
    treeActivatedEditor.current = null;
    // 从文件树打开时已完成选择，不再反向定位或重新读取目录。
    if (source?.id === activeEditorId && source.path === path) return;
    const visible = rows.some((row) => row.kind === "node" && row.path === path);
    if (visible) {
      explorer.setSelection([path], path, path);
      tree.current?.scrollToNode(path);
    } else {
      void explorer.revealPath(path).catch(() => undefined);
    }
  });
  useEffect(() => {
    if (desktop && activePath) syncActivePath(activePath);
    else treeActivatedEditor.current = null;
    // 只跟随活动文件变化，不因键盘浏览或目录刷新而抢回文件树焦点。
  }, [desktop, activeEditorId, activePath, workspaceId]);
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
        treeActivatedEditor.current = { id: openNoteEditor(row.path), path: row.path };
        return;
      }
      if (layoutMode === "desktop") {
        const id = openViewer(
          { kind: "workspaceFile", workspaceId, filePath: row.path },
          kind === "image" || kind === "video" || kind === "pdf" ? kind : "unknown",
        );
        treeActivatedEditor.current = { id, path: row.path };
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
      layoutMode,
      openViewer,
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
      const request = ++createRequest.current;
      const epoch = explorer.epoch;
      void workspaceFile
        .list(workspaceId, parent)
        .then((entries) => {
          if (
            request !== createRequest.current ||
            workspaceExplorerStore.getState().workspaces[workspaceId]?.epoch !== epoch
          )
            return;
          setName(getDefaultWorkspaceEntryName(entries, kind));
          setCreate({ parent, kind, epoch });
        })
        .catch((error) => {
          if (request === createRequest.current)
            toast.error("无法读取目标文件夹", { description: String(error) });
        });
    },
    [explorer.epoch, workspaceId, toast],
  );
  const createParent = getWorkspaceEntryCreateParent(
    nodeFor(
      explorer.selectedPaths.includes(explorer.focusedPath ?? "")
        ? explorer.focusedPath!
        : (explorer.selectedPaths[0] ?? ""),
    ),
  );
  const menuItems = useCallback(
    (path: string) => {
      const entry = nodeFor(path);
      const targets =
        path !== "" && explorer.selectedPaths.includes(path) ? explorer.selectedPaths : [path];
      return createWorkspaceExplorerMenu({
        workspaceId,
        epoch: explorer.epoch,
        targetPaths: targets,
        targetDirectory:
          path === "" || entry?.fileType === "directory"
            ? path
            : path.split("/").slice(0, -1).join("/"),
        capabilities,
        desktop,
        canPaste: transfers.canPaste,
        nativePathAvailable,
        expanded: explorer.expandedPaths.includes(path),
        actions: {
          transfer: transfers.choose,
          recordClipboard: transfers.record,
          paste: transfers.paste,
          isCurrent: (id, epoch, paths) =>
            workspaceExplorerStore.getState().workspaces[id]?.epoch === epoch &&
            paths.every((p) => p === "" || Boolean(nodeFor(p))),
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
                isLoading: false,
              });
          },
          create: openCreate,
          openExternal: (p) => {
            void workspaceFile
              .nativePath(workspaceId, p)
              .then((nativePath) => {
                if (nativePath) return openExternalFile(nativePath, getFileMimeType(nativePath));
              })
              .catch((error) =>
                toast.error("无法在其他应用中打开", { description: String(error) }),
              );
          },
          setExpanded: (path, expanded) => {
            void explorer.setExpanded(path, expanded).catch((error) =>
              toast.error(expanded ? "展开文件夹失败" : "折叠文件夹失败", {
                description: String(error),
              }),
            );
          },
          rename: (p) => {
            setName(getFileName(p));
            setRename({ path: p, epoch: explorer.epoch });
          },
          remove: (paths) => {
            void remove(paths);
          },
          details: (p) => {
            const request = ++detailsRequest.current;
            if (p !== "") {
              setDetails(nodeFor(p) ?? null);
              return;
            }
            void workspaceFile
              .metadata(workspaceId, p)
              .then((metadata) => {
                if (
                  request !== detailsRequest.current ||
                  workspaceExplorerStore.getState().workspaces[workspaceId]?.epoch !==
                    explorer.epoch
                )
                  return;
                setDetails({
                  path: p,
                  fileType: "directory",
                  size: metadata.size,
                  createTime: metadata.createdAt,
                  lastModifiedTime: metadata.modifiedAt,
                });
              })
              .catch((error) => {
                if (request === detailsRequest.current)
                  toast.error("无法读取详情", { description: String(error) });
              });
          },
          select: (paths) => {
            explorer.setSelectionMode(true);
            explorer.setSelection(paths, path, path);
          },
          refresh,
          reveal: (p) => {
            void workspaceFile
              .nativePath(workspaceId, p)
              .then((nativePath) => {
                if (nativePath) return fs.showInFolder(nativePath);
              })
              .catch((error) => toast.error("无法显示文件", { description: String(error) }));
          },
          copyPath: (p, absolute) => {
            void (absolute ? workspaceFile.nativePath(workspaceId, p) : Promise.resolve(p || "."))
              .then((value) => {
                if (value) {
                  toast.success(`${value}`);
                  return clipboard.writeText(value);
                }
              })
              .catch((error) => toast.error("复制路径失败", { description: String(error) }));
          },
        },
      }).map((item) => {
        const Icon = new Map<string, typeof FilePlus2>([
          ["open", FileInput],
          ["open-external", ExternalLink],
          ["expand", ChevronRight],
          ["collapse", ChevronDown],
          ["details", Info],
          ["create-note", FilePlus2],
          ["create-directory", FolderPlus],
          ["reveal", FolderOpen],
          ["move-to", FolderInput],
          ["copy-to", Files],
          ["cut", Scissors],
          ["copy", Copy],
          ["paste", ClipboardPaste],
          ["copy-absolute", Copy],
          ["copy-relative", Copy],
          ["rename", Pencil],
          ["delete", Trash2],
        ]).get(item.value);
        return Icon
          ? {
              ...item,
              icon: (
                <Icon
                  size={14}
                  color={item.destructive ? theme.destructive : theme.mutedForeground}
                />
              ),
            }
          : item;
      });
    },
    [
      theme,
      transfers,
      desktop,
      nativePathAvailable,
      toast,
      nodeFor,
      explorer.epoch,
      explorer.expandedPaths,
      explorer.setExpanded,
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
  const changeSort = (value: string) => {
    if (!isWorkspaceExplorerSortValue(value)) return;
    void updateAndSave((p) => ({
      ...p,
      workspaceExplorer: { ...p.workspaceExplorer, sortValue: value },
    })).catch(() => toast.error("保存排序失败"));
  };
  const treeContent = (
    <View style={styles.root}>
      <WorkspaceTree
        workspaceId={workspaceId}
        cutPaths={transfers.cutPaths}
        ref={tree}
        epoch={explorer.epoch}
        rows={rows}
        expandedPaths={explorer.expandedPaths}
        selectedPaths={explorer.selectedPaths}
        focusedPath={explorer.focusedPath}
        activePath={activePath}
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
    </View>
  );
  return (
    <View style={styles.root}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={styles.heading} className="text-foreground font-semibold" numberOfLines={1}>
          {workspaceState?.displayName ?? "资源浏览器"}
        </Text>
        <View style={styles.headerActions}>
          {desktop ? (
            <Dropdown
              contentSize="sm"
              contentProps={{ align: "start" }}
              items={WORKSPACE_EXPLORER_SORT_GROUPS.flatMap((group) =>
                group.items.map((item) => ({
                  value: item.value,
                  label: item.label,
                  checkbox: true,
                  selected: item.value === preferences.workspaceExplorer.sortValue,
                  onPress: () => changeSort(item.value),
                })),
              )}
              nativeTrigger
              nativeTriggerIcon="none"
              nativeTriggerContainerStyle={{
                padding: 0,
                paddingHorizontal: 0,
                gap: 0,
              }}
              nativeTriggerProps={{
                accessibilityLabel: "工作区操作",
                size: "2xs",
                style: { width: 24, height: 28, padding: 0 },
              }}
              triggerLabel={
                <ArrowDownWideNarrow size={15} strokeWidth={1.6} color={theme.mutedForeground} />
              }
            />
          ) : null}
          {(
            [
              ["排序", ArrowDownWideNarrow, () => sort.current?.open(), false],
              [
                "新建笔记",
                FilePlus2,
                () => openCreate(createParent, "note"),
                !capabilities.canWrite,
              ],
              [
                "新建文件夹",
                FolderPlus,
                () => openCreate(createParent, "directory"),
                !capabilities.canCreateDirectory,
              ],
              ["刷新", RefreshCw, refresh, false],
              ["全部折叠", ChevronsDownUp, explorer.collapseAll, false],
            ] as const
          )
            .filter(([label]) => !desktop || label !== "排序")
            .map(([label, Icon, onPress, disabled]) => (
              <Tooltip key={label} content={label} openOnFocus={false}>
                <Button
                  aria-label={label}
                  variant="icon"
                  size="xs"
                  buttonSize={{ width: 24, height: 28 }}
                  style={{ minWidth: 24, minHeight: 28, padding: 0 }}
                  disabled={disabled}
                  onPress={onPress}
                >
                  <Icon size={15} strokeWidth={1.6} color={theme.mutedForeground} />
                </Button>
              </Tooltip>
            ))}
        </View>
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
      {desktop ? (
        <ContextMenu
          native={false}
          style={styles.root}
          contentSize="sm"
          items={menuItems("")}
          triggerProps={{ style: styles.root }}
          trigger={treeContent}
        />
      ) : (
        treeContent
      )}
      <WorkspaceExplorerSortSelect
        selectRef={sort}
        value={preferences.workspaceExplorer.sortValue}
        onValueChange={changeSort}
      />
      <CreateWorkspaceEntrySheet
        open={Boolean(create && create.epoch === explorer.epoch)}
        onOpenChange={(open) => {
          if (!open) setCreate(null);
        }}
        entryKind={create?.kind ?? "note"}
        parentPath={create?.parent ?? ""}
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
        rootName={workspaceState?.displayName}
        onOpenChange={(open) => {
          if (!open) {
            detailsRequest.current += 1;
            setDetails(null);
          }
        }}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, minWidth: 0 },
  header: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  heading: { flex: 1, minWidth: 0, fontSize: 12, paddingVertical: 8 },
  headerActions: { flexDirection: "row", alignItems: "center", flexShrink: 0 },
  toolbar: { flexDirection: "row", gap: 4, alignItems: "center", padding: 4, flexWrap: "wrap" },
});
