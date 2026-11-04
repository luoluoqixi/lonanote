import { expect, test } from "bun:test";

import { getViewShortcutAction } from "../assets/editor/src/bridge/view_shortcuts";
import { clampWindowZoom, stepWindowZoom } from "../src/api/common/window_zoom";
import { createFullscreenActions } from "../src/hooks/settings/desktop_fullscreen_actions";

test("缩放使用 25%–500% 范围，步进 10%，无效输入恢复实际大小", () => {
  expect(clampWindowZoom(0)).toBe(0.25);
  expect(clampWindowZoom(9)).toBe(5);
  expect(clampWindowZoom(NaN)).toBe(1);
  expect(stepWindowZoom(1, 1)).toBe(1.1);
  expect(stepWindowZoom(1, -1)).toBe(0.9);
  expect(stepWindowZoom(5, 1)).toBe(5);
});

test("全屏连续切换串行读取真实窗口状态，失败不发布错误状态并可重试", async () => {
  let fullscreen = false;
  let fail = false;
  const published: boolean[] = [];
  const actions = createFullscreenActions({
    get: async () => fullscreen,
    set: async (next) => {
      if (fail) throw Error("失败");
      fullscreen = next;
    },
    publish: (next) => {
      published.push(next);
    },
  });
  await Promise.all([actions.toggle(), actions.toggle()]);
  expect(published).toEqual([true, false]);
  fail = true;
  await expect(actions.set(true)).rejects.toThrow("失败");
  expect(published).toEqual([true, false]);
  fail = false;
  await actions.set(true);
  expect(published.at(-1)).toBe(true);
});

test("视图快捷键识别主键盘、小键盘；避开 AltGr、输入法与全屏重复按键", () => {
  const key = (key: string, extra = {}) => ({
    key,
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    repeat: false,
    isComposing: false,
    ...extra,
  });
  expect(getViewShortcutAction(key("="), "windows")).toBe("zoomIn");
  expect(getViewShortcutAction(key("+"), "linux")).toBe("zoomIn");
  expect(getViewShortcutAction(key("Subtract"), "windows")).toBe("zoomOut");
  expect(getViewShortcutAction(key("0"), "windows")).toBe("zoomReset");
  expect(getViewShortcutAction(key("F11", { ctrlKey: false }), "windows")).toBe("toggleFullscreen");
  expect(getViewShortcutAction(key("F11", { ctrlKey: false, repeat: true }), "windows")).toBeNull();
  expect(getViewShortcutAction(key("+", { altKey: true }), "windows")).toBeNull();
  expect(getViewShortcutAction(key("+", { isComposing: true }), "windows")).toBeNull();
});
