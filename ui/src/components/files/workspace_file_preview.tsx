import { Zoomable } from "@likashefqet/react-native-image-zoom";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Button, Text } from "rn-ui-kit";

import { workspace } from "@/api/commands/workspace";
import { resolveWorkspaceFileUrl } from "@/api/common";
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
  const [resource, setResource] = useState<{ key: string; uri?: string; error?: string } | null>(
    null,
  );
  const [retry, setRetry] = useState(0);
  const key = `${viewer.ref.workspaceId}:${viewer.ref.filePath}:${viewer.identityRevision}`;
  useEffect(() => {
    if (viewer.viewerKind !== "image" && viewer.viewerKind !== "video") return;
    let current = true;
    void workspace
      .get(viewer.ref.workspaceId)
      .then((snapshot) => resolveWorkspaceFileUrl(snapshot, viewer.ref.filePath))
      .then((uri) => {
        if (current) setResource({ key, uri });
      })
      .catch((error: unknown) => {
        if (current) setResource({ key, error: String(error) });
      });
    return () => {
      current = false;
    };
  }, [key, viewer.ref.workspaceId, viewer.ref.filePath, viewer.viewerKind, retry]);
  if (viewer.viewerKind === "pdf" || viewer.viewerKind === "unknown")
    return (
      <UnknownFileContent filePath={viewer.ref.filePath} workspaceId={viewer.ref.workspaceId} />
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
