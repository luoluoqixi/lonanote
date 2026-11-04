import { expect, test } from "bun:test";

import { resetDesktopWindowSize } from "../src/hooks/settings/desktop_layout_reset";

test("重置窗口尺寸退出全屏和最大化，并保留操作前的位置", async () => {
  let position = { x: 350, y: 180 };
  let size = { width: 1800, height: 1000 };
  let fullscreen = true;
  let maximized = true;
  await resetDesktopWindowSize({
    getPosition: async () => ({ ...position }),
    exitFullscreen: async () => {
      fullscreen = false;
      position = { x: 0, y: 0 };
    },
    unmaximize: async () => {
      maximized = false;
      position = { x: 10, y: 20 };
    },
    setSize: async (next) => {
      size = next;
    },
    setPosition: async (next) => {
      position = next;
    },
  });
  expect(size).toEqual({ width: 1024, height: 576 });
  expect(position).toEqual({ x: 350, y: 180 });
  expect(fullscreen).toBe(false);
  expect(maximized).toBe(false);
});
