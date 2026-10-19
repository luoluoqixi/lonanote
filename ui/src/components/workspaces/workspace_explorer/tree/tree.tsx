import { ChevronDown, ChevronRight, FileText, Folder, MoreHorizontal } from "lucide-react-native";
import { type Ref, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, VirtualizedList } from "react-native";
import { ContextMenu, type ContextMenuItemData, Dropdown, Spinner, useUiTheme } from "rn-ui-kit";

import { isWeb } from "@/api/common/platform";

import { TreeInput } from "./tree_input";
import { createTreeScrollCoordinator } from "./tree_input_intent";
import { resolveTreeFocus } from "./tree_model";
import type {
  TreeHandle,
  TreeInputIntent,
  TreeSelectionMode,
  WorkspaceTreeNodeRow,
  WorkspaceTreeRow,
} from "./tree_types";

const ROW_HEIGHT = isWeb() ? 30 : 44;
const rowId = (path: string) => `workspace-tree-${encodeURIComponent(path)}`;
type Props = {
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
  const suppressPress = useRef(false);
  const frozenItems = useRef<ContextMenuItemData[] | null>(null);
  const currentMenuItems = menuItems(row.path);
  const folder = row.entry.fileType === "directory";
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <View style={styles.rowShell}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ContextMenu
          contentSize={isWeb() ? "sm" : "default"}
          triggerProps={{ style: { width: "100%", height: ROW_HEIGHT } }}
          items={frozenItems.current ?? currentMenuItems}
          onOpenWillChange={(open) => {
            if (open) {
              onFocus(row.path);
              frozenItems.current = currentMenuItems;
              suppressPress.current = true;
            }
          }}
          onOpenChange={(open) => {
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
                  paddingLeft: 8 + row.depth * 16,
                  backgroundColor: active
                    ? theme.accent
                    : selected
                      ? theme.secondary
                      : hovered
                        ? theme.muted
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
                  style={{ width: 20, height: ROW_HEIGHT - 4, justifyContent: "center" }}
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
              {!isWeb() ? (
                <Dropdown
                  items={frozenItems.current ?? currentMenuItems}
                  trigger={
                    <Pressable
                      accessibilityLabel={`${row.path} 更多操作`}
                      style={styles.more}
                      onPress={(event) => event.stopPropagation()}
                    >
                      <MoreHorizontal size={16} color={theme.mutedForeground} />
                    </Pressable>
                  }
                />
              ) : null}
            </Pressable>
          }
        />
      </View>
    </View>
  );
}

export function WorkspaceTree(props: Props) {
  const { rows, focusedPath, epoch } = props;
  const list = useRef<VirtualizedList<WorkspaceTreeRow>>(null);
  const latest = useRef(props);
  latest.current = props;
  const previousRows = useRef(rows);
  const scroll = useMemo(
    () =>
      createTreeScrollCoordinator((index) =>
        list.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 }),
      ),
    [],
  );
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    scroll.cancel();
    if (retryTimer.current) clearTimeout(retryTimer.current);
    return () => {
      scroll.cancel();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [epoch, scroll]);
  useEffect(() => {
    const next = resolveTreeFocus(focusedPath, previousRows.current, rows);
    previousRows.current = rows;
    if (next !== focusedPath) props.onFocus(next);
  }, [rows, focusedPath, props.onFocus]);
  useEffect(() => {
    if (focusedPath) scroll.request(focusedPath, epoch);
  }, [focusedPath, epoch, scroll]);
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
        getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
        onScrollToIndexFailed={() => {
          if (retryTimer.current) clearTimeout(retryTimer.current);
          retryTimer.current = setTimeout(() => scroll.retry(), 40);
        }}
        renderItem={({ item }) =>
          item.kind === "node" ? (
            <TreeNode
              row={item}
              expanded={props.expandedPaths.includes(item.path)}
              selected={props.selectedPaths.includes(item.path)}
              focused={focusedPath === item.path}
              active={props.activePath === item.path}
              onFocus={props.onFocus}
              selectionMode={props.selectionMode}
              onSelect={props.onSelect}
              onActivate={props.onActivate}
              onExpandedChange={props.onExpandedChange}
              menuItems={props.menuItems}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => props.onRetry(item.path)}
              style={[styles.status, { paddingLeft: 12 + item.depth * 16 }]}
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
  rowShell: { height: ROW_HEIGHT, flexDirection: "row", alignItems: "center" },
  row: {
    height: ROW_HEIGHT,
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
  more: { width: 28, height: ROW_HEIGHT, alignItems: "center", justifyContent: "center" },
  status: { height: ROW_HEIGHT, justifyContent: "center" },
});
