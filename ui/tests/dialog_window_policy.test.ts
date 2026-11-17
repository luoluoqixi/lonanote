import { expect, test } from "bun:test";

import { shouldUseNativeDialogWindow } from "../src/api/common/dialogs/dialog_window_policy";

test("只有启用原生弹窗的 Tauri 桌面布局才打开原生 Dialog 窗口", () => {
  expect(
    shouldUseNativeDialogWindow({
      desktop: true,
      tauri: true,
      layoutMode: "desktop",
      nativeDialogs: true,
      dialogRegistered: true,
    }),
  ).toBe(true);
  for (const options of [
    { desktop: false, tauri: true, layoutMode: "desktop" as const },
    { desktop: true, tauri: false, layoutMode: "desktop" as const },
    { desktop: true, tauri: true, layoutMode: "mobile" as const },
    { desktop: true, tauri: true, layoutMode: "desktop" as const, nativeDialogs: false },
    { desktop: true, tauri: true, layoutMode: "desktop" as const, dialogRegistered: false },
  ]) {
    expect(
      shouldUseNativeDialogWindow({
        desktop: false,
        tauri: false,
        layoutMode: "mobile",
        nativeDialogs: true,
        dialogRegistered: true,
        ...options,
      }),
    ).toBe(false);
  }
});
