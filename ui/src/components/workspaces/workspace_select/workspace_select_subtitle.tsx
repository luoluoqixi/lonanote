import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "rn-ui-kit";

import { type WorkspaceListItem, workspace } from "@/api/commands/workspace";
import { FilePathTooltip } from "@/components/files/file_path_tooltip";

import { type WorkspaceSortValue, getWorkspaceSubtitle } from "./workspace_sort";

/** 桌面选择列表的第二行：时间后接本地完整路径，路径异步加载不阻塞列表。 */
export function WorkspaceSelectSubtitle({
  item,
  sortValue,
}: {
  item: WorkspaceListItem;
  sortValue: WorkspaceSortValue;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [label, setLabel] = useState("正在读取路径…");
  useEffect(() => {
    let cancelled = false;
    setPath(null);
    setLabel("正在读取路径…");
    void workspace
      .nativeRootPath(item.id)
      .then((path) => {
        if (cancelled) return;
        setPath(path);
        setLabel(path ?? "无本地路径");
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[workspace-select] read root path failed", item.id, error);
        setLabel("读取路径失败");
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  return (
    <View style={styles.row}>
      <Text className="text-muted-foreground" style={styles.time}>
        {getWorkspaceSubtitle(item, sortValue)}
      </Text>
      <View style={styles.pathColumn}>
        <FilePathTooltip path={path}>
          <View role="presentation" style={styles.pathContent}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              className="text-muted-foreground"
              style={styles.path}
            >
              {label}
            </Text>
          </View>
        </FilePathTooltip>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", minWidth: 0, gap: 10 },
  time: { fontSize: 12, flexShrink: 0 },
  pathColumn: { flex: 1, minWidth: 0 },
  pathContent: { width: "100%", minWidth: 0 },
  path: { width: "100%", minWidth: 0, fontSize: 10, opacity: 0.65 },
});
