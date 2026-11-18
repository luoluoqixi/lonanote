import { expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act, useEffect } from "react";

const win = new Window();
globalThis.window = win as any;
globalThis.document = win.document as any;
globalThis.HTMLElement = win.HTMLElement as any;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const flatten = (style: any): any =>
  Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : style;
mock.module("react-native", () => ({
  View: ({ children, style }: any) => <div style={flatten(style)}>{children}</div>,
  Image: () => <img alt="" />,
  Text: ({ children }: any) => <span>{children}</span>,
  Pressable: ({ children, onPress }: any) => <button onClick={onPress}>{children}</button>,
  StyleSheet: { create: (styles: any) => styles, absoluteFillObject: {} },
}));
let primaryColor = "#2563eb";
mock.module("rn-ui-kit", () => ({
  Text: ({ children }: any) => <span>{children}</span>,
  useUiTheme: () => ({
    background: "white",
    foreground: "black",
    border: "gray",
    primary: primaryColor,
  }),
}));
mock.module("../src/config", () => ({ TITLE_HEIGHT: 32 }));
let title = "辅助窗口标题";
mock.module("../src/hooks/editor/use_desktop_window_title", () => ({
  useWindowTitle: () => title,
}));
let platform = "windows";
const windowActions: string[] = [];
let currentWindowLabel = "auxiliary";
const pinnedWindows = new Map<string, boolean>();
let rejectPin = false;
mock.module("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => {
    const label = currentWindowLabel;
    return {
      isAlwaysOnTop: async () => pinnedWindows.get(label) ?? false,
      setAlwaysOnTop: async (value: boolean) => {
        if (rejectPin) throw new Error("系统拒绝置顶");
        pinnedWindows.set(label, value);
      },
      isMaximized: async () => false,
      onResized: async () => () => {},
      close: () => windowActions.push("close"),
      minimize: () => windowActions.push("minimize"),
      toggleMaximize: () => windowActions.push("maximize"),
    };
  },
}));
mock.module("../src/components/app_menu/app_menu_host", () => ({
  useAppMenuContext: () => ({ presentation: { visible: true, native: false, icon: false } }),
}));
mock.module("../src/components/app_menu/app_menubar", () => ({ AppMenubar: () => null }));
mock.module("../src/api/common", () => ({ isDesktop: () => true, os: () => platform }));
const copiedDrafts: string[] = [];
let reconnects = 0;
let ownerDestroyed = false;
let freezes = 0;
let tabIds = ["tab"];
let emptyCloses = 0;
mock.module("../src/hooks/editor/use_editor_session", () => ({
  useEditorSession: () => ({ openEditorIds: tabIds }),
}));
mock.module("../src/api/commands/win/editor_windows", () => ({
  editorWindows: {
    closeCurrent: async () => {
      emptyCloses++;
      return true;
    },
  },
}));
mock.module("../src/api/commands/system/clipboard", () => ({
  clipboard: {
    writeText: async (text: string) => {
      copiedDrafts.push(text);
    },
  },
}));
mock.module("../src/components/editor/controllers/editor_window_service", () => ({
  editorWindowService: {
    getBootstrapSnapshot: () => ({
      role: "editor",
      windowLabel: "auxiliary",
      ownerWindowLabel: "owner",
      sessionId: "session",
      ownerEpoch: 3,
      ownerDestroyed,
    }),
    handleOwnerDestroyed: async () => {
      ownerDestroyed = true;
      connected = false;
      freezes++;
    },
    getRecoveryDraft: async () => "保留的草稿",
    retry: async () => {
      reconnects++;
    },
  },
}));
let connected = true;
mock.module("../src/hooks/editor/use_editor_windows", () => ({
  useEditorWindows: () => ({ role: "editor", ready: true, connected, error: null, ownerDestroyed }),
}));
let mounts = 0;
let unmounts = 0;
mock.module("../src/components/editor/desktop/desktop_editor_area", () => ({
  DesktopEditorArea: () => {
    useEffect(() => {
      mounts++;
      return () => {
        unmounts++;
      };
    }, []);
    return <iframe data-editor="retained" />;
  },
}));
mock.module("../src/api/common/platform", () => ({
  isDesktop: () => true,
  isTauri: () => true,
  os: () => platform,
}));
mock.module("../src/hooks/ui", () => ({ useToast: () => ({ toast: { error() {} } }) }));
mock.module("../src/stores/editor", () => ({
  editorStore: { getState: () => ({ documentsById: {} }) },
}));
mock.module("../src/stores/workspace/workspace_catalog_revision", () => ({
  workspaceCatalogRevisionStore: { setState() {} },
}));
const prepared: string[] = [];
const finished: boolean[] = [];
mock.module("../src/hooks/editor/use_editor_close_actions", () => ({
  abortRemoteEditorWindowClose: async () => {},
  prepareCurrentWindowClose: ({ requestId }: { requestId: string }) => {
    prepared.push(requestId);
    return {
      ready: Promise.resolve(true),
      getError: () => null,
      finish: async (commit: boolean) => {
        finished.push(commit);
        return true;
      },
    };
  },
}));
const listeners = new Map<string, (event: any) => void>();
const stopped: string[] = [];
const invokes: { command: string; args: any }[] = [];
mock.module("@tauri-apps/api/core", () => ({
  invoke: async (command: string, args: any) => {
    invokes.push({ command, args });
  },
}));
mock.module("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    label: "auxiliary",
    listen: async (event: string, callback: (event: any) => void) => {
      listeners.set(event, callback);
      return () => {
        stopped.push(event);
        listeners.delete(event);
      };
    },
    onFocusChanged: async () => () => {},
  }),
}));
const { createRoot } = await import("react-dom/client");
const { TitleBarDragOverlay } = await import("../src/components/window/titlebar_drag_overlay.web");
mock.module("../src/components/window/titlebar_drag_overlay", () => ({ TitleBarDragOverlay }));
const { AuxiliaryEditorShell } = await import("../src/components/app_shell/auxiliary_editor_shell");
const { DialogTitleBar } = await import("../src/components/window/dialog_titlebar");
const { TitleBar } = await import("../src/components/window/titlebar");
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("辅助编辑器显示随标题更新的自绘栏，窗口按钮操作当前窗口", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await act(() => root.render(<AuxiliaryEditorShell />));
    expect(container.textContent).toContain("辅助窗口标题");
    for (const label of ["最小化", "最大化", "关闭"]) {
      expect(container.querySelector('button[title="' + label + '"]')).not.toBeNull();
    }
    title = "更新后的标题";
    await act(() => root.render(<AuxiliaryEditorShell />));
    expect(container.textContent).toContain("更新后的标题");
    await act(async () => {
      (container.querySelector('button[title="关闭"]') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 90));
    });
    expect(windowActions).toEqual(["close"]);
  } finally {
    await act(() => root.unmount());
  }
  mounts = 0;
  unmounts = 0;
});

