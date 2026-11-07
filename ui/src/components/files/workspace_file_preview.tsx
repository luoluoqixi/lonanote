import { Zoomable } from "@likashefqet/react-native-image-zoom";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, Text } from "rn-ui-kit";
import { useStore } from "zustand";

import { editorWindowRuntime } from "@/components/editor/controllers/editor_window_runtime";
import {
  editorWindowService,
  editorWindowState,
} from "@/components/editor/controllers/editor_window_service";
import { resolveViewerResource } from "@/components/editor/controllers/editor_window_viewers";
import { useWorkspaceResourceRevision } from "@/hooks/workspace/use_workspace_resource_revision";
import type { WorkspaceViewerSession } from "@/stores/editor/editor_store";

import { UnknownFileContent } from "./unknown_file_viewer";

function VideoContent({ uri, onError }: { uri: string; onError(message: string): void }) {
  const player = useVideoPlayer(uri);
  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error") onError(error?.message ?? "视频无法播放");
  });
  // useVideoPlayer 在卸载时释放播放器，不能在 release 后再次调用 pause。
  return <VideoView player={player} nativeControls style={{ flex: 1 }} />;
}

export function WorkspaceFilePreview({ viewer }: { viewer: WorkspaceViewerSession }) {
  const revision = useWorkspaceResourceRevision(viewer.ref.workspaceId);
  const connected = useStore(editorWindowState, (state) => state.connected);
  const remote = editorWindowRuntime.isRemote();
  const [resource, setResource] = useState<{ key: string; uri?: string; error?: string } | null>(
    null,
  );
  const [retry, setRetry] = useState(0);
  const key = `${viewer.ref.workspaceId}:${viewer.ref.filePath}:${viewer.identityRevision}:${revision}`;
  useEffect(() => {
    if (viewer.viewerKind !== "image" && viewer.viewerKind !== "video") return;
    let current = true;
    if (remote && !connected) {
      setResource(null);
      return;
    }
    void resolveViewerResource(viewer)
      .then((uri) => {
        if (current) setResource({ key, uri });
      })
      .catch((error: unknown) => {
        if (current) setResource({ key, error: String(error) });
      });
    return () => {
      current = false;
    };
  }, [
    key,
    viewer.ref.workspaceId,
    viewer.ref.filePath,
    viewer.viewerKind,
    retry,
    remote,
    connected,
  ]);
  useEffect(() => {
    if (!remote || !connected) return;
    if (
      (viewer.viewerKind === "image" || viewer.viewerKind === "video") &&
      (resource?.key !== key || !resource.uri)
    )
      return;
    // 隐藏辅助窗口先挂载真实预览 shell，再通知 owner 可以提交转移。
    void editorWindowService
      .requestOwner("viewer-ready", { editorId: viewer.viewerId })
      .catch((error) => console.error("[viewer] 预览窗口就绪确认失败", error));
  }, [remote, connected, viewer.viewerId, viewer.viewerKind, key, resource?.key, resource?.uri]);
  if (viewer.viewerKind === "pdf" || viewer.viewerKind === "unknown")
    return (
      <UnknownFileContent
        filePath={viewer.ref.filePath}
        workspaceId={viewer.ref.workspaceId}
        viewerId={viewer.viewerId}
      />
    );
  const value = resource?.key === key ? resource : null;
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {value?.error ? (
        <View style={{ alignItems: "center", gap: 12 }}>
          <Text>{value.error}</Text>
          <Button
            onPress={() => {
              setResource(null);
              setRetry((value) => value + 1);
            }}
          >
            重试
          </Button>
        </View>
      ) : !value?.uri ? (
        <ActivityIndicator />
      ) : viewer.viewerKind === "image" ? (
        <Zoomable style={{ flex: 1 }} maxScale={4} doubleTapScale={2} isDoubleTapEnabled>
          <Image
            onError={() => setResource({ key, error: "无法预览此文件" })}
            source={{ uri: value.uri }}
            contentFit="contain"
            style={{ width: "100%", height: "100%" }}
          />
        </Zoomable>
      ) : (
        <VideoContent uri={value.uri} onError={(error) => setResource({ key, error })} />
      )}
    </View>
  );
}
