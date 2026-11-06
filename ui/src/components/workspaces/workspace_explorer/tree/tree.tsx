import {
  ChevronDown,
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  MoreHorizontal,
} from "lucide-react-native";
import { type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Pressable, type ScrollView, StyleSheet, Text, View, VirtualizedList } from "react-native";
import { ContextMenu, type ContextMenuItemData, Dropdown, Spinner, useUiTheme } from "rn-ui-kit";

import { workspaceFile } from "@/api/commands/workspace";
import { isWeb } from "@/api/common/platform";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";
import { useLayoutMode } from "@/hooks/layout";
import { useWorkspaceResourceRevision } from "@/hooks/workspace/use_workspace_resource_revision";

import { TreeDragInput } from "./tree_drag_input";
import { isTreeDropRegion } from "./tree_drag_model";
import { TreeDragPreview } from "./tree_drag_preview";
import { TreeInput } from "./tree_input";
import { createTreeScrollCoordinator, getTreeScrollOffset } from "./tree_input_intent";
import { resolveTreeFocus } from "./tree_model";
import type {
  TreeHandle,
  TreeInputIntent,
  TreeSelectionMode,
  WorkspaceTreeNodeRow,
  WorkspaceTreeRow,
} from "./tree_types";
import { useTreeDrag } from "./use_tree_drag";

const rowId = (path: string) => `workspace-tree-${encodeURIComponent(path)}`;
type Props = {
  workspaceId: string;
  cutPaths?: string[];
  ref?: Ref<TreeHandle>;
  epoch: number;
  rows: WorkspaceTreeRow[];
  expandedPaths: string[];
  selectedPaths: string[];
  focusedPath: string | null;
  activePath?: string | null;
  selectionMode: boolean;
  canOpenFiles?: boolean;
  onMovePaths?(paths: string[], directory: string): void;
  onSelect(path: string, mode: TreeSelectionMode): void;
  onFocus(path: string | null): void;
  onExpandedChange(path: string, expanded: boolean): Promise<void>;
  onCollapseAll(): void;
  onActivate(row: WorkspaceTreeNodeRow): void;
  onRetry(path: string): void;
  menuItems(path: string): ContextMenuItemData[];
};

