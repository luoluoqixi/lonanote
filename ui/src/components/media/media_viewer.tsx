import { Zoomable } from "@likashefqet/react-native-image-zoom";
import { useHeaderHeight } from "@react-navigation/elements";
import { useEventListener } from "expo";
import { Image } from "expo-image";
import { Redirect, Stack, useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { ExternalLink, Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react-native";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text as NativeText, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import PagerView, { type PagerViewOnPageSelectedEvent } from "react-native-pager-view";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  type DropdownItemData,
  Slider,
  Text,
  useUiColorScheme,
  useUiTheme,
} from "rn-ui-kit";

import { workspace } from "@/api/commands/workspace";
import {
  detectWorkspaceFileKind,
  getFileName,
  isWeb,
  os,
  resolveWorkspaceFileUrl,
} from "@/api/common";
import { getMenuHeaderRightMenuProps } from "@/components/common/header_actions";
import { useOpenInOtherApp } from "@/components/files/open_in_other_app";
import { useMediaNavigation } from "@/hooks/media";
import { useAppBackgroundColors } from "@/hooks/settings";
import { useCurrentWorkspaceId } from "@/hooks/workspace";

export type WorkspaceMediaKind = "image" | "video";

const MEDIA_DISMISS_DISTANCE = 120;
const MEDIA_DISMISS_VELOCITY = 1000;
const MEDIA_INDICATOR_HEIGHT = 48;
const MEDIA_CONTROLS_HEIGHT = 52;
const MEDIA_INDICATOR_GAP = 14;
const MEDIA_VIDEO_FRAME_SHIFT = 32;

type MediaViewerProps = {
  isActive: boolean;
  isMuted: boolean;
  mediaKind: WorkspaceMediaKind;
  onToggleMuted: () => void;
  onToggleUi: () => void;
  isUiVisible: boolean;
  bottomInset: number;
  indicatorLabel: string;
  topInset: number;
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

function ImageMediaViewer({ bottomInset, onToggleUi, topInset, uri, title }: MediaViewerProps) {
  return (
    <GestureDetector
      gesture={Gesture.Tap().onEnd((_event, success) => {
        if (success) runOnJS(onToggleUi)();
      })}
    >
      <Zoomable style={styles.zoomable} maxScale={4} doubleTapScale={2} isDoubleTapEnabled>
        <Image
          source={{ uri }}
          style={[
            styles.image,
            { marginBottom: MEDIA_INDICATOR_HEIGHT + bottomInset, marginTop: topInset },
          ]}
          contentFit="contain"
          transition={150}
          accessibilityLabel={title}
        />
      </Zoomable>
    </GestureDetector>
  );
}

function VideoMediaViewer({
  isActive,
  bottomInset,
  topInset,
  indicatorLabel,
  isMuted,
  isUiVisible,
  onToggleUi,
  onToggleMuted,
  uri,
}: MediaViewerProps) {
  const videoViewRef = useRef<VideoView>(null);
  const isScrubbingRef = useRef(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useVideoPlayer(uri, (videoPlayer) => {
    videoPlayer.loop = false;
    videoPlayer.muted = isMuted;
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

  useEffect(() => {
    player.muted = isMuted;
  }, [isMuted, player]);

  const togglePlayback = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      if (duration > 0 && player.currentTime >= duration - 0.1) {
        player.currentTime = 0;
        setCurrentTime(0);
      }

      player.play();
    }
  }, [duration, player]);

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
    <View
      style={[
        styles.videoContainer,
        {
          paddingTop: topInset,
          paddingBottom:
            MEDIA_CONTROLS_HEIGHT +
            bottomInset +
            MEDIA_INDICATOR_HEIGHT +
            MEDIA_INDICATOR_GAP -
            MEDIA_VIDEO_FRAME_SHIFT,
        },
      ]}
    >
      <View style={styles.videoFrame}>
        <GestureDetector
          gesture={Gesture.Tap().onEnd((_event, success) => {
            if (success) runOnJS(onToggleUi)();
          })}
        >
          <View style={styles.videoFrame}>
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
          </View>
        </GestureDetector>
      </View>
      <View
        pointerEvents={isUiVisible ? "auto" : "none"}
        style={[
          styles.videoControls,
          {
            bottom: 0,
            height: MEDIA_CONTROLS_HEIGHT + bottomInset,
            paddingBottom: bottomInset,
          },
          !isUiVisible && styles.hiddenUi,
        ]}
      >
        <Button
          variant="ghost"
          accessibilityLabel={isPlaying ? "暂停" : "播放"}
          hitSlop={8}
          size="xs"
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
          variant="ghost"
          accessibilityLabel={isMuted ? "取消静音" : "静音"}
          size="xs"
          hitSlop={8}
          onPress={onToggleMuted}
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </Button>
        <Button
          variant="ghost"
          accessibilityLabel="全屏播放"
          size="xs"
          hitSlop={8}
          onPress={enterFullscreen}
        >
          <Maximize size={20} />
        </Button>
      </View>
      <View pointerEvents="none" style={[styles.videoIndicator, !isUiVisible && styles.hiddenUi]}>
        <Text className="text-muted-foreground text-sm">{indicatorLabel}</Text>
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
  const router = useRouter();
  const workspaceId = useCurrentWorkspaceId();
  const insets = useSafeAreaInsets();
  const colorScheme = useUiColorScheme();
  const theme = useUiTheme();
  const appBackgroundColors = useAppBackgroundColors();
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
  const [isMuted, setIsMuted] = useState(true);
  const [isUiVisible, setIsUiVisible] = useState(true);
  const filePath = mediaPaths[activeMediaIndex];
  const mediaKind = filePath ? detectWorkspaceFileKind(filePath) : null;
  const isMedia = mediaKind === "image" || mediaKind === "video";
  const { isOpening, openInOtherApp } = useOpenInOtherApp({ filePath, workspaceId });
  const accentColor = theme.primary as ComponentProps<typeof ExternalLink>["color"];
  const menuItems = useMemo<DropdownItemData[]>(
    () => [
      {
        disabled: isOpening,
        icon: <ExternalLink color={accentColor} size={14} />,
        iconProps: { ios: { name: "arrow.up.forward.app" } },
        label: isOpening ? "正在打开…" : "在其他应用中打开",
        onPress: openInOtherApp,
        value: "open-in-other-app",
      },
    ],
    [accentColor, isOpening, openInOtherApp],
  );
  const dismissTranslationY = useSharedValue(0);
  const isAndroid = os() === "android";
  const isIosDevice = os() === "ios";
  const supportsDragDismiss = isAndroid || isIosDevice;

  const toggleMuted = useCallback(() => {
    setIsMuted((previousIsMuted) => !previousIsMuted);
  }, []);

  const toggleUi = useCallback(() => {
    setIsUiVisible((previousIsUiVisible) => !previousIsUiVisible);
  }, []);

  const dismissMedia = useCallback(() => {
    router.back();
  }, [router]);

  const dismissGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(supportsDragDismiss)
        .activeOffsetY(12)
        .failOffsetX([-20, 20])
        .onUpdate((event) => {
          dismissTranslationY.value = Math.max(event.translationY, 0);
        })
        .onEnd((event) => {
          if (
            event.translationY >= MEDIA_DISMISS_DISTANCE ||
            event.velocityY >= MEDIA_DISMISS_VELOCITY
          ) {
            runOnJS(dismissMedia)();
            return;
          }

          dismissTranslationY.value = withSpring(0, {
            damping: 20,
            stiffness: 220,
          });
        }),
    [dismissMedia, dismissTranslationY, supportsDragDismiss],
  );

  const dismissAnimatedStyle = useAnimatedStyle(() => {
    const progress = Math.min(dismissTranslationY.value / MEDIA_DISMISS_DISTANCE, 1);

    return {
      opacity: 1 - progress * 0.35,
      transform: [{ translateY: dismissTranslationY.value }, { scale: 1 - progress * 0.04 }],
    };
  });

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
          ...getMenuHeaderRightMenuProps({ menuItems, labelColor: theme.primary }),
          headerBackVisible: isUiVisible,
          headerShown: true,
          headerTransparent: true,
          headerStyle: {
            backgroundColor: "transparent",
          },
          headerTintColor: isUiVisible ? theme.primary : "transparent",
          headerTitleStyle: {
            color: isUiVisible ? theme.foreground : "transparent",
          },
          headerShadowVisible: false,
          statusBarStyle: isUiVisible ? (colorScheme === "dark" ? "light" : "dark") : "light",
          title: isUiVisible ? title : "",
        }}
      />
      <View
        pointerEvents="none"
        style={[styles.headerMask, { backgroundColor: "transparent" }, { height: headerHeight }]}
      />
      <GestureDetector gesture={dismissGesture}>
        <Animated.View
          style={[
            styles.container,
            dismissAnimatedStyle,
            { backgroundColor: isUiVisible ? appBackgroundColors.screen : "#000000" },
          ]}
        >
          <View style={styles.mediaContent}>
            {isLoading ? <ActivityIndicator /> : null}
            {!isLoading && error ? <MediaError message={error} /> : null}
            {!isLoading && !error ? (
              <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={initialMediaIndex}
                offscreenPageLimit={1}
                overdrag
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
                        isMuted={isMuted}
                        mediaKind={pageKind}
                        onToggleMuted={toggleMuted}
                        onToggleUi={toggleUi}
                        isUiVisible={isUiVisible}
                        bottomInset={insets.bottom}
                        indicatorLabel={`${index + 1} / ${mediaPaths.length}`}
                        topInset={headerHeight}
                        uri={pageUrl}
                        title={getFileName(mediaPath)}
                      />
                    </View>
                  );
                })}
              </PagerView>
            ) : null}
          </View>
          {mediaKind !== "video" ? (
            <View
              style={[
                styles.positionIndicator,
                {
                  bottom: 0,
                  height: MEDIA_INDICATOR_HEIGHT + insets.bottom,
                  paddingBottom: insets.bottom,
                },
                !isUiVisible && styles.hiddenUi,
              ]}
            >
              <Text className="text-muted-foreground text-sm">
                {activeMediaIndex + 1} / {mediaPaths.length}
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </GestureDetector>
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
  hiddenUi: {
    opacity: 0,
  },
  headerMask: {
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
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
    position: "absolute",
    left: 0,
    right: 0,
  },
  video: {
    flex: 1,
    width: "100%",
  },
  videoContainer: {
    flex: 1,
  },
  videoFrame: {
    flex: 1,
  },
  videoIndicator: {
    alignItems: "center",
    bottom: MEDIA_CONTROLS_HEIGHT + MEDIA_INDICATOR_GAP,
    height: MEDIA_INDICATOR_HEIGHT,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
  },
  videoControls: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    paddingHorizontal: 12,
    position: "absolute",
    left: 0,
    right: 0,
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
