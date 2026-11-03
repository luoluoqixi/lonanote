import { ChevronDown, ChevronRight, FileText, Folder, MoreHorizontal } from "lucide-react-native";
import { type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Pressable, type ScrollView, StyleSheet, Text, View, VirtualizedList } from "react-native";
import { ContextMenu, type ContextMenuItemData, Dropdown, Spinner, useUiTheme } from "rn-ui-kit";

import { workspaceFile } from "@/api/commands/workspace";
import { isWeb } from "@/api/common/platform";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";
import { useLayoutMode } from "@/hooks/layout";
import { useWorkspaceResourceRevision } from "@/hooks/workspace/use_workspace_resource_revision";

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

const rowId = (path: string) => `workspace-tree-${encodeURIComponent(path)}`;
type Props = {
  workspaceId: string;
  ref?: Ref<TreeHandle>;
  epoch: number;
  rows: WorkspaceTreeRow[];
  expandedPaths: string[];
  selectedPaths: string[];
  focusedPath: string | null;
  activePath?: string | null;
  selectionMode: boolean;
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
      disabled={!desktop || menuOpen}
    >
      <View role="presentation" style={[styles.rowShell, { height: rowHeight }]}>
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
                  if (suppressPress.current) return;
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
                    paddingLeft: 8 + row.depth * 16,
                    backgroundColor: active
                      ? theme.accent
                      : selected
                        ? theme.accent03
                        : hovered
                          ? theme.accent03
                          : "transparent",
                    borderColor: focused ? theme.primary : "transparent",
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
                  <Folder size={16} color={theme.mutedForeground} />
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
    <TreeInput activeDescendant={focusedPath ? rowId(focusedPath) : undefined} onIntent={onIntent}>
      <VirtualizedList
        key={layoutMode}
        ref={list}
        data={rows}
        getItem={(data, index) => data[index]}
        getItemCount={(data) => data.length}
        keyExtractor={(row) => row.key}
        style={styles.list}
        extraData={[
          props.expandedPaths,
          props.selectedPaths,
          focusedPath,
          props.activePath,
          props.selectionMode,
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
              style={[styles.status, { height: rowHeight, paddingLeft: 12 + item.depth * 16 }]}
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
