import { type Href, Redirect, Stack, useLocalSearchParams } from "expo-router";
import { type CSSProperties, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "rn-ui-kit";

import { workspaceResource } from "@/api/commands/workspace";
import { getFileName, isTauri } from "@/api/common";
import { appendWorkspaceResourceUrl } from "@/assets/editor/src/resources/resource_url";

const TAURI_RESOURCE_ENDPOINT = "lonanote-resource://resource";

const iframeStyle: CSSProperties = {
  border: 0,
  display: "block",
  height: "100%",
  width: "100%",
};

function getFirstParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Tauri 使用受 Workspace scope 约束的 protocol URL 交由 WebView 的 PDF renderer 显示。 */
export function PdfViewer() {
  const { path, workspaceId } = useLocalSearchParams<{
    path?: string | string[];
    workspaceId?: string | string[];
  }>();
  const filePath = getFirstParamValue(path);
  const targetWorkspaceId = getFirstParamValue(workspaceId);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!filePath || !targetWorkspaceId || !isTauri()) return;
    let disposed = false;
    void workspaceResource
      .acquireScope(targetWorkspaceId)
      .then((scope) => {
        const endpoint = `${TAURI_RESOURCE_ENDPOINT}/${scope.scopeId}/${scope.generation}`;
        const nextUrl = appendWorkspaceResourceUrl(endpoint, filePath);
        if (!nextUrl) throw new Error("PDF 路径无效");
        if (!disposed) setPdfUrl(nextUrl);
      })
      .catch((loadError: unknown) => {
        if (!disposed) {
          setError(loadError instanceof Error ? loadError.message : "PDF 加载失败");
        }
      });
    return () => {
      disposed = true;
    };
  }, [filePath, targetWorkspaceId]);

  if (!filePath || !targetWorkspaceId) return <Redirect href={"/" as Href} />;

  return (
    <>
      <Stack.Screen options={{ title: getFileName(filePath) }} />
      <View style={styles.container}>
        {!isTauri() ? (
          <Text className="text-muted-foreground text-base">当前环境不支持 PDF 预览</Text>
        ) : error ? (
          <Text className="text-destructive text-base">{error}</Text>
        ) : pdfUrl ? (
          <iframe aria-label={getFileName(filePath)} src={pdfUrl} style={iframeStyle} />
        ) : (
          <ActivityIndicator />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
