import { TITLE_HEIGHT } from "@/config";

import "./titlebar.css";
import { WindowControls } from "./window_controls";

// interface TitleBarProps {}

const TitleBar = () => {
  return (
    <>
      <div
        className="titlebar-drag-overlay titlebar-drag fixed top-0 left-0 right-0 bg-transparent"
        style={{ height: `${TITLE_HEIGHT}px` }}
        data-tauri-drag-region
      />
      <div
        className="titlebar fixed top-0 left-0 right-0 bg-transparent"
        style={{ height: `${TITLE_HEIGHT}px` }}
      >
        <WindowControls />
      </div>
    </>
  );
};

export { TitleBar };
