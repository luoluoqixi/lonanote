import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, useSyncExternalStore } from "react";

import { createDirectoryPickerModel } from "../src/components/workspaces/directory_picker/directory_picker_model";

const win = new Window();
Object.assign(globalThis, {
  window: win,
  document: win.document,
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
mock.module("rn-ui-kit", () => ({
  Text: ({ children }: any) => <span>{children}</span>,
  Button: ({ children, onPress, disabled }: any) => (
    <button onClick={onPress} disabled={disabled}>
      {children}
    </button>
  ),
  Spinner: () => null,
  Input: () => <input />,
  Dialog: ({ content }: any) => <div>{content}</div>,
  NativeSheetStack: () => null,
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
mock.module("../src/api/common/platform", () => ({
  isDesktop: () => true,
  isTauri: () => true,
}));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ label: "main" }),
}));
mock.module("../src/hooks/layout", () => ({ useLayoutMode: () => ({ layoutMode: "desktop" }) }));
mock.module("../src/hooks/settings", () => ({
  useUiPreferences: () => ({ preferences: { window: { nativeDialogs: true } } }),
}));
let loadDirectory: () => Promise<
  { path: string; metadata: { kind: "directory" } }[]
> = async () => [];
const picker = createDirectoryPickerModel(() => loadDirectory());
mock.module("../src/hooks/workspace/use_workspace_directory_picker", () => ({
  workspaceDirectoryPicker: picker,
  useWorkspaceDirectoryPicker: () => useSyncExternalStore(picker.subscribe, picker.getSnapshot),
}));
const requests: { request: any; signal: AbortSignal; finish: (value: unknown) => void }[] = [];
mock.module("../src/api/commands/win/dialog_windows", () => ({
  dialogWindows: {
    open: (request: any, { signal }: { signal: AbortSignal }) =>
      new Promise((finish) => requests.push({ request, signal, finish })),
  },
}));
const { createRoot } = await import("react-dom/client");
const { DirectoryPickerHost } =
  await import("../src/components/workspaces/directory_picker/directory_picker_host");
mock.module("../src/components/settings/desktop/settings_dialog", () => ({
  DesktopSettingsDialog: () => <div>设置内容</div>,
}));
const { SettingsDialogRenderer } =
  await import("../src/api/common/dialogs/settings_dialog_renderer");
const { AdaptiveModal } = await import("../src/components/common/adaptive_modal");

// 抓住 AdaptiveModal 条件卸载后没有归还启动租约，后续移动/复制请求被永久拦截的问题。
test("目录原生窗口取消并卸载后可重开，完成后也可再次打开", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(() => root.render(<DirectoryPickerHost />));
    for (const purpose of ["move", "copy", "move"] as const) {
      const before = requests.length;
      let result!: Promise<unknown>;
      await act(async () => {
        result = picker.request({ workspaceId: "w", purpose });
      });
      expect(requests.length).toBe(before + 1);
      const current = requests.at(-1)!;
      const token = current.request.payload.token;
      const value = purpose === "copy" ? { directory: "" } : null;
      await act(async () => {
        current.finish({ token, result: value });
      });
      expect(await result).toEqual(value);
      expect(picker.getSnapshot()).toBeNull();
    }
  } finally {
    await act(() => root.unmount());
  }
});

