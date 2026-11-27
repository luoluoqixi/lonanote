import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, useSyncExternalStore } from "react";

import { createDirectoryPickerModel } from "../src/components/workspaces/directory_picker/directory_picker_model";

const browser = new Window();
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
const flatten = (style: any): any =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style;
const View = ({ children, style }: any) => <div style={flatten(style)}>{children}</div>;
mock.module("react-native", () => ({
  View,
  ScrollView: View,
  Pressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
  StyleSheet: { create: (style: any) => style, hairlineWidth: 1 },
  useWindowDimensions: () => ({ width: 1000, height: 800 }),
}));
const NativeSheetStack = Object.assign(
  ({ children, open }: any) => (open ? <section data-sheet>{children}</section> : null),
  { Screen: ({ children }: any) => children() },
);
mock.module("rn-ui-kit", () => ({
  Text: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onPress, disabled }: any) => (
    <button onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
  Spinner: () => null,
  Input: () => <input />,
  Dialog: ({ content, open, onOpenChange }: any) =>
    open ? (
      <section role="dialog">
        <button onClick={() => onOpenChange(false)}>关闭弹窗</button>
        {content}
      </section>
    ) : null,
  NativeSheetStack,
  getNativeStackScrollEdgeHeaderOptions: () => ({}),
  useUiTheme: () => ({ foreground: "black", border: "gray" }),
  useAppBackgroundColors: () => ({ sheet: "white" }),
}));
mock.module("lucide-react-native", () => ({
  ChevronDown: () => null,
  ChevronRight: () => null,
  Folder: () => null,
  FolderOpen: () => null,
}));
mock.module("../src/components/files/file_path_tooltip", () => ({
  FilePathTooltip: ({ children }: any) => children,
}));
mock.module("../src/api/common/platform", () => ({ isDesktop: () => true, isTauri: () => true }));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ label: "main" }),
}));
let layoutMode = "desktop";
mock.module("../src/hooks/layout", () => ({ useLayoutMode: () => ({ layoutMode }) }));
mock.module("../src/hooks/settings", () => ({
  // 模拟升级前留下的旧配置，不能再触发创建窗口。
  useUiPreferences: () => ({ preferences: { window: { nativeDialogs: true }, developer: {} } }),
}));
mock.module("../src/hooks/workspace/use_workspace_session", () => ({
  useCurrentWorkspaceId: () => null,
}));
const page = {
  id: "global",
  title: "全局设置",
  desktopTab: true,
  Component: () => <p>设置内容</p>,
};
mock.module("../src/components/settings/settings_config", () => ({
  settingsPages: [page],
  getSettingsPage: () => page,
}));
const picker = createDirectoryPickerModel(async () => []);
mock.module("../src/hooks/workspace/use_workspace_directory_picker", () => ({
  workspaceDirectoryPicker: picker,
  useWorkspaceDirectoryPicker: () => useSyncExternalStore(picker.subscribe, picker.getSnapshot),
}));
let createdWindows = 0;
mock.module("@tauri-apps/api/core", () => ({
  invoke: async () => {
    createdWindows++;
  },
}));
const { createRoot } = await import("react-dom/client");
const { DirectoryPickerHost } =
  await import("../src/components/workspaces/directory_picker/directory_picker_host");
const { DesktopSettingsDialog } =
  await import("../src/components/settings/desktop/settings_dialog");
const { AdaptiveModal } = await import("../src/components/common/adaptive_modal");

test("目录选择直接显示在主界面，取消、完成后均可重开", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(() => root.render(<DirectoryPickerHost />));
    for (const purpose of ["move", "copy", "move"] as const) {
      let result!: Promise<unknown>;
      await act(async () => {
        result = picker.request({ workspaceId: "w", purpose });
      });
      expect(container.querySelector('[role="dialog"]')).not.toBeNull();
      const label = purpose === "copy" ? "确定" : "取消";
      await act(() => {
        Array.from(container.querySelectorAll("button"))
          .find((b) => b.textContent === label)!
          .click();
      });
      expect(await result).toEqual(purpose === "copy" ? { directory: "" } : null);
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    }
    expect(createdWindows).toBe(0);
  } finally {
    await act(() => root.unmount());
  }
});

test("设置在当前界面打开，关闭回调生效", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const changes: boolean[] = [];
  try {
    await act(() =>
      root.render(<DesktopSettingsDialog isOpen onOpenChange={(v) => changes.push(v)} />),
    );
    expect(container.textContent).toContain("设置内容");
    await act(() => {
      container.querySelector("button")!.click();
    });
    expect(changes).toEqual([false]);
    expect(createdWindows).toBe(0);
  } finally {
    await act(() => root.unmount());
  }
});

test("移动布局继续使用 NativeSheetStack", async () => {
  layoutMode = "mobile";
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(() =>
      root.render(
        <AdaptiveModal name="example" open onOpenChange={() => {}}>
          <p>移动内容</p>
        </AdaptiveModal>,
      ),
    );
    expect(container.querySelector("[data-sheet]")?.textContent).toBe("移动内容");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    layoutMode = "desktop";
    await act(() => root.unmount());
  }
});
