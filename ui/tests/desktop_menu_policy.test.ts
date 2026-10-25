import { expect, test } from "bun:test";

import { resolveDesktopContextMenuNative } from "../src/api/common/desktop_menu_policy";

test("桌面模式仅 macOS 使用原生右键菜单，移动模式沿用各平台默认行为", () => {
  for (const platform of ["windows", "linux", "ios", "android", "web"]) {
    expect(resolveDesktopContextMenuNative("desktop", platform)).toBe(false);
    expect(resolveDesktopContextMenuNative("mobile", platform)).toBeUndefined();
  }
  expect(resolveDesktopContextMenuNative("desktop", "macos")).toBe(true);
  expect(resolveDesktopContextMenuNative("mobile", "macos")).toBeUndefined();
});
