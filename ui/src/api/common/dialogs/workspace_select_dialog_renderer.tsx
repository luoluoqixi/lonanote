import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "rn-ui-kit";

import { type WorkspaceListItem, workspace } from "@/api/commands/workspace";

import { registerDialogRenderer } from "./dialog_content_registry";
import type { DialogRendererProps } from "./dialog_content_registry";

function WorkspaceSelectDialogRenderer({ payload, onComplete }: DialogRendererProps<"workspace.select">) {
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void workspace.list().then(
      (items) => {
        if (!active) return;
        setWorkspaces(items);
        setLoading(false);
      },
      (reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.root}>
      {loading ? (
        <ActivityIndicator />
      ) : error ? (
        <Text accessibilityRole="alert" className="text-destructive">
          读取工作区失败：{error}
        </Text>
      ) : workspaces.length === 0 ? (
        <Text className="text-muted-foreground">暂无工作区</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {workspaces.map((item) => (
            <Button
              key={item.id}
              variant={item.id === payload.currentWorkspaceId ? "secondary" : "outline"}
              onPress={() => onComplete(item.id)}
              style={styles.item}
            >
              <View style={styles.copy}>
                <Text numberOfLines={1}>{item.displayName}</Text>
                {item.id === payload.currentWorkspaceId ? (
                  <Text className="text-muted-foreground" style={{ fontSize: 12 }}>
                    当前工作区
                  </Text>
                ) : null}
              </View>
            </Button>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

registerDialogRenderer("workspace.select", WorkspaceSelectDialogRenderer);

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, padding: 16 },
  list: { gap: 8 },
  item: { minHeight: 48, justifyContent: "flex-start" },
  copy: { alignItems: "flex-start", flex: 1, gap: 2 },
});
