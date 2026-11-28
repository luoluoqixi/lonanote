import { expect, test } from "bun:test";

import {
  resolveDesktopContextMenuNative,
  resolveDesktopMenuBackend,
} from "../src/api/common/desktop_menu_policy";

test("三个桌面系统的右键菜单跟随统一外观设置，移动布局保留平台默认", () => {
  for (const platform of ["windows", "linux", "macos"]) {
    expect(resolveDesktopContextMenuNative("desktop", platform)).toBe(platform === "macos");
    expect(resolveDesktopContextMenuNative("desktop", platform, "app")).toBe(false);
    expect(resolveDesktopContextMenuNative("desktop", platform, "system")).toBe(true);
    expect(resolveDesktopContextMenuNative("mobile", platform)).toBeUndefined();
    expect(resolveDesktopContextMenuNative("mobile", platform, "app")).toBeUndefined();
  }
  for (const platform of ["ios", "android", "web"]) {
    expect(resolveDesktopContextMenuNative("desktop", platform)).toBe(false);
    expect(resolveDesktopContextMenuNative("mobile", platform)).toBeUndefined();
  }
});

test("Windows/Linux 使用 WcPopup，macOS 使用 Tauri，其余平台不进入桌面菜单", () => {
  expect(resolveDesktopMenuBackend("windows")).toBe("wcpopup");
  expect(resolveDesktopMenuBackend("linux")).toBe("wcpopup");
  expect(resolveDesktopMenuBackend("macos")).toBe("tauri");
  expect(resolveDesktopMenuBackend("android")).toBeUndefined();
  expect(resolveDesktopMenuBackend("ios")).toBeUndefined();
  expect(resolveDesktopMenuBackend("web")).toBeUndefined();
});
