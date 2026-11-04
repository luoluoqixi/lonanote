import { DEFAULT_DESKTOP_WINDOW_SIZE } from "../../api/common/desktop_layout";

type Position = { x: number; y: number };

export async function resetDesktopWindowSize(window: {
  getPosition(): Promise<Position>;
  exitFullscreen(): Promise<void>;
  unmaximize(): Promise<void>;
  setSize(size: { width: number; height: number }): Promise<void>;
  setPosition(position: Position): Promise<void>;
}) {
  const position = await window.getPosition();
  await window.exitFullscreen();
  await window.unmaximize();
  try {
    await window.setSize(DEFAULT_DESKTOP_WINDOW_SIZE);
  } finally {
    // 退出最大化、全屏或调整尺寸时，系统可能同时移动窗口。
    await window.setPosition(position);
  }
}
