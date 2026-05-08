import { TITLE_HEIGHT } from "@/config";

import "./titlebar.css";
import { WindowControls } from "./window_controls";

// interface TitleBarProps {}

const TitleBar = () => {
  return (
    <>
      <div
        className="titlebar-drag-overlay titlebar-drag"
        style={{ height: `${TITLE_HEIGHT}px` }}
        data-tauri-drag-region
      />
      <div className="titlebar" style={{ height: `${TITLE_HEIGHT}px` }}>
        <WindowControls />
      </div>
    </>
  );
};

export { TitleBar };