test("内容窗口标题以全栏为中心并为平台按钮对称留白", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    for (const os of ["windows", "linux", "macos"]) {
      platform = os;
      await act(() => root.render(<DialogTitleBar title="居中标题" />));
      const label = [...container.querySelectorAll("span")].find(
        (node) => node.textContent === "居中标题",
      )!;
      const region = label.parentElement!;
      expect(region.style.position).toBe("absolute");
      expect(region.style.left).toBe(region.style.right);
      expect(parseFloat(region.style.left)).toBeGreaterThanOrEqual(os === "macos" ? 80 : 138);
      expect(container.querySelectorAll("button").length).toBe(os === "macos" ? 0 : 3);
    }
  } finally {
    platform = "windows";
    await act(() => root.unmount());
  }
});

// 防止只给主窗口接入置顶、误将操作发给其他窗口，或拖拽覆盖层挡住新按钮。
test("主窗口、工作区窗口和辅助 editor 可独立置顶，Dialog 不提供置顶", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  pinnedWindows.clear();
  try {
    for (const label of ["main", "workspace-window-second", "editor-window-second"]) {
      currentWindowLabel = label;
      await act(async () => {
        root.render(
          label.startsWith("editor-window-") ? (
            <AuxiliaryEditorShell key={label} />
          ) : (
            <TitleBar key={label} />
          ),
        );
      });
      const pin = container.querySelector('button[title="窗口置顶"]') as HTMLButtonElement;
      expect(pin).not.toBeNull();
      expect(pin.getAttribute("aria-pressed")).toBe("false");
      expect(
        [...pin.parentElement!.querySelectorAll("button")].map((button) => button.title),
      ).toEqual(["窗口置顶", "最小化", "最大化", "关闭"]);
      expect(
        (document.body.querySelector("[data-tauri-drag-region]") as HTMLElement).style.right,
      ).toBe("174px");
      await act(async () => pin.click());
      expect(pinnedWindows.get(label)).toBe(true);
      expect(pin.getAttribute("aria-pressed")).toBe("true");
      expect(pin.title).toBe("取消置顶");
    }
    expect(pinnedWindows.get("main")).toBe(true);
    expect(pinnedWindows.get("workspace-window-second")).toBe(true);
    const pin = container.querySelector('button[title="取消置顶"]') as HTMLButtonElement;
    await act(async () => pin.click());
    expect(pinnedWindows.get("editor-window-second")).toBe(false);
    expect(pinnedWindows.get("main")).toBe(true);
    await act(async () => root.render(<DialogTitleBar title="普通弹窗" />));
    expect(container.querySelector('button[title="窗口置顶"]')).toBeNull();
    expect(container.querySelectorAll("button").length).toBe(3);
    expect(
      (document.body.querySelector("[data-tauri-drag-region]") as HTMLElement).style.right,
    ).toBe("138px");
  } finally {
    currentWindowLabel = "auxiliary";
    await act(() => root.unmount());
    mounts = 0;
    unmounts = 0;
  }
});

