import { beforeEach, expect, mock, test } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { MenuAdapterRequest, MenuConfig } from "rn-ui-kit";

// 仅替换窗口外部 API 和设置来源；Provider、数据转换与宿主 adapter 均运行真实代码。
let platform = "windows";
let tauri = true;
let preferences = {
  shell: { layoutMode: "desktop" },
  appearance: { contextMenuStyle: "system", accentColor: "blue" },
};
let config: MenuConfig;
const nativeCalls: Array<{ command: string; args: any }> = [];
const tauriMenus: Array<{ items: any[]; disposed: boolean; position?: unknown }> = [];
let invokeNative: (command: string, args: any) => Promise<unknown> = async () => null;
let popupNative: () => Promise<void> = async () => {};
const tauriCore = await import("@tauri-apps/api/core");

mock.module("rn-ui-kit", () => ({
  MenuProvider: ({ value, children }) => {
    config = value;
    return children;
  },
  RootProvider: ({ children }) => children,
  accentThemeNames: ["ocean"],
  accentThemeSeeds: { ocean: "#0000ff" },
  defaultAccentThemeName: "ocean",
  resolveGeneratedAccentTheme: () => ({ light: {}, dark: {} }),
}));
mock.module("../src/api/common/platform", () => ({ isTauri: () => tauri, os: () => platform }));
mock.module("@tauri-apps/api/core", () => ({
  ...tauriCore,
  invoke: async (command, args) => {
    nativeCalls.push({ command, args });
    return invokeNative(command, args);
  },
}));
mock.module("@tauri-apps/api/menu", () => ({
  Menu: {
    new: async ({ items }) => {
      const resource = { items, disposed: false, position: undefined };
      tauriMenus.push(resource);
      return {
        popup: async (position) => {
          resource.position = position;
          await popupNative();
        },
        close: async () => {
          resource.disposed = true;
        },
      };
    },
  },
}));
mock.module("../src/hooks/settings/use_color_scheme_settings", () => ({
  useColorSchemeSettings: () => ({
    isLoaded: true,
    preferences,
    preferredColorScheme: "dark",
    resolvedColorScheme: "dark",
  }),
}));
for (const [path, name, value] of [
  ["use_desktop_accent_color", "useDesktopAccentColor"],
  ["use_desktop_window_background", "useDesktopWindowBackground"],
  ["use_desktop_window_state", "useDesktopWindowState"],
  ["use_desktop_zoom_factor", "useDesktopZoomFactor"],
  ["use_font_settings", "useEditorFontRuntime"],
  ["use_ui_font_runtime", "useUiFontRuntime", {}],
] as const) {
  mock.module(`../src/hooks/settings/${path}`, () => ({ [name]: () => value }));
}
mock.module("../src/stores/ui", () => ({ applyDocumentTheme: () => {} }));

const { AppProvider } = await import("../src/providers/app_provider/app_provider.web");
globalThis.window = { devicePixelRatio: 1.5 } as Window & typeof globalThis;

