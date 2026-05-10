import clsx from "clsx";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { isWeb, os } from "@/api/common";
import { TITLE_HEIGHT, getAppTitle } from "@/config";

import "./titlebar.css";
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

  useEffect(() => {
    const title = getAppTitle();
    setTitle(title);
    if (isWeb()) {
      document.title = title;
    }
  }, []);
  return (
    <View className="titlebar-title-center">
      {/* <img src={favicon} width={20} alt="favicon" /> */}
      <Text style={{ height: "100%", alignContent: "center" }}>{title}</Text>
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
  return (
    <>
      <View
        className="titlebar-drag-overlay titlebar-drag"
        style={{
          height: TITLE_HEIGHT,
        }}
        data-tauri-drag-region
      />
      <View className="titlebar" style={{ height: TITLE_HEIGHT }}>
        <TitleLeft />
        <TitleCenter />
        <TitleRight />
        <WindowControls />
      </View>
    </>
  );
};

export { TitleBar };
