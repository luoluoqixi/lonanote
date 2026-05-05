import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";

import { path } from "@/api";
import { Button } from "@/components/ui";

type PathDebugItem = {
  key: string;
  label: string;
  value: string | null;
};

async function loadPathDebugItems(): Promise<PathDebugItem[]> {
  const [dataDir, cacheDir, downloadDir, homeDir, rootDir] = await Promise.all([
    path.getDataDir(),
    path.getCacheDir(),
    path.getDownloadDir(),
    path.getHomeDir(),
    path.getRootDir(),
  ]);

  return [
    { key: "platform", label: "Platform", value: Platform.OS },
    { key: "dataDir", label: "dataDir", value: dataDir },
    { key: "cacheDir", label: "cacheDir", value: cacheDir },
    { key: "downloadDir", label: "downloadDir", value: downloadDir },
    { key: "homeDir", label: "homeDir", value: homeDir },
    { key: "rootDir", label: "rootDir", value: rootDir },
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
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshPaths();
  }, []);

  return (
    <View className="w-full gap-3 rounded-2xl border border-foreground/10 bg-foreground/5 p-4">
      <View className="flex-row items-center justify-between gap-3">
        <View className="shrink gap-1">
          <Text className="text-base font-semibold text-foreground">路径测试</Text>
          <Text className="text-sm text-foreground/70">用于观察各平台默认路径和当前 rootDir。</Text>
        </View>
        <Button variant="outline" onPress={refreshPaths} isDisabled={isLoading}>
          {isLoading ? "读取中..." : "刷新路径"}
        </Button>
      </View>

      {error ? (
        <Text className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</Text>
      ) : null}

      <View className="gap-2">
        {items.map((item) => (
          <View
            key={item.key}
            className="gap-1 rounded-xl border border-foreground/10 bg-background px-3 py-2"
          >
            <Text className="text-xs uppercase tracking-wide text-foreground/50">{item.label}</Text>
            <Text className="text-sm text-foreground">{item.value ?? "null"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
