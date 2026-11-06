import { X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dropdown, Text, useUiTheme } from "rn-ui-kit";

import { type WorkspaceListItem, workspace } from "@/api/commands/workspace";
import { getErrorMessage } from "@/api/common/error_message";
import { getRecentWorkspaces } from "@/components/app_menu/app_menu_model";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";
import { WorkspaceLocationSheet } from "@/components/workspaces/workspace_select/workspace_location_sheet";
import { useToast } from "@/hooks/ui";
import { useWorkspaceCatalogRevision } from "@/hooks/workspace/use_workspace_catalog_revision";
import { useWorkspaceLocation } from "@/hooks/workspace/use_workspace_location";
import { useWorkspaceOpenActions } from "@/hooks/workspace/use_workspace_open_actions";

// 空状态中直接显示的最近工作区数量。
const RECENT_WORKSPACE_LIMIT = 10;

export function RecentWorkspaces() {
  const theme = useUiTheme();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const { revision } = useWorkspaceCatalogRevision();
  const [items, setItems] = useState<WorkspaceListItem[]>([]);
  const [paths, setPaths] = useState<Record<string, string | null>>({});
  const [pathErrors, setPathErrors] = useState<Record<string, string>>({});
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRebind, setPendingRebind] = useState<WorkspaceListItem | null>(null);
  const requestIdRef = useRef(0);
  const locationBusyRef = useRef(false);
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const records = await workspace.list();
      if (requestId !== requestIdRef.current) return;
      const recent = getRecentWorkspaces(records);
      // 路径解析可能等待存储访问，不能挡住历史列表本身。
      setItems(recent);
      setHasError(false);
      setIsLoading(false);
      const resolvedPaths = await Promise.all(
        recent.map(async (item) => {
          try {
            return { id: item.id, path: await workspace.nativeRootPath(item.id), error: null };
          } catch (error) {
            console.warn("[recent-workspaces] read root path failed", item.id, error);
            return { id: item.id, path: null, error: getErrorMessage(error, "读取路径失败") };
          }
        }),
      );
      if (requestId !== requestIdRef.current) return;
      setPaths(Object.fromEntries(resolvedPaths.map(({ id, path }) => [id, path])));
      setPathErrors(
        Object.fromEntries(resolvedPaths.flatMap(({ id, error }) => (error ? [[id, error]] : []))),
      );
      setHasError(false);
    } catch {
      if (requestId === requestIdRef.current) {
        setHasError(true);
        setIsLoading(false);
      }
    }
  }, []);
  const { busy, openWorkspace } = useWorkspaceOpenActions({
    onChanged: refresh,
    onMissing: setPendingRebind,
  });
  const location = useWorkspaceLocation({
    busyRef: locationBusyRef,
    isBlocked: () => busy,
    onChanged: refresh,
  });
  const disabled = busy || location.isWorking || location.item !== null || deletingId !== null;
  const pathLabel = (id: string) =>
    pathErrors[id]
      ? "读取路径失败"
      : paths[id] === undefined
        ? "正在读取路径…"
        : (paths[id] ?? "无本地路径");
  const deleteHistory = async (id: string) => {
    if (disabled) return;
    setDeletingId(id);
    try {
      await workspace.clearHistory(id);
      await refresh();
    } catch (error) {
      toast.error(getErrorMessage(error, "移除历史记录失败"));
    } finally {
      setDeletingId(null);
    }
  };
  const removeButton = (item: WorkspaceListItem) => (
    <Button
      aria-label={`从历史记录中移除 ${item.displayName}`}
      variant="ghost"
      size="xs"
      buttonSize={{ width: 24, height: 24 }}
      disabled={disabled}
      onPress={() => void deleteHistory(item.id)}
    >
      <X size={12} color={theme.mutedForeground} />
    </Button>
  );

  useEffect(() => {
    void refresh();
    return () => {
      requestIdRef.current++;
    };
  }, [refresh, revision]);

  useEffect(() => {
    if (pendingRebind && !busy) {
      location.open(pendingRebind, "rebind");
      setPendingRebind(null);
    }
  }, [pendingRebind, busy, location.open]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading} className="text-muted-foreground">
        最近打开
      </Text>
      {!items.length && !hasError ? (
        <Text style={{ fontSize: 12 }} className="text-muted-foreground">
          {isLoading ? "正在加载历史记录…" : "暂无最近工作区"}
        </Text>
      ) : null}
      {hasError ? (
        <View style={styles.error}>
          <Text style={{ fontSize: 12 }} className="text-muted-foreground">
            无法加载最近工作区
          </Text>
          <Button size="sm" variant="link" onPress={() => void refresh()}>
            重试
          </Button>
        </View>
      ) : null}
      {items.slice(0, RECENT_WORKSPACE_LIMIT).map((item) => (
        <FilePathTooltip key={item.id} path={paths[item.id] ?? null} disabled={disabled}>
          <View
            role="presentation"
            className="hover:bg-accent focus-within:bg-accent"
            style={styles.historyRow}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`打开工作区 ${item.displayName}`}
              disabled={disabled}
              style={({ pressed }) => [
                styles.link,
                {
                  opacity: disabled ? 0.5 : 1,
                  backgroundColor: pressed ? theme.accent : undefined,
                },
              ]}
              onPress={() => void openWorkspace(item.id)}
            >
              <Text numberOfLines={1} style={[styles.name, { color: theme.primary }]}>
                {item.displayName}
              </Text>
              <Text numberOfLines={1} style={styles.path} className="text-muted-foreground">
                {pathLabel(item.id)}
              </Text>
            </Pressable>
            {removeButton(item)}
          </View>
        </FilePathTooltip>
      ))}
      {items.length > RECENT_WORKSPACE_LIMIT ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Dropdown
            native={false}
            disabled={disabled}
            triggerLabel="更多…"
            nativeTrigger
            nativeTriggerIcon="none"
            nativeTriggerContainerStyle={{
              paddingHorizontal: 10,
              paddingVertical: 0,
            }}
            nativeTriggerProps={{
              accessibilityLabel: "查看全部最近工作区",
              size: "xs",
              style: {
                outline: "none",
                height: 34,
              },
            }}
            nativeTriggerLabelProps={{ style: { color: theme.primary } }}
            contentSize="xs"
          >
            <Dropdown.Content align="start" style={{ width: Math.min(520, width - 24) }}>
              {items.map((item) => (
                <View
                  key={item.id}
                  className="hover:bg-accent focus-within:bg-accent"
                  style={styles.historyRow}
                >
                  <Dropdown.Item
                    disabled={disabled}
                    accessibilityLabel={`打开工作区 ${item.displayName}`}
                    style={styles.menuRow}
                    onPress={() => void openWorkspace(item.id)}
                  >
                    <FilePathTooltip path={paths[item.id] ?? null} disabled={disabled}>
                      <View role="presentation" style={styles.menuContent}>
                        <Text numberOfLines={1} style={styles.menuName}>
                          {item.displayName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={styles.menuPath}
                          className="text-muted-foreground"
                        >
                          {pathLabel(item.id)}
                        </Text>
                      </View>
                    </FilePathTooltip>
                  </Dropdown.Item>
                  {removeButton(item)}
                </View>
              ))}
            </Dropdown.Content>
          </Dropdown>
        </View>
      ) : null}
      <WorkspaceLocationSheet location={location} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", flexShrink: 1, minWidth: 0, maxWidth: 620, gap: 0 },
  heading: { fontSize: 13, fontWeight: "600", marginBottom: 12, paddingHorizontal: 6 },
  historyRow: { flexDirection: "row", alignItems: "center", minWidth: 0, borderRadius: 4 },
  link: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    height: 26,
    paddingHorizontal: 6,
    minWidth: 0,
    borderRadius: 4,
  },
  name: { fontSize: 13, flexShrink: 0, maxWidth: "60%" },
  path: { fontSize: 12, flex: 1, minWidth: 0 },
  menuRow: {
    flex: 1,
    height: 26,
    gap: 10,
    paddingTop: 0,
    paddingBottom: 0,
    minWidth: 0,
    overflow: "hidden",
  },
  menuContent: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  menuName: { fontSize: 13, flexShrink: 0, maxWidth: "55%" },
  menuPath: { fontSize: 11, flex: 1, minWidth: 0 },
  error: { alignItems: "flex-start", paddingHorizontal: 8 },
});
