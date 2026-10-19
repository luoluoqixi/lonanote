import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, Text, useUiTheme } from "rn-ui-kit";

import { workspaceResource } from "@/api/commands/workspace";
import { isTauri } from "@/api/common/platform";
import { appendWorkspaceResourceUrl } from "@/assets/editor/src/resources/resource_url";
import type { WorkspaceViewerSession } from "@/stores/editor/editor_store";

import { UnknownFileContent } from "./unknown_file_viewer";

/** 只读内容组件不读取路由，也不注册全局键盘事件。 */
export function WorkspaceFilePreview({ viewer }: { viewer: WorkspaceViewerSession }) {
  const theme = useUiTheme();
  const [resource, setResource] = useState<{ key: string; url?: string; error?: string } | null>(
    null,
  );
  const video = useRef<HTMLVideoElement>(null);
  const [retry, setRetry] = useState(0);
  const key = `${viewer.ref.workspaceId}:${viewer.ref.filePath}:${viewer.identityRevision}`;
  useEffect(() => {
    if (viewer.viewerKind === "unknown" || !isTauri()) return;
    let current = true;
    void workspaceResource
      .acquireScope(viewer.ref.workspaceId)
      .then((scope) => {
        const url = appendWorkspaceResourceUrl(
          `lonanote-resource://resource/${scope.scopeId}/${scope.generation}`,
          viewer.ref.filePath,
        );
        if (!url) throw new Error("文件路径无效");
        if (current) setResource({ key, url });
      })
      .catch((error: unknown) => {
        if (current)
          setResource({ key, error: error instanceof Error ? error.message : "文件加载失败" });
      });
    return () => {
      current = false;
    };
  }, [key, viewer.ref.workspaceId, viewer.ref.filePath, viewer.viewerKind, retry]);
  useEffect(() => {
    const element = video.current;
    return () => {
      element?.pause();
    };
  }, [key, resource?.url]);
  if (viewer.viewerKind === "unknown")
    return (
      <UnknownFileContent filePath={viewer.ref.filePath} workspaceId={viewer.ref.workspaceId} />
    );
  const value = resource?.key === key ? resource : null;
  const failed = () => setResource({ key, error: "无法预览此文件" });
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.background,
      }}
    >
      {!isTauri() ? (
        <Text>当前环境不支持文件预览</Text>
      ) : value?.error ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text className="text-destructive">{value.error}</Text>
          <Button
            onPress={() => {
              setResource(null);
              setRetry((value) => value + 1);
            }}
          >
            重试
          </Button>
        </View>
      ) : !value?.url ? (
        <ActivityIndicator />
      ) : viewer.viewerKind === "image" ? (
        <img
          alt={viewer.title}
          src={value.url}
          onError={failed}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : viewer.viewerKind === "video" ? (
        <video
          ref={video}
          controls
          src={value.url}
          onError={failed}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <iframe
          title={viewer.title}
          src={value.url}
          onError={failed}
          style={{ border: 0, width: "100%", height: "100%" }}
        />
      )}
    </View>
  );
}
