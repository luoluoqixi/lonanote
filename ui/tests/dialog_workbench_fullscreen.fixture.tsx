import { expect, mock, test } from "bun:test";
import { Window as DomWindow } from "happy-dom";
import React, { act } from "react";

const dom = new DomWindow();
globalThis.window = dom as unknown as Window;
globalThis.document = dom.document as unknown as Document;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const nativeWindows = new Map(
  ["main", "workspace-window-b", "dialog-window-settings"].map((label) => [
    label,
    {
      label,
      fullscreen: false,
      async isFullscreen() {
        return this.fullscreen;
      },
      async setFullscreen(next: boolean) {
        this.fullscreen = next;
      },
      async onResized() {
        return () => {};
      },
    },
  ]),
);
mock.module("@tauri-apps/api/window", () => ({
  Window: { getByLabel: async (label: string) => nativeWindows.get(label) ?? null },
  getCurrentWindow: () => nativeWindows.get("dialog-window-settings"),
}));
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (command: string) => {
    if (command !== "get_dialog_workbench_label") throw new Error(`未预期的命令 ${command}`);
    return "workspace-window-b";
  },
}));
mock.module("../src/api/common/platform", () => ({ isDesktop: () => true }));
mock.module("../src/hooks/settings/use_ui_preferences", () => ({
  useUiPreferences: () => ({
    preferences: { appearance: { zoomFactor: 1 } },
    updateAndSave: async () => {},
  }),
}));
mock.module("../src/api/common/rn_ui_kit_storage", () => ({ rnUiKitStorageAdapter: {} }));
const { createRoot } = await import("react-dom/client");
const { useDesktopViewActions } = await import("../src/hooks/settings/use_desktop_view_actions");

test("设置中的全屏状态和开关只读写 workspace-window-b", async () => {
  let actions: ReturnType<typeof useDesktopViewActions>;
  function SettingsHarness() {
    actions = useDesktopViewActions();
    return <output>{actions.fullscreen ? "全屏" : "普通"}</output>;
  }
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(<SettingsHarness />);
  });
  await act(async () => {
    await actions!.setFullscreen(true);
  });
  expect(host.textContent).toBe("全屏");
  expect(nativeWindows.get("workspace-window-b")!.fullscreen).toBe(true);
  expect(nativeWindows.get("main")!.fullscreen).toBe(false);
  expect(nativeWindows.get("dialog-window-settings")!.fullscreen).toBe(false);
  await act(async () => {
    await actions!.toggleFullscreen();
  });
  expect(host.textContent).toBe("普通");
  expect(nativeWindows.get("workspace-window-b")!.fullscreen).toBe(false);
  await act(() => root.unmount());
  host.remove();
});