function TreeNode({
  workspaceId,
  resourceRevision,
  desktop,
  rowHeight,
  row,
  expanded,
  selected,
  focused,
  active,
  cut,
  dragging,
  dragActive,
  dropTarget,
  isSuppressingPress,
  onFocus,
  selectionMode,
  onSelect,
  onActivate,
  onExpandedChange,
  menuItems,
}: {
  workspaceId: string;
  resourceRevision: number;
  desktop: boolean;
  rowHeight: number;
  row: WorkspaceTreeNodeRow;
  expanded: boolean;
  selected: boolean;
  focused: boolean;
  active: boolean;
  cut: boolean;
  dragging: boolean;
  dragActive: boolean;
  dropTarget: boolean;
  isSuppressingPress(): boolean;
  onFocus: Props["onFocus"];
  selectionMode: boolean;
  onSelect: Props["onSelect"];
  onActivate: Props["onActivate"];
  onExpandedChange: Props["onExpandedChange"];
  menuItems: Props["menuItems"];
}) {
  const theme = useUiTheme();
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [resolvedPath, setResolvedPath] = useState<{
    workspaceId: string;
    path: string;
    revision: number;
    nativePath: string | null;
  } | null>(null);
  const pathIsCurrent =
    resolvedPath?.workspaceId === workspaceId &&
    resolvedPath.path === row.path &&
    resolvedPath.revision === resourceRevision;
  useEffect(() => {
    if (!desktop || !hovered || pathIsCurrent) return;
    let disposed = false;
    // 只解析实际悬浮的条目，避免目录加载时为所有行发起路径查询。
    void workspaceFile
      .nativePath(workspaceId, row.path)
      .catch(() => null)
      .then((nativePath) => {
        if (!disposed)
          setResolvedPath({ workspaceId, path: row.path, revision: resourceRevision, nativePath });
      });
    return () => {
      disposed = true;
    };
  }, [desktop, hovered, pathIsCurrent, workspaceId, row.path, resourceRevision]);
  const suppressPress = useRef(false);
  const frozenItems = useRef<ContextMenuItemData[] | null>(null);
  const currentMenuItems = menuItems(row.path);
  const folder = row.entry.fileType === "directory";
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <FilePathTooltip
      path={(pathIsCurrent ? resolvedPath.nativePath : null) ?? row.path}
      disabled={!desktop || menuOpen || dragActive}
    >
      <View
        role="presentation"
        style={[
          styles.rowShell,
          { height: rowHeight, backgroundColor: dropTarget ? theme.accent06 : "transparent" },
        ]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <ContextMenu
            native={desktop ? false : undefined}
            contentSize={desktop ? "sm" : "default"}
            triggerProps={{ style: { width: "100%", height: rowHeight } }}
            items={frozenItems.current ?? currentMenuItems}
            onOpenWillChange={(open) => {
              if (open) {
                setMenuOpen(true);
                onFocus(row.path);
                frozenItems.current = currentMenuItems;
                suppressPress.current = true;
              }
            }}
            onOpenChange={(open) => {
              setMenuOpen(open);
              if (!open) frozenItems.current = null;
            }}
            trigger={
              <Pressable
                role={isWeb() ? "treeitem" : "button"}
                nativeID={rowId(row.path)}
                accessibilityLabel={row.entry.path.split("/").at(-1)}
                accessibilityState={{ selected, ...(folder ? { expanded } : {}) }}
                onHoverIn={() => setHovered(true)}
                onHoverOut={() => setHovered(false)}
                onPressIn={() => {
                  suppressPress.current = false;
                }}
                onPress={(event) => {
                  if (suppressPress.current || isSuppressingPress()) return;
                  const modifiers = event.nativeEvent as unknown as {
                    shiftKey?: boolean;
                    ctrlKey?: boolean;
                    metaKey?: boolean;
                  };
                  const mode =
                    selectionMode || modifiers.ctrlKey || modifiers.metaKey
                      ? "toggle"
                      : modifiers.shiftKey
                        ? "range"
                        : "replace";
                  onSelect(row.path, mode);
                  if (mode === "replace") onActivate(row);
                }}
                style={[
                  styles.row,
                  {
                    height: rowHeight,
                    opacity: cut || dragging ? 0.45 : 1,
                    paddingLeft: 8 + row.depth * 16,
                    backgroundColor: dropTarget
                      ? theme.accent06
                      : active
                        ? theme.accent
                        : selected
                          ? theme.accent03
                          : hovered && !dragActive
                            ? theme.accent03
                            : "transparent",
                    borderColor: !dropTarget && focused ? theme.primary : "transparent",
                  },
                ]}
              >
                {folder ? (
                  <Pressable
                    accessibilityLabel={`${expanded ? "折叠" : "展开"} ${row.path}`}
                    accessibilityRole="button"
                    hitSlop={6}
                    onPress={(event) => {
                      event.stopPropagation();
                      if (isSuppressingPress()) return;
                      void onExpandedChange(row.path, !expanded).catch(() => undefined);
                    }}
                    style={{ width: 20, height: rowHeight - 4, justifyContent: "center" }}
                  >
                    <Chevron size={14} color={theme.mutedForeground} />
                  </Pressable>
                ) : (
                  <View style={styles.chevronSpace} />
                )}
                {folder ? (
                  expanded ? (
                    <FolderOpen size={16} color={theme.mutedForeground} />
                  ) : (
                    <Folder size={16} color={theme.mutedForeground} />
                  )
                ) : (
                  <FileText size={16} color={theme.mutedForeground} />
                )}
                <Text numberOfLines={1} style={[styles.label, { color: theme.foreground }]}>
                  {row.path.split("/").at(-1)}
                </Text>
                {!desktop ? (
                  <Dropdown
                    items={frozenItems.current ?? currentMenuItems}
                    trigger={
                      <Pressable
                        accessibilityLabel={`${row.path} 更多操作`}
                        style={[styles.more, { height: rowHeight }]}
                        onPress={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontal size={16} color={theme.mutedForeground} />
                      </Pressable>
                    }
                  />
                ) : null}
                {folder && row.isLoading ? (
                  <View style={styles.spinnerInset}>
                    <Spinner size="sm" />
                  </View>
                ) : null}
              </Pressable>
            }
          />
        </View>
      </View>
    </FilePathTooltip>
  );
}

export function WorkspaceTree(props: Props) {
  const { layoutMode } = useLayoutMode();
  const desktop = layoutMode === "desktop";
  const resourceRevision = useWorkspaceResourceRevision(props.workspaceId);
  const rowHeight = desktop ? 30 : 44;
  const { rows, focusedPath, epoch } = props;
  const list = useRef<VirtualizedList<WorkspaceTreeRow>>(null);
  const latest = useRef(props);
  latest.current = props;
  const previousRows = useRef(rows);
  const pointerFocusedPath = useRef<string | null>(null);
  const viewport = useRef({ offset: 0, height: 0, rowHeight });
  viewport.current.rowHeight = rowHeight;
  const scroll = useMemo(
    () =>
      createTreeScrollCoordinator((index) => {
        const metrics = viewport.current;
        if (isWeb()) {
          // Web scroll 事件可能滞后一帧，直接读取当前视口，避免重复或过量滚动。
          const scrollView = list.current?.getScrollRef() as ScrollView | null;
          const node = scrollView?.getScrollableNode() as HTMLElement | undefined;
          if (node) {
            metrics.offset = node.scrollTop;
            metrics.height = node.clientHeight;
          }
        }
        const offset = getTreeScrollOffset(
          index,
          metrics.rowHeight,
          metrics.offset,
          metrics.height,
        );
        if (offset === null) return;
        metrics.offset = offset;
        list.current?.scrollToOffset({ offset, animated: false });
      }),
    [],
  );
  const drag = useTreeDrag({
    workspaceId: props.workspaceId,
    epoch,
    enabled: desktop && Boolean(props.onMovePaths || props.canOpenFiles),
    rows,
    selectedPaths: props.selectedPaths,
    expandedPaths: props.expandedPaths,
    rowHeight,
    getOffset: () => {
      if (isWeb()) {
        const scrollView = list.current?.getScrollRef() as ScrollView | null;
        const node = scrollView?.getScrollableNode() as HTMLElement | undefined;
        if (node) viewport.current.offset = node.scrollTop;
      }
      return viewport.current.offset;
    },
    scrollTo: (offset) => {
      viewport.current.offset = offset;
      list.current?.scrollToOffset({ offset, animated: false });
    },
    select: (path) => {
      pointerFocusedPath.current = path;
      scroll.cancel();
      props.onSelect(path, "replace");
    },
    expand: (path) => props.onExpandedChange(path, true),
    move: props.onMovePaths,
    open: props.canOpenFiles
      ? (paths) => {
          for (const path of paths) {
            const row = rows.find(
              (row): row is WorkspaceTreeNodeRow =>
                row.kind === "node" && row.path === path && row.entry.fileType === "file",
            );
            if (row) props.onActivate(row);
          }
        }
      : undefined,
  });
  const theme = useUiTheme();
  useEffect(() => {
    scroll.cancel();
    return () => {
      scroll.cancel();
    };
  }, [epoch, scroll]);
  useEffect(() => {
    const next = resolveTreeFocus(focusedPath, previousRows.current, rows);
    previousRows.current = rows;
    if (next !== focusedPath) props.onFocus(next);
  }, [rows, focusedPath, props.onFocus]);
  useEffect(() => {
    const fromPointer = pointerFocusedPath.current === focusedPath;
    pointerFocusedPath.current = null;
    if (fromPointer) {
      scroll.cancel();
      return;
    }
    if (focusedPath) scroll.request(focusedPath, epoch);
  }, [focusedPath, epoch, scroll, rowHeight]);
  useEffect(() => {
    if (focusedPath) {
      scroll.update(
        rows.map((r) => (r.kind === "node" ? r.path : "\0")),
        epoch,
      );
    }
  }, [rows, focusedPath, epoch, scroll]);
  useImperativeHandle(
    props.ref,
    () => ({
      collapseAll: () => {
        scroll.cancel();
        latest.current.onCollapseAll();
      },
      expandNodes: async (paths) => {
        for (const path of [...paths].sort((a, b) => a.split("/").length - b.split("/").length))
          await latest.current.onExpandedChange(path, true);
      },
      selectNode: (path) => latest.current.onSelect(path, "replace"),
      scrollToNode: (path) => {
        scroll.request(path, latest.current.epoch);
        scroll.update(
          latest.current.rows.map((r) => (r.kind === "node" ? r.path : "\0")),
          latest.current.epoch,
        );
      },
    }),
    [scroll],
  );
  function onIntent(intent: TreeInputIntent) {
    const nodes = rows.filter((r): r is WorkspaceTreeNodeRow => r.kind === "node");
    const index = nodes.findIndex((r) => r.path === focusedPath);
    const row = nodes[Math.max(0, index)];
    if (!row) return;
    if (intent.type === "moveFocus") {
      const target = nodes[Math.max(0, Math.min(nodes.length - 1, index + intent.delta))];
      props.onFocus(target.path);
      return;
    }
    if (intent.type === "select") {
      props.onSelect(row.path, intent.selection);
      return;
    }
    if (intent.type === "activate") {
      props.onSelect(row.path, "replace");
      props.onActivate(row);
      return;
    }
    if (intent.type === "expand") {
      if (row.entry.fileType !== "directory") return;
      if (!props.expandedPaths.includes(row.path))
        void props.onExpandedChange(row.path, true).catch(() => undefined);
      else if (nodes[index + 1]?.parentPath === row.path) props.onFocus(nodes[index + 1].path);
    } else if (props.expandedPaths.includes(row.path))
      void props.onExpandedChange(row.path, false).catch(() => undefined);
    else if (row.parentPath) props.onFocus(row.parentPath);
  }
  return (
    <TreeDragInput
      enabled={desktop && Boolean(props.onMovePaths || props.canOpenFiles)}
      viewRef={drag.viewRef}
      onLayout={(event) => drag.onLayout(event.nativeEvent.layout.height)}
      onStart={drag.start}
      onMove={drag.move}
      onFinish={drag.finish}
    >
      <TreeInput
        activeDescendant={focusedPath ? rowId(focusedPath) : undefined}
        onIntent={onIntent}
      >
        <VirtualizedList
          key={layoutMode}
          ref={list}
          data={rows}
          getItem={(data, index) => data[index]}
          getItemCount={(data) => data.length}
          keyExtractor={(row) => row.key}
          style={[
            styles.list,
            {
              backgroundColor:
                drag.preview?.target?.directory === "" ? theme.accent06 : "transparent",
            },
          ]}
          extraData={[
            props.expandedPaths,
            props.selectedPaths,
            focusedPath,
            props.activePath,
            props.selectionMode,
            drag.preview,
            epoch,
          ]}
          getItemLayout={(_, index) => ({ length: rowHeight, offset: rowHeight * index, index })}
          onLayout={(event) => {
            viewport.current.height = event.nativeEvent.layout.height;
            scroll.retry();
          }}
          onScroll={(event) => {
            viewport.current.offset = event.nativeEvent.contentOffset.y;
            viewport.current.height = event.nativeEvent.layoutMeasurement.height;
          }}
          scrollEventThrottle={16}
          renderItem={({ item }) =>
            item.kind === "node" ? (
              <TreeNode
                cut={(props.cutPaths ?? []).some(
                  (p) => item.path === p || item.path.startsWith(`${p}/`),
                )}
                dragging={
                  drag.preview?.sources.some(
                    (p) => item.path === p || item.path.startsWith(`${p}/`),
                  ) ?? false
                }
                dragActive={Boolean(drag.preview)}
                dropTarget={isTreeDropRegion(item.path, drag.preview?.target)}
                isSuppressingPress={drag.isSuppressingPress}
                workspaceId={props.workspaceId}
                resourceRevision={resourceRevision}
                desktop={desktop}
                rowHeight={rowHeight}
                row={item}
                expanded={props.expandedPaths.includes(item.path)}
                selected={props.selectedPaths.includes(item.path)}
                focused={focusedPath === item.path}
                active={props.activePath === item.path}
                onFocus={(path) => {
                  pointerFocusedPath.current = path;
                  scroll.cancel();
                  props.onFocus(path);
                }}
                selectionMode={props.selectionMode}
                onSelect={(path, mode) => {
                  pointerFocusedPath.current = path;
                  scroll.cancel();
                  props.onSelect(path, mode);
                }}
                onActivate={props.onActivate}
                onExpandedChange={props.onExpandedChange}
                menuItems={props.menuItems}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => props.onRetry(item.path)}
                style={[
                  styles.status,
                  {
                    height: rowHeight,
                    paddingLeft: 12 + item.depth * 16,
                    backgroundColor: isTreeDropRegion(item.path, drag.preview?.target)
                      ? theme.accent06
                      : "transparent",
                  },
                ]}
              >
                {item.kind === "loading" ? (
                  <Spinner size="sm" />
                ) : (
                  <Text className="text-destructive" numberOfLines={1}>
                    读取失败，点击重试
                  </Text>
                )}
              </Pressable>
            )
          }
        />
      </TreeInput>
      {drag.preview ? (
        <TreeDragPreview
          pointer={drag.pointer}
          sources={drag.preview.sources}
          folder={rows.some(
            (row) =>
              row.kind === "node" &&
              row.path === drag.preview?.sources[0] &&
              row.entry.fileType === "directory",
          )}
        />
      ) : null}
      {drag.preview ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 6,
            right: 6,
            bottom: 6,
            padding: 8,
            borderWidth: 1,
            borderRadius: 4,
            borderColor: theme.primary,
            backgroundColor: theme.background,
          }}
        >
          <Text numberOfLines={2} style={{ fontSize: 12, color: theme.foreground }}>
            {drag.preview.openPaths.length
              ? `打开 ${drag.preview.openPaths.length} 个文件`
              : drag.preview.target
                ? `移动 ${drag.preview.target.paths.length} 个项目到 /${drag.preview.target.directory}`
                : "无法放置到此处"}
          </Text>
        </View>
      ) : null}
    </TreeDragInput>
  );
}
const styles = StyleSheet.create({
  list: { flex: 1, minHeight: 0 },
  rowShell: { flexDirection: "row", alignItems: "center" },
  row: {
    flexShrink: 0,
    width: "100%",
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  label: { flex: 1, fontSize: 13 },
  chevronSpace: { width: 20 },
  spinnerInset: { marginRight: 8 },
  more: { width: 28, alignItems: "center", justifyContent: "center" },
  status: { justifyContent: "center" },
});
