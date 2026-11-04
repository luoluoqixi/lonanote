import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Dropdown, Text, useUiTheme } from "rn-ui-kit";

import { type WorkspaceListItem, workspace } from "@/api/commands/workspace";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";
import { WorkspaceLocationSheet } from "@/components/workspaces/workspace_select/workspace_location_sheet";
import { useWorkspaceCatalogRevision } from "@/hooks/workspace/use_workspace_catalog_revision";
import { useWorkspaceLocation } from "@/hooks/workspace/use_workspace_location";
import { useWorkspaceOpenActions } from "@/hooks/workspace/use_workspace_open_actions";

// 空状态中直接显示的最近工作区数量。
const RECENT_WORKSPACE_LIMIT = 10;

export function RecentWorkspaces() {
  const theme = useUiTheme();
  const { width } = useWindowDimensions();
  const { revision } = useWorkspaceCatalogRevision();
  const [items, setItems] = useState<WorkspaceListItem[]>([]);
  const [paths, setPaths] = useState<Record<string, string | null>>({});
  const [hasError, setHasError] = useState(false);
  const [pendingRebind, setPendingRebind] = useState<WorkspaceListItem | null>(null);
  const requestIdRef = useRef(0);
  const locationBusyRef = useRef(false);
  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const records = await workspace.list();
      if (requestId !== requestIdRef.current) return;
      const recent = records
        .filter((item) => item.lastOpenedAt !== null)
        .sort((a, b) => b.lastOpenedAt! - a.lastOpenedAt!);
      const resolvedPaths = await Promise.all(
        recent.map(
          async (item) =>
            [item.id, await workspace.nativeRootPath(item.id).catch(() => null)] as const,
        ),
      );
      if (requestId !== requestIdRef.current) return;
      setItems(recent);
      setPaths(Object.fromEntries(resolvedPaths));
      setHasError(false);
    } catch {
      if (requestId === requestIdRef.current) setHasError(true);
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
  const disabled = busy || location.isWorking || location.item !== null;

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

  if (!items.length && !hasError) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading} className="text-muted-foreground">
        最近打开
      </Text>
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
          <View role="presentation">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`打开工作区 ${item.displayName}`}
              disabled={disabled}
              className="hover:bg-accent"
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
                {paths[item.id] ?? "路径不可用"}
              </Text>
            </Pressable>
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
                <Dropdown.Item
                  key={item.id}
                  disabled={disabled}
                  textValue={item.displayName}
                  accessibilityLabel={`${item.displayName} ${paths[item.id] ?? ""}`}
                  style={styles.menuRow}
                  onPress={() => void openWorkspace(item.id)}
                >
                  <View style={styles.menuCell}>
                    <FilePathTooltip path={paths[item.id] ?? null} disabled={disabled}>
                      <View role="presentation" style={styles.menuContent}>
                        <Text numberOfLines={1} style={styles.menuName}>
                          {item.displayName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={styles.menuPath}
                          className="text-muted-foreground"
                        >
                          {paths[item.id] ?? "路径不可用"}
                        </Text>
                      </View>
                    </FilePathTooltip>
                  </View>
                </Dropdown.Item>
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
  container: { flexGrow: 1, flexShrink: 1, minWidth: 0, maxWidth: 620, gap: 0 },
  heading: { fontSize: 16, fontWeight: "600", marginBottom: 12, paddingHorizontal: 6 },
  link: {
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
  menuRow: { height: 26, gap: 10, paddingVertical: 0, minWidth: 0, overflow: "hidden" },
  menuCell: { flex: 1, minWidth: 0 },
  menuContent: { width: "100%", minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  menuName: { fontSize: 13, flexShrink: 0, maxWidth: "55%" },
  menuPath: { fontSize: 11, flex: 1, minWidth: 0 },
  error: { alignItems: "flex-start", paddingHorizontal: 8 },
});