test("置顶读取窗口现有状态，系统拒绝时保留状态并允许重试", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const oldWarn = console.warn;
  console.warn = () => {};
  currentWindowLabel = "editor-window-pinned";
  pinnedWindows.set(currentWindowLabel, true);
  try {
    await act(async () => root.render(<AuxiliaryEditorShell />));
    const pin = container.querySelector('button[title="取消置顶"]') as HTMLButtonElement;
    expect(pin).not.toBeNull();
    rejectPin = true;
    await act(async () => pin.click());
    expect(pin.getAttribute("aria-pressed")).toBe("true");
    expect(pin.disabled).toBe(false);
    expect(pinnedWindows.get(currentWindowLabel)).toBe(true);
    rejectPin = false;
    await act(async () => pin.click());
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    expect(pinnedWindows.get(currentWindowLabel)).toBe(false);
  } finally {
    rejectPin = false;
    console.warn = oldWarn;
    currentWindowLabel = "auxiliary";
    await act(() => root.unmount());
    mounts = 0;
    unmounts = 0;
  }
});

// 防止置顶继续占用整格系统按钮，以及开启背景覆盖 hover/按下反馈。
test("置顶按钮保持紧凑，开启后只强调图标且保留 hover 和按下反馈", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  currentWindowLabel = "main-pin-interaction";
  pinnedWindows.set(currentWindowLabel, false);
  try {
    for (const os of ["windows", "linux", "macos"]) {
      platform = os;
      await act(async () => root.render(<TitleBar key={os} />));
      const pin = container.querySelector("button[aria-pressed]") as HTMLButtonElement;
      expect(parseFloat(pin.style.width)).toBeLessThanOrEqual(28);
      expect(parseFloat(pin.style.height)).toBeLessThanOrEqual(24);
      expect(pin.style.height).not.toBe("100%");
      const idleBackground = pin.style.backgroundColor;
      await act(async () => pin.click());
      expect(pin.getAttribute("aria-pressed")).toBe("true");
      expect(pin.style.color).toBe("#2563eb");
      expect(pin.style.backgroundColor).toBe(idleBackground);
      await act(() => {
        pin.dispatchEvent(new win.MouseEvent("mouseover", { bubbles: true }));
      });
      const hoverBackground = pin.style.backgroundColor;
      expect(hoverBackground).not.toBe(idleBackground);
      expect(pin.style.color).toBe("#2563eb");
      await act(() => {
        pin.dispatchEvent(new win.MouseEvent("mousedown", { bubbles: true }));
      });
      expect(pin.style.backgroundColor).not.toBe(hoverBackground);
      expect(pin.style.color).toBe("#2563eb");
      await act(() => {
        pin.dispatchEvent(new win.MouseEvent("mouseout", { bubbles: true }));
      });
      expect(pin.style.backgroundColor).toBe(idleBackground);
      await act(async () => pin.click());
      expect(pin.getAttribute("aria-pressed")).toBe("false");
      await act(() => {
        pin.dispatchEvent(new win.MouseEvent("mouseover", { bubbles: true }));
      });
      expect(pin.style.color).toBe("var(--foreground)");
    }
  } finally {
    platform = "windows";
    currentWindowLabel = "auxiliary";
    await act(() => root.unmount());
  }
});

// 防止只写入未定义的 CSS variable 却仍把主色断言当作通过。
test("置顶图标解析为真实主题主色，并在保持置顶时响应主题切换", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  currentWindowLabel = "main-pin-theme";
  pinnedWindows.set(currentWindowLabel, true);
  try {
    for (const os of ["windows", "linux", "macos"]) {
      platform = os;
      for (const editor of [false, true]) {
        primaryColor = "#2563eb";
        const shell = () =>
          editor ? <AuxiliaryEditorShell key={os + editor} /> : <TitleBar key={os + editor} />;
        await act(async () => root.render(shell()));
        const pin = container.querySelector('button[title="取消置顶"]') as HTMLButtonElement;
        const icon = pin.querySelector("svg")!;
        expect(window.getComputedStyle(pin).color).toBe("#2563eb");
        expect(window.getComputedStyle(icon).color).toBe("#2563eb");
        primaryColor = "#e11d48";
        await act(async () => root.render(shell()));
        expect(pin.getAttribute("aria-pressed")).toBe("true");
        expect(window.getComputedStyle(icon).color).toBe("#e11d48");
      }
    }
  } finally {
    primaryColor = "#2563eb";
    platform = "windows";
    currentWindowLabel = "auxiliary";
    await act(() => root.unmount());
    container.remove();
    mounts = 0;
    unmounts = 0;
  }
});

