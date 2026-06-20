import { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { path } from "@/api";
import { Button, NativeList, NativeListItem, NativeListSection, Text } from "@/components/ui";

type PathDebugItem = { key: string; label: string; value: string | null };

async function loadPathDebugItems(): Promise<PathDebugItem[]> {
  const [dataDir, cacheDir, downloadDir, homeDir] = await Promise.all([
    path.getDataDir(),
    path.getCacheDir(),
    path.getDownloadDir(),
    path.getHomeDir(),
  ]);
  return [
    { key: "platform", label: "Platform", value: Platform.OS },
    { key: "dataDir", label: "dataDir", value: dataDir },
    { key: "cacheDir", label: "cacheDir", value: cacheDir },
    { key: "downloadDir", label: "downloadDir", value: downloadDir },
    { key: "homeDir", label: "homeDir", value: homeDir },
  ];
}

export function PathDebugPanel() {
  const [items, setItems] = useState<PathDebugItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshPaths() {
    setIsLoading(true);
    setError(null);
    try {
      const nextItems = await loadPathDebugItems();
      setItems(nextItems);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshPaths();
  }, []);

  return (
    <NativeList>
      <NativeListSection title="操作">
        <NativeListItem>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text fontSize="$5" fontWeight="600">
                路径测试
              </Text>
              <Text color="$color10" fontSize="$3">
                用于观察各平台默认路径。
              </Text>
            </View>
            <Button disabled={isLoading} onPress={refreshPaths} variant="outlined">
              {isLoading ? "读取中..." : "刷新路径"}
            </Button>
          </View>
        </NativeListItem>
      </NativeListSection>

      {error ? (
        <NativeListSection title="错误">
          <NativeListItem>
            <View style={styles.errorBox}>
              <Text color="$red10" fontSize="$3">
                {error}
              </Text>
            </View>
          </NativeListItem>
        </NativeListSection>
      ) : null}

      <NativeListSection title={`路径结果 (${items.length})`}>
        {items.map((item) => (
          <NativeListItem key={item.key}>
            <View style={styles.item}>
              <Text color="$color10" fontSize="$2">
                {item.label}
              </Text>
              <Text fontSize="$3">{item.value ?? "null"}</Text>
            </View>
          </NativeListItem>
        ))}
      </NativeListSection>
    </NativeList>
  );
}

const styles = StyleSheet.create({
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  headerText: { flexShrink: 1, gap: 4 },
  item: {
    borderColor: "rgba(128, 128, 128, 0.22)",
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