test("StrictMode 重放不重复启动，真正重挂载先撤销旧窗口再启动新窗口", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  let closes = 0;
  const render = (key: string) =>
    root.render(
      <React.StrictMode>
        <AdaptiveModal
          key={key}
          name="remount-regression"
          open
          onOpenChange={() => {
            closes++;
          }}
          nativeDialog={{
            id: "workspace.directory-picker",
            payload: { token: 1, options: { workspaceId: "w", purpose: "copy" } },
          }}
        >
          <span>目录内容</span>
        </AdaptiveModal>
      </React.StrictMode>,
    );
  const before = requests.length;
  try {
    await act(async () => {
      render("first");
    });
    expect(requests.length).toBe(before + 1);
    await act(async () => {
      render("remounted");
    });
    expect(requests[before].signal.aborted).toBe(true);
    expect(requests.length).toBe(before + 2);
    await act(async () => {
      requests[before].finish(undefined);
    });
    expect(closes).toBe(0);
    expect(requests.at(-1)!.signal.aborted).toBe(false);
    await act(async () => {
      requests.at(-1)!.finish(undefined);
    });
    expect(closes).toBe(1);
    expect(requests.length).toBe(before + 2);
  } finally {
    await act(() => root.unmount());
  }
});

// 抓住同一帧替换业务请求时，旧结果回调取消新请求或新请求被旧租约永久阻塞的问题。
test("替换目录请求会撤销旧窗口，迟到的旧结果不会取消新请求", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const before = requests.length;
  let first!: Promise<unknown>;
  let second!: Promise<unknown>;
  try {
    await act(async () => {
      root.render(<DirectoryPickerHost />);
    });
    await act(async () => {
      first = picker.request({ workspaceId: "a", purpose: "move" });
    });
    const old = requests[before];
    await act(async () => {
      second = picker.request({ workspaceId: "b", purpose: "copy" });
    });
    expect(await first).toBeNull();
    expect(old.signal.aborted).toBe(true);
    expect(requests.length).toBe(before + 2);
    const current = requests.at(-1)!;
    await act(async () => {
      old.finish(undefined);
    });
    expect(picker.getSnapshot()?.options.workspaceId).toBe("b");
    expect(current.signal.aborted).toBe(false);
    await act(async () => {
      current.finish({ token: current.request.payload.token, result: { directory: "" } });
    });
    expect(await second).toEqual({ directory: "" });
  } finally {
    await act(() => root.unmount());
  }
});

test("目录首帧等待根目录数据，失败时以可重试界面 ready", async () => {
  for (const fail of [false, true]) {
    let resolve!: (value: { path: string; metadata: { kind: "directory" } }[]) => void;
    let reject!: (error: Error) => void;
    loadDirectory = () =>
      new Promise((done, failed) => {
        resolve = done;
        reject = failed;
      });
    const container = document.createElement("div");
    const root = createRoot(container);
    let ready = 0;
    try {
      await act(async () => {
        root.render(
          <DirectoryPickerHost
            dialogContentOnly
            dialogPayload={{ token: 100, options: { workspaceId: "w", purpose: "copy" } }}
            onContentReady={() => {
              ready++;
            }}
          />,
        );
      });
      expect(ready).toBe(0);
      await act(async () => {
        if (fail) reject(new Error("读取失败"));
        else resolve([{ path: "子文件夹", metadata: { kind: "directory" } }]);
      });
      expect(ready).toBe(1);
      expect(container.textContent).toContain(fail ? "读取失败，点击重试" : "子文件夹");
    } finally {
      await act(() => root.unmount());
      loadDirectory = async () => [];
    }
  }
});

test("独立设置中的目录请求有 Host 承接，完成和取消都能结算", async () => {
  const root = createRoot(document.createElement("div"));
  try {
    await act(async () => {
      root.render(
        <SettingsDialogRenderer
          requestId="settings"
          payload={{ initialPageId: "global" }}
          onComplete={() => {}}
        />,
      );
    });
    for (const value of [null, { directory: "attachments" }]) {
      const before = requests.length;
      let result!: Promise<unknown>;
      await act(async () => {
        result = picker.request({ workspaceId: "w", purpose: "copy" });
      });
      expect(requests.length).toBe(before + 1);
      const current = requests.at(-1)!;
      await act(async () => {
        current.finish({ token: current.request.payload.token, result: value });
      });
      expect(await result).toEqual(value);
    }
  } finally {
    await act(() => root.unmount());
  }
});
