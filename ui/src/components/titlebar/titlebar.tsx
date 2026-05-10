import clsx from "clsx";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { isDesktop, isWeb, os } from "@/api/common";
import { TITLE_HEIGHT, getAppTitle } from "@/config";

import { WindowControls } from "./window_controls";

// interface TitleBarProps {}

const TitleLeft = () => {
  const platform = os();
  const isMac = platform === "macos";
  const isWin = platform === "windows" || platform === "linux";
  return (
    <View
      className={clsx(
        "titlebar-title-left",
        isMac && "titlebar-title-left--mac",
        isWin && "titlebar-title-left--win",
      )}
    ></View>
  );
};

const TitleCenter = () => {
  const [title, setTitle] = useState("");
  const platform = os();
  const isMac = platform === "macos";

  useEffect(() => {
    const title = getAppTitle();
    setTitle(title);
    if (isWeb()) {
      document.title = title;
    }
  }, []);
  return (
    <View data-tauri-drag-region className={clsx("titlebar-title-center")}>
      <Text
        data-tauri-drag-region
        style={{
          height: "100%",
          includeFontPadding: false,
          textAlign: "center",
          alignContent: "center",
          textAlignVertical: "center",
        }}
      >
        {!isMac && title}
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
      className={clsx(
        "titlebar-title-right",
        isMac && "titlebar-title-right--mac",
        isWin && "titlebar-title-right--win",
      )}
    ></View>
  );
};

const TitleBar = () => {
  const desktop = isDesktop();
  const platform = os();
  const isMac = platform === "macos";

  if (isMac) {
    // macOS 暂时使用原生标题栏, 因为自定义标题栏时窗口圆角、阴影没了
    return <></>;
  }

  return (
    <>
      {desktop && (
        <View
          data-tauri-drag-region
          className="titlebar-drag-overlay titlebar-drag"
          style={{ height: TITLE_HEIGHT }}
        />
      )}
      <View data-tauri-drag-region className={clsx("titlebar")} style={{ height: TITLE_HEIGHT }}>
        <TitleLeft />
        <TitleCenter />
        <TitleRight />
        {!isMac && <WindowControls />}
      </View>
    </>
  );
};

export { TitleBar };
