import { Zoomable } from "@likashefqet/react-native-image-zoom";
import { useHeaderHeight } from "@react-navigation/elements";
import { Maximize, Pause, Play } from "@tamagui/lucide-icons-2";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text as NativeText, StyleSheet, View } from "react-native";
import PagerView, { type PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Slider, Text } from "rn-ui-kit";

import { workspace } from "@/api/commands/workspace";
import {
  detectWorkspaceFileKind,
  getFileName,
  isWeb,
  os,
  resolveWorkspaceFileUrl,
} from "@/api/common";
import { OpenInOtherAppMenu, useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useMediaNavigation } from "@/hooks/media";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

export type WorkspaceMediaKind = "image" | "video";

type MediaViewerProps = {
  isActive: boolean;
  mediaKind: WorkspaceMediaKind;
  uri: string;
  title: string;
};

function getFirstParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getMediaPaths(
  fallbackPath: string,
  mediaSequence: { mediaPaths: string[]; workspaceId: string } | null,
  workspaceId: string | null,
): string[] {
  if (
    mediaSequence?.workspaceId === workspaceId &&
    mediaSequence.mediaPaths.includes(fallbackPath)
  ) {
    return mediaSequence.mediaPaths;
  }

  return [fallbackPath];
}

function getMediaIndex(
  rawMediaIndex: string | undefined,
  mediaPaths: string[],
  fallbackPath: string,
): number {
  const requestedIndex = Number.parseInt(rawMediaIndex ?? "", 10);
  if (
    Number.isInteger(requestedIndex) &&
    requestedIndex >= 0 &&
    requestedIndex < mediaPaths.length &&
    mediaPaths[requestedIndex] === fallbackPath
  ) {
    return requestedIndex;
  }

  return Math.max(mediaPaths.indexOf(fallbackPath), 0);
}

function formatVideoTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(value);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minutePart = String(minutes).padStart(hours > 0 ? 2 : 1, "0");
  const secondPart = String(seconds).padStart(2, "0");

  return hours > 0 ? `${hours}:${minutePart}:${secondPart}` : `${minutePart}:${secondPart}`;
}

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

function VideoMediaViewer({ isActive, uri }: MediaViewerProps) {
  const videoViewRef = useRef<VideoView>(null);
  const isScrubbingRef = useRef(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.timeUpdateEventInterval = 0.25;
  });

  useEventListener(player, "statusChange", ({ status, error }) => {
    if (status === "error") {
      setPlaybackError(error?.message ?? "视频无法播放");
    }
  });

  useEventListener(player, "playingChange", ({ isPlaying: nextIsPlaying }) => {
    setIsPlaying(nextIsPlaying);
  });

  useEventListener(player, "sourceLoad", ({ duration: nextDuration }) => {
    setDuration(Number.isFinite(nextDuration) && nextDuration > 0 ? nextDuration : 0);
  });

  useEventListener(player, "timeUpdate", ({ currentTime: nextCurrentTime }) => {
    if (!isScrubbingRef.current) {
      setCurrentTime(nextCurrentTime);
    }
  });

  useEffect(() => {
    if (isActive) {
      player.play();
      return;
    }

    player.pause();
  }, [isActive, player]);

  const togglePlayback = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const updateScrubbingTime = useCallback((nextValue: number[]) => {
    isScrubbingRef.current = true;
    setCurrentTime(nextValue[0] ?? 0);
  }, []);

  const completeScrubbing = useCallback(
    (nextValue: number[]) => {
      const nextTime = Math.min(Math.max(nextValue[0] ?? 0, 0), duration);
      player.currentTime = nextTime;
      isScrubbingRef.current = false;
      setCurrentTime(nextTime);
    },
    [duration, player],
  );

  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
    requestAnimationFrame(() => {
      void videoViewRef.current?.enterFullscreen().catch((error: unknown) => {
        setIsFullscreen(false);
        console.error("[media-viewer] enter fullscreen failed", error);
      });
    });
  }, []);

  if (playbackError) {
    return <MediaError message={playbackError} />;
  }

  const progressMaximum = duration > 0 ? duration : 1;
  const progressValue = Math.min(Math.max(currentTime, 0), progressMaximum);

  return (
    <View style={styles.videoContainer}>
      <VideoView
        ref={videoViewRef}
        player={player}
        style={styles.video}
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        nativeControls={isFullscreen}
        onFullscreenEnter={() => setIsFullscreen(true)}
        onFullscreenExit={() => setIsFullscreen(false)}
      />
      <View style={styles.videoControls}>
        <Button
          accessibilityLabel={isPlaying ? "暂停" : "播放"}
          chromeless
          circular
          hitSlop={8}
          onPress={togglePlayback}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </Button>
        <NativeText style={styles.videoTime}>{formatVideoTime(progressValue)}</NativeText>
        <View style={styles.videoProgress}>
          <Slider
            disabled={duration <= 0}
            max={progressMaximum}
            min={0}
            native
            onValueChange={updateScrubbingTime}
            onValueChangeFinished={completeScrubbing}
            step={0}
            value={[progressValue]}
          />
        </View>
        <NativeText style={styles.videoTime}>{formatVideoTime(duration)}</NativeText>
        <Button
          accessibilityLabel="全屏播放"
          chromeless
          circular
          hitSlop={8}
          onPress={enterFullscreen}
        >
          <Maximize size={20} />
        </Button>
      </View>
    </View>
  );
}