test("macOS 主窗口和辅助 editor 仅增加置顶按钮，保留系统交通灯", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  platform = "macos";
  try {
    for (const shell of [<TitleBar key="main" />, <AuxiliaryEditorShell key="editor" />]) {
      await act(async () => root.render(shell));
      expect(container.querySelectorAll("button").length).toBe(1);
      expect(container.querySelector('button[title="窗口置顶"]')).not.toBeNull();
      expect(container.querySelector('button[title="最小化"]')).toBeNull();
      expect(
        (document.body.querySelector("[data-tauri-drag-region]") as HTMLElement).style.right,
      ).toBe("36px");
    }
  } finally {
    platform = "windows";
    await act(() => root.unmount());
    mounts = 0;
    unmounts = 0;
  }
});

test("辅助窗口挂载关闭协议，核验目标身份并在断联时保留编辑surface", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(<AuxiliaryEditorShell />);
      await settle();
    });
    const close = listeners.get("lonanote://window-close");
    expect(close).toBeDefined();
    close!({ payload: { windowLabel: "other", requestId: "wrong", stage: "prepare" } });
    await settle();
    expect(prepared).toEqual([]);
    close!({ payload: { windowLabel: "auxiliary", requestId: "close", stage: "prepare" } });
    await settle();
    expect(prepared).toEqual(["close"]);
    expect(
      invokes.some(
        ({ command, args }) =>
          command === "respond_window_close" && args.requestId === "close" && args.accepted,
      ),
    ).toBe(true);
    close!({ payload: { windowLabel: "auxiliary", requestId: "close", stage: "abort" } });
    await settle();
    expect(finished).toEqual([false]);
    const surface = container.querySelector("iframe");
    connected = false;
    await act(() => root.render(<AuxiliaryEditorShell />));
    expect(container.textContent).toContain("草稿已保留");
    expect(container.querySelector("iframe")).toBe(surface);
    expect(mounts).toBe(1);
    expect(unmounts).toBe(0);
    const buttons = [...container.querySelectorAll("button")];
    await act(async () => {
      buttons.find((button) => button.textContent === "复制保留的草稿")!.click();
      await settle();
    });
    expect(copiedDrafts).toEqual(["保留的草稿"]);
    await act(async () => {
      buttons.find((button) => button.textContent === "重新连接")!.click();
      await settle();
    });
    expect(reconnects).toBe(1);
    expect(container.querySelector("iframe")).toBe(surface);
    const ownerLost = listeners.get("lonanote://editor-window-owner-destroyed");
    expect(ownerLost).toBeDefined();
    ownerLost!({
      payload: {
        windowLabel: "auxiliary",
        ownerWindowLabel: "owner",
        sessionId: "session",
        ownerEpoch: 2,
        requestId: null,
      },
    });
    await settle();
    expect(freezes).toBe(0);
    await act(async () => {
      ownerLost!({
        payload: {
          windowLabel: "auxiliary",
          ownerWindowLabel: "owner",
          sessionId: "session",
          ownerEpoch: 3,
          requestId: null,
        },
      });
      await settle();
      root.render(<AuxiliaryEditorShell />);
    });
    expect(freezes).toBe(1);
    expect(container.querySelector("iframe")).toBe(surface);
    expect(unmounts).toBe(0);
    expect(container.textContent).toContain("原窗口已意外关闭");
    expect(
      [...container.querySelectorAll("button")].some((button) => button.textContent === "重新连接"),
    ).toBe(false);
    await act(async () => {
      [...container.querySelectorAll("button")]
        .find((button) => button.textContent === "复制保留的草稿")!
        .click();
      await settle();
    });
    expect(copiedDrafts).toEqual(["保留的草稿", "保留的草稿"]);
  } finally {
    await act(() => root.unmount());
    container.remove();
  }
  expect(stopped).toContain("lonanote://window-close");
  expect(unmounts).toBe(1);
});

test("最后一个标签关闭或移走后关闭辅助窗口，初始空状态不误关", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  tabIds = [];
  await act(async () => {
    root.render(<AuxiliaryEditorShell />);
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  expect(emptyCloses).toBe(0);
  tabIds = ["moved-tab"];
  await act(async () => {
    root.render(<AuxiliaryEditorShell />);
  });
  tabIds = [];
  await act(async () => {
    root.render(<AuxiliaryEditorShell />);
  });
  await new Promise((resolve) => setTimeout(resolve, 120));
  expect(emptyCloses).toBe(1);
  await act(() => root.unmount());
});