function renderProvider() {
  renderToStaticMarkup(
    <AppProvider>
      <div />
    </AppProvider>,
  );
  return config;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function request(kind: MenuAdapterRequest["kind"] = "dropdown") {
  const abort = new AbortController();
  const selected: string[] = [];
  const value: MenuAdapterRequest = {
    kind,
    source: "pointer",
    x: 24,
    y: 48,
    anchor: { rect: { x: 24, y: 32, width: 80, height: 16 } },
    placement: { side: "bottom", align: "start", sideOffset: 0 },
    signal: abort.signal,
    isCurrent: () => true,
    select: async () => {},
    items: [
      {
        id: "0",
        value: "copy",
        text: "复制",
        onSelect: async () => {
          selected.push("copy");
        },
      },
    ],
  };
  return { value, abort, selected };
}

beforeEach(() => {
  platform = "windows";
  tauri = true;
  preferences = {
    shell: { layoutMode: "desktop" },
    appearance: { contextMenuStyle: "system", accentColor: "blue" },
  };
  nativeCalls.length = 0;
  tauriMenus.length = 0;
  invokeNative = async () => null;
  popupNative = async () => {};
});

test("系统设置让 Dropdown 与 ContextMenu 都进入 Windows/Linux backend", async () => {
  for (platform of ["windows", "linux"]) {
    for (const kind of ["dropdown", "context-menu"] as const) {
      const current = renderProvider();
      const opened = deferred<void>();
      invokeNative = async () => {
        opened.resolve();
        return "menu-action-0";
      };
      const input = request(kind);
      const session = current.menuAdapter ? await current.menuAdapter.open(input.value) : undefined;
      expect(session).toBeDefined();
      await opened.promise;
      await session!.closed;
      expect(input.selected).toEqual(["copy"]);
      expect(nativeCalls.at(-1)).toMatchObject({
        command: "show_wcpopup_context_menu",
        args: { x: 24, y: 48, devicePixelRatio: 1.5, darkMode: true },
      });
    }
  }
});

test("应用菜单设置、普通浏览器和移动布局不安装桌面 adapter", () => {
  preferences.appearance.contextMenuStyle = "app";
  expect(renderProvider().menuAdapter).toBe(false);
  expect(config.native).toBe(false);
  expect(config.showNativeMenu).toBeUndefined();
  preferences.appearance.contextMenuStyle = "system";
  tauri = false;
  expect(renderProvider().menuAdapter).toBe(false);
  expect(config.native).toBe(false);
  tauri = true;
  preferences.shell.layoutMode = "mobile";
  expect(renderProvider().menuAdapter).toBe(false);
  expect(config.native).toBeUndefined();
  expect(nativeCalls).toEqual([]);
});

test("WcPopup closed 等到取消且不派发动作", async () => {
  const opened = deferred<void>();
  const dismissed = deferred<string | null>();
  invokeNative = async () => {
    opened.resolve();
    return dismissed.promise;
  };
  const input = request();
  const current = renderProvider();
  const session = current.menuAdapter ? await current.menuAdapter.open(input.value) : undefined;
  expect(session?.closed).toBeDefined();
  let closed = false;
  session!.closed!.then(() => {
    closed = true;
  });
  await opened.promise;
  expect(closed).toBe(false);
  dismissed.resolve(null);
  await session!.closed;
  expect(closed).toBe(true);
  expect(input.selected).toEqual([]);
});

test("WcPopup 取消或失效后的返回不能执行旧动作", async () => {
  for (const cancel of ["abort", "stale"] as const) {
    const opened = deferred<void>();
    const dismissed = deferred<string | null>();
    invokeNative = async () => {
      opened.resolve();
      return dismissed.promise;
    };
    const input = request();
    let currentRequest = true;
    input.value.isCurrent = () => currentRequest;
    const current = renderProvider();
    const session = current.menuAdapter ? await current.menuAdapter.open(input.value) : undefined;
    expect(session?.closed).toBeDefined();
    await opened.promise;
    if (cancel === "abort") input.abort.abort();
    else currentRequest = false;
    dismissed.resolve("menu-action-0");
    await session!.closed;
    expect(input.selected).toEqual([]);
  }
});

test("WcPopup 不执行禁用叶子和父级禁用的子菜单", async () => {
  const current = renderProvider();
  const input = request();
  input.value.items = [
    { ...input.value.items[0], disabled: true, subMenu: [input.value.items[0]] },
  ];
  invokeNative = async () => "menu-action-1";
  const session = current.menuAdapter ? await current.menuAdapter.open(input.value) : undefined;
  expect(session?.closed).toBeDefined();
  await session!.closed;
  expect(nativeCalls.at(-1)?.args.items[0].subMenu[0].disabled).toBe(true);
  expect(input.selected).toEqual([]);
});

test("macOS 菜单显示完成后保留资源和动作，dispose 才释放", async () => {
  platform = "macos";
  const current = renderProvider();
  const input = request();
  const session = current.menuAdapter ? await current.menuAdapter.open(input.value) : undefined;
  expect(session).toBeDefined();
  expect(session!.closed).toBeUndefined();
  expect(tauriMenus).toHaveLength(1);
  expect(tauriMenus[0].disposed).toBe(false);
  expect(tauriMenus[0].position).toMatchObject({ x: 24, y: 48 });
  await tauriMenus[0].items[0].action();
  expect(input.selected).toEqual(["copy"]);
  input.abort.abort();
  await tauriMenus[0].items[0].action();
  expect(input.selected).toEqual(["copy"]);
  await session!.dispose?.();
  expect(tauriMenus[0].disposed).toBe(true);
  expect(nativeCalls).toEqual([]);
});

test("打开前已取消或失效的请求不创建原生菜单", async () => {
  for (platform of ["windows", "linux", "macos"]) {
    for (const stale of [false, true]) {
      const current = renderProvider();
      const input = request();
      if (stale) input.value.isCurrent = () => false;
      else input.abort.abort();
      const session = current.menuAdapter ? await current.menuAdapter.open(input.value) : undefined;
      expect(session).toBeDefined();
      await session!.closed;
      await session!.dispose?.();
      expect(input.selected).toEqual([]);
    }
  }
  expect(nativeCalls).toEqual([]);
  expect(tauriMenus).toEqual([]);
});

test("WcPopup 宿主错误通过 closed 拒绝向上传递", async () => {
  const failure = new Error("宿主菜单失败");
  invokeNative = async () => {
    throw failure;
  };
  const current = renderProvider();
  const session = current.menuAdapter ? await current.menuAdapter.open(request().value) : undefined;
  expect(session?.closed).toBeDefined();
  await expect(session!.closed).rejects.toBe(failure);
});

test("macOS 显示失败会释放资源并保留原错误", async () => {
  platform = "macos";
  const failure = new Error("无法显示菜单");
  popupNative = async () => {
    throw failure;
  };
  const current = renderProvider();
  const opening = current.menuAdapter ? current.menuAdapter.open(request().value) : undefined;
  expect(opening).toBeDefined();
  await expect(Promise.resolve(opening)).rejects.toBe(failure);
  expect(tauriMenus).toHaveLength(1);
  expect(tauriMenus[0].disposed).toBe(true);
});
