import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { path } from "@/api";
import {
  NativeList,
  NativeListButtonItem,
  NativeListItem,
  NativeListSection,
} from "@/components/ui";

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

export function PathDebugPage() {
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
        <NativeListItem title="路径测试" subtitle="用于观察各平台默认路径。" />
        <NativeListButtonItem
          title={isLoading ? "读取中..." : "刷新路径"}
          disabled={isLoading}
          onPress={refreshPaths}
        />
      </NativeListSection>

      {error ? (
        <NativeListSection title="错误">
          <NativeListItem title={error} />
        </NativeListSection>
      ) : null}

      <NativeListSection title={`路径结果 (${items.length})`}>
        {items.map((item) => (
          <NativeListItem key={item.key} title={item.label} subtitle={item.value ?? "null"} />
        ))}
      </NativeListSection>
    </NativeList>
  );
}