function MediaError({ message }: { message: string }) {
  return (
    <View style={styles.centered}>
      <NativeText style={styles.errorText}>{message}</NativeText>
    </View>
  );
}

function MediaContent(props: MediaViewerProps) {
  if (props.mediaKind === "image") {
    return <ImageMediaViewer {...props} />;
  }

  return <VideoMediaViewer {...props} />;
}

export function MediaViewer() {
  const pagerRef = useRef<PagerView>(null);
  const headerHeight = useHeaderHeight();
  const workspaceId = useCurrentWorkspaceId();
  const insets = useSafeAreaInsets();
  const { mediaSequence } = useMediaNavigation();
  const { mediaIndex: rawMediaIndex, path } = useLocalSearchParams<{
    mediaIndex?: string | string[];
    path?: string | string[];
  }>();
  const fallbackPath = getFirstParamValue(path);
  const mediaPaths = useMemo(
    () => (fallbackPath ? getMediaPaths(fallbackPath, mediaSequence, workspaceId) : []),
    [fallbackPath, mediaSequence, workspaceId],
  );
  const initialMediaIndex = getMediaIndex(
    getFirstParamValue(rawMediaIndex),
    mediaPaths,
    fallbackPath ?? "",
  );
  const [activeMediaIndex, setActiveMediaIndex] = useState(initialMediaIndex);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const filePath = mediaPaths[activeMediaIndex];
  const mediaKind = filePath ? detectWorkspaceFileKind(filePath) : null;
  const isMedia = mediaKind === "image" || mediaKind === "video";
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });

  useEffect(() => {
    setActiveMediaIndex(initialMediaIndex);
    pagerRef.current?.setPageWithoutAnimation(initialMediaIndex);
  }, [initialMediaIndex]);

  useEffect(() => {
    if (!workspaceId || mediaPaths.length === 0) {
      return;
    }

    const targetWorkspaceId = workspaceId;
    let isDisposed = false;

    async function loadMediaUrls() {
      try {
        setIsLoading(true);
        setError(null);
        const workspaceSnapshot = await workspace.get(targetWorkspaceId);
        const nextMediaUrls = Object.fromEntries(
          mediaPaths.map((mediaPath) => [
            mediaPath,
            resolveWorkspaceFileUrl(workspaceSnapshot, mediaPath),
          ]),
        );

        if (!isDisposed) {
          setMediaUrls(nextMediaUrls);
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

    void loadMediaUrls();

    return () => {
      isDisposed = true;
    };
  }, [mediaPaths, workspaceId]);

  const selectPage = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= 0 && nextIndex < mediaPaths.length) {
        pagerRef.current?.setPage(nextIndex);
      }
    },
    [mediaPaths.length],
  );

  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    setActiveMediaIndex(event.nativeEvent.position);
  }, []);

  useEffect(() => {
    if (!isWeb()) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectPage(activeMediaIndex - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectPage(activeMediaIndex + 1);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [activeMediaIndex, selectPage]);

  if (!workspaceId || !filePath || !isMedia) {
    return <Redirect href="/" />;
  }

  const title = getFileName(filePath);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <OpenInOtherAppMenu
              accessibilityLabel="媒体文件操作"
              isOpening={isOpening}
              onOpenInOtherApp={openInOtherApp}
            />
          ),
          title,
        }}
      />
      <View style={[styles.container, os() === "ios" && { paddingTop: headerHeight }]}>
        <View style={styles.mediaContent}>
          {isLoading ? <ActivityIndicator /> : null}
          {!isLoading && error ? <MediaError message={error} /> : null}
          {!isLoading && !error ? (
            <PagerView
              ref={pagerRef}
              style={styles.pager}
              initialPage={initialMediaIndex}
              offscreenPageLimit={1}
              onPageSelected={handlePageSelected}
            >
              {mediaPaths.map((mediaPath, index) => {
                const pageKind = detectWorkspaceFileKind(mediaPath);
                const pageUrl = mediaUrls[mediaPath];
                if ((pageKind !== "image" && pageKind !== "video") || !pageUrl) {
                  return <View key={mediaPath} style={styles.page} />;
                }

                return (
                  <View key={mediaPath} style={styles.page}>
                    <MediaContent
                      isActive={index === activeMediaIndex}
                      mediaKind={pageKind}
                      uri={pageUrl}
                      title={getFileName(mediaPath)}
                    />
                  </View>
                );
              })}
            </PagerView>
          ) : null}
        </View>
        <View style={[styles.positionIndicator, { paddingBottom: insets.bottom + 16 }]}>
          <Text color="$gray11" fontSize="$3">
            {activeMediaIndex + 1} / {mediaPaths.length}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  container: {
    flex: 1,
  },
  errorText: {
    color: "#dc2626",
    textAlign: "center",
  },
  image: {
    flex: 1,
    width: "100%",
  },
  mediaContent: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  positionIndicator: {
    alignItems: "center",
    minHeight: 32,
    paddingHorizontal: 24,
    paddingTop: 6,
  },
  video: {
    flex: 1,
    width: "100%",
  },
  videoContainer: {
    flex: 1,
  },
  videoControls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  videoProgress: {
    flex: 1,
    minWidth: 0,
  },
  videoTime: {
    fontSize: 12,
    fontVariant: ["tabular-nums"],
    minWidth: 36,
    textAlign: "center",
  },
  zoomable: {
    flex: 1,
  },
});
