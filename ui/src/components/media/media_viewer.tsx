import { Zoomable } from "@likashefqet/react-native-image-zoom";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { workspace } from "@/api/commands/workspace";
import { getFileName, resolveWorkspaceFileUrl } from "@/api/common";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

export type WorkspaceMediaKind = "image" | "video";

type MediaViewerProps = {
  mediaKind: WorkspaceMediaKind;
  uri: string;
  title: string;
};

function ImageMediaViewer({ uri, title }: MediaViewerProps) {
  return (
    <Zoomable style={styles.zoomable} maxScale={4} doubleTapScale={2} isDoubleTapEnabled>
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="contain"
        transition={150}
        accessibilityLabel={title}
      />
    </Zoomable>
  );
}

function VideoMediaViewer({ uri }: MediaViewerProps) {
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.play();
  });

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error") {
      setPlaybackError(error?.message ?? "视频无法播放");
    }
  });

  if (playbackError) {
    return <MediaError message={playbackError} />;
  }

  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        nativeControls
        fullscreenOptions={{ enable: true }}
      />
    </View>
  );
}

function MediaError({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function MediaContent({ mediaKind, uri, title }: MediaViewerProps) {
  if (mediaKind === "image") {
    return <ImageMediaViewer mediaKind={mediaKind} uri={uri} title={title} />;
  }

  return <VideoMediaViewer mediaKind={mediaKind} uri={uri} title={title} />;
}

export function MediaViewer() {
  const workspaceId = useCurrentWorkspaceId();
  const { kind, path } = useLocalSearchParams<{
    kind?: string | string[];
    path?: string | string[];
  }>();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const rawMediaKind = Array.isArray(kind) ? kind[0] : kind;
  const filePath = Array.isArray(path) ? path[0] : path;
  const mediaKind: WorkspaceMediaKind | null =
    rawMediaKind === "image" || rawMediaKind === "video" ? rawMediaKind : null;

  useEffect(() => {
    if (!workspaceId || !filePath || !mediaKind) {
      return;
    }

    const targetWorkspaceId = workspaceId;
    const targetPath = filePath;
    let isDisposed = false;

    async function loadMedia() {
      try {
        setIsLoading(true);
        setError(null);
        setMediaUrl(null);

        const workspaceSnapshot = await workspace.get(targetWorkspaceId);
        const nextMediaUrl = resolveWorkspaceFileUrl(workspaceSnapshot, targetPath);

        if (!isDisposed) {
          setMediaUrl(nextMediaUrl);
        }
      } catch (loadError) {
        if (!isDisposed) {
          setError(loadError instanceof Error ? loadError.message : "媒体加载失败");
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    }

    void loadMedia();

    return () => {
      isDisposed = true;
    };
  }, [filePath, mediaKind, workspaceId]);

  if (!workspaceId || !filePath || !mediaKind) {
    return <Redirect href="/" />;
  }

  const title = getFileName(filePath);

  return (
    <>
      <Stack.Screen options={{ title }} />
      <View style={styles.container}>
        {isLoading ? <ActivityIndicator /> : null}
        {!isLoading && error ? <MediaError message={error} /> : null}
        {!isLoading && mediaUrl ? (
          <MediaContent mediaKind={mediaKind} uri={mediaUrl} title={title} />
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    textAlign: "center",
  },
  image: {
    flex: 1,
    width: "100%",
  },
  videoContainer: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  video: {
    aspectRatio: 16 / 9,
    maxHeight: "100%",
    width: "100%",
  },
  zoomable: {
    flex: 1,
  },
});
