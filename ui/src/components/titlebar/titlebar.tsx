import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { isDesktop, isWeb, os } from "@/api/common";
import { TITLE_HEIGHT, getAppTitle } from "@/config";
import { useSeparatorColor } from "@/hooks/ui/use_separator_color";

import { WindowControls } from "./window_controls";

const TitleLeft = () => {
  const platform = os();
  const isMac = platform === "macos";
  const isWin = platform === "windows" || platform === "linux";
  return (
    <View style={[styles.titleSide, isMac && styles.titleLeftMac, isWin && styles.titleLeftWin]} />
  );
};

const TitleCenter = () => {
  const [title, setTitle] = useState("");

  useEffect(() => {
    const title = getAppTitle();
    setTitle(title);
    if (isWeb()) {
      document.title = title;
    }
  }, []);
  return (
    <View data-tauri-drag-region style={styles.titleCenter}>
      <Text data-tauri-drag-region style={styles.titleText}>
        {title}
      </Text>
    </View>
  );
};

const TitleRight = () => {
  const platform = os();
  const isMac = platform === "macos";
  const isWin = platform === "windows" || platform === "linux";

  return (
    <View
      style={[
        styles.titleSide,
        styles.titleRight,
        isMac && styles.titleRightMac,
        isWin && styles.titleRightWin,
      ]}
    />
  );
};

const TitleBar = () => {
  const desktop = isDesktop();
  const platform = os();
  const isMac = platform === "macos";
  const separatorColor = useSeparatorColor();

  return (
    <>
      {desktop && (
        <View
          data-tauri-drag-region
          style={[styles.dragOverlay, styles.dragRegion, { height: TITLE_HEIGHT }]}
        />
      )}
      <View
        data-tauri-drag-region
        style={[styles.titlebar, { borderBottomColor: separatorColor, height: TITLE_HEIGHT }]}
      >
        <TitleLeft />
        <TitleCenter />
        <TitleRight />
        {!isMac && <WindowControls />}
      </View>
    </>
  );
};

export { TitleBar };

const styles = StyleSheet.create({
  dragOverlay: {
    backgroundColor: "transparent",
    left: 0,
    position: "fixed" as "absolute",
    right: 0,
    top: 0,
    userSelect: "none" as never,
    zIndex: 9998,
  },
  dragRegion: {
    WebkitAppRegion: "drag",
    appRegion: "drag",
    pointerEvents: "auto",
  } as never,
  titlebar: {
    WebkitAppRegion: "drag",
    appRegion: "drag",
    backgroundColor: "var(--background)",
    borderBottomWidth: 1,
    flexDirection: "row",
    pointerEvents: "auto",
    position: "relative",
    userSelect: "none" as never,
    width: "100%",
    zIndex: 9999,
  } as never,
  titleCenter: {
    alignItems: "center",
    display: "flex",
    height: "100%",
    left: "50%",
    position: "absolute",
    transform: [{ translateX: "-50%" as never }],
  },
  titleLeftMac: {
    marginLeft: 80,
  },
  titleLeftWin: {
    marginLeft: 0,
  },
  titleRight: {
    marginLeft: "auto",
    marginRight: 0,
  },
  titleRightMac: {
    marginRight: 0,
  },
  titleRightWin: {
    marginRight: 46 * 3,
  },
  titleSide: {
    alignItems: "center",
    color: "var(--foreground)",
    display: "flex",
    height: "100%",
  },
  titleText: {
    alignContent: "center",
    color: "color-mix(in srgb, var(--foreground) 85%, transparent)",
    fontSize: 14,
    fontWeight: "500",
    height: "100%",
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
  },
});
