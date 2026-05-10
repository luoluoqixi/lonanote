import clsx from "clsx";
import { useEffect, useState } from "react";

import { os } from "@/api/common";
import { TITLE_HEIGHT, getAppTitle } from "@/config";

import "./titlebar.css";
import { WindowControls } from "./window_controls";

// interface TitleBarProps {}

const TitleLeft = () => {
  const platform = os();
  const isMac = platform === "macos";
  const isWin = platform === "windows" || platform === "linux";
  return (
    <div
      className={clsx(
        "titlebar-title-left",
        isMac && "titlebar-title-left--mac",
        isWin && "titlebar-title-left--win",
      )}
    ></div>
  );
};

const TitleCenter = () => {
  const [title, setTitle] = useState("");

  useEffect(() => {
    const title = getAppTitle();
    setTitle(title);
    document.title = title;
  }, []);
  return (
    <div className="titlebar-title-center">
      {/* <img src={favicon} width={20} alt="favicon" /> */}
      {title}
    </div>
  );
};

const TitleRight = () => {
  const platform = os();
  const isMac = platform === "macos";
  const isWin = platform === "windows" || platform === "linux";

  return (
    <div
      className={clsx(
        "titlebar-title-right",
        isMac && "titlebar-title-right--mac",
        isWin && "titlebar-title-right--win",
      )}
    ></div>
  );
};

const TitleBar = () => {
  return (
    <>
      <div
        className="titlebar-drag-overlay titlebar-drag"
        style={{ height: `${TITLE_HEIGHT}px` }}
        data-tauri-drag-region
      />
      <div className="titlebar" style={{ height: `${TITLE_HEIGHT}px` }}>
        <TitleLeft />
        <TitleCenter />
        <TitleRight />
        <WindowControls />
      </div>
    </>
  );
};

export { TitleBar };
