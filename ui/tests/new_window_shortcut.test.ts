import { expect, test } from "bun:test";

import { getViewShortcutAction } from "../assets/editor/src/bridge/view_shortcuts";

test("新建窗口快捷键按平台识别，忽略重复、输入法和多余修饰键", () => {
  const key = {
    key: "N",
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    altKey: false,
    repeat: false,
    isComposing: false,
  };
  expect(getViewShortcutAction(key, "windows")).toBe("newWindow");
  expect(getViewShortcutAction(key, "linux")).toBe("newWindow");
  expect(getViewShortcutAction({ ...key, ctrlKey: false, metaKey: true }, "macos")).toBe(
    "newWindow",
  );
  for (const overrides of [
    { shiftKey: false },
    { repeat: true },
    { altKey: true },
    { isComposing: true },
    { metaKey: true },
  ]) {
    expect(getViewShortcutAction({ ...key, ...overrides }, "windows")).toBeNull();
  }
});
