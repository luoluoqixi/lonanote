import { expect, test } from "bun:test";

import { resolveDesktopContextMenuNative } from "../src/api/common/desktop_menu_policy";

test("三个桌面系统默认原生，各平台可用 boolean 切回自定义", () => {
  for (const platform of ["windows", "linux", "macos"]) {
    expect(resolveDesktopContextMenuNative("desktop", platform)).toBe(true);
    expect(resolveDesktopContextMenuNative("desktop", platform, true)).toBe(false);
    expect(resolveDesktopContextMenuNative("desktop", platform, false)).toBe(true);
    expect(resolveDesktopContextMenuNative("mobile", platform)).toBeUndefined();
  }
  for (const platform of ["ios", "android", "web"]) {
    expect(resolveDesktopContextMenuNative("desktop", platform)).toBe(false);
    expect(resolveDesktopContextMenuNative("mobile", platform)).toBeUndefined();
  }
});
