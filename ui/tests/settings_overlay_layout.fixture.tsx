import { afterEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { readFileSync } from "node:fs";
import React, { act } from "react";

const win = new Window({ url: "http://localhost/" });
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLDivElement",
  "HTMLButtonElement",
  "HTMLAnchorElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "SVGElement",
  "Element",
  "Node",
  "NodeFilter",
  "HTMLLabelElement",
  "Event",
  "CustomEvent",
  "FocusEvent",
  "Document",
  "HTMLFormElement",
  "HTMLSelectElement",
  "DOMRect",
  "Range",
  "InputEvent",
  "MouseEvent",
  "KeyboardEvent",
  "PointerEvent",
  "ShadowRoot",
  "MutationObserver",
  "ResizeObserver",
  "CSSRuleList",
  "CSS",
  "AnimationEvent",
])
  globalThis[key] = key === "window" ? win : win[key];
globalThis.getComputedStyle = win.getComputedStyle.bind(win);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = win.requestAnimationFrame.bind(win);
globalThis.cancelAnimationFrame = win.cancelAnimationFrame.bind(win);
const sheetStyles = document.createElement("style");
sheetStyles.textContent = readFileSync(
  new URL(
    "../node_modules/@lodev09/react-native-true-sheet/src/web/vaul/style.css",
    import.meta.url,
  ),
  "utf8",
);
document.head.append(sheetStyles);
const RNW = await import("react-native-web");
mock.module("react-native", () => RNW);
mock.module("uniwind", () => ({ withUniwind: (value) => value, useCSSVariable: () => "#2563eb" }));
const theme = {
  background: "#fff",
  foreground: "#111",
  accent: "#2563eb",
  accent03: "#dbeafe",
  border: "#ddd",
};
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/theme", () => ({
  useUiTheme: () => theme,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/haptics", () => ({
  useResolvedNativeHaptics: () => false,
  triggerNativeHaptics() {},
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/button/button_loading_icon", () => ({
  ButtonLoadingIcon: ({ children }) => children,
}));
const { TrueSheet } =
  await import("../node_modules/@lodev09/react-native-true-sheet/src/TrueSheet.web");
const { TrueSheetProvider, useTrueSheet } =
  await import("../node_modules/@lodev09/react-native-true-sheet/src/TrueSheetProvider.web");
mock.module("@lodev09/react-native-true-sheet", () => ({
  TrueSheet,
  TrueSheetProvider,
  useTrueSheet,
}));
const scope =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/overlay_portal_scope.web");
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/overlay_portal_scope",
  () => scope,
);
const modalScope =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/modal_content_scope.web");
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/utils/overlay/modal_content_scope",
  () => modalScope,
);
// 仅绕过本测试不涉及的 Navigation screen 注册；Sheet 本身与命令队列使用真实实现。
function Screen({ children }) {
  return children();
}
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/sheet/native_sheet/true_sheet/stack_navigation",
  () => ({ TrueSheetInnerStack: { Screen } }),
);
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/sheet/native_sheet/true_sheet/stack_host",
  () => ({
    TrueSheetStackHost: ({ children, name, onDidDismiss, onRequestClose, sheetProps }) => (
      <TrueSheet {...sheetProps} name={name} onDidDismiss={onDidDismiss}>
        <button onClick={onRequestClose}>关闭 Sheet</button>
        {children}
      </TrueSheet>
    ),
  }),
);
const { Button } = await import("../node_modules/rn-ui-kit/src/core/components/ui/button");
const { Dialog } = await import("../node_modules/rn-ui-kit/src/core/components/ui/dialog");
const { Text } = await import("../node_modules/rn-ui-kit/src/core/components/ui/text");
const { Tooltip } = await import("../node_modules/rn-ui-kit/src/core/components/ui/tooltip");
const { Spinner } = await import("../node_modules/rn-ui-kit/src/core/components/ui/spinner");
const { NativeSheetStack } =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/sheet/native_sheet/native_sheet_stack.web");
const section = ({ children }) => <RNW.View>{children}</RNW.View>;
mock.module("rn-ui-kit", () => ({
  Button,
  Dialog,
  Text,
  NativeSheetStack,
  Input: RNW.TextInput,
  Tooltip,
  Spinner,
  Dropdown: undefined,
  NativeList: RNW.ScrollView,
  NativeListSection: section,
  NativeListItem: ({ title, onPress }) => <Button onPress={onPress}>{title}</Button>,
  NativeListSelectItem: () => null,
  NativeListColorPickerItem: () => null,
  BrightnessSlider: () => null,
  HueSlider: () => null,
  Panel1: () => null,
  Preview: () => null,
  Swatches: () => null,
  getNativeStackScrollEdgeHeaderOptions: () => ({}),
  useAppBackgroundColors: () => ({ sheet: "#fff", header: "#fff" }),
  useUiTheme: () => theme,
}));
mock.module("../src/hooks/settings", () => ({
  useUiPreferences: () => ({
    preferences: { developer: { optionsEnabled: true }, appearance: { accentColor: "lavender" } },
    isLoading: false,
  }),
  useColorSchemeSettings: () => ({ preferredColorScheme: "light", isLoading: false }),
}));
mock.module("../src/hooks/layout", () => ({ useLayoutMode: () => ({ layoutMode: "mobile" }) }));
mock.module("../src/api/common", () => ({
  isIos: () => false,
  isIos16Plus: () => false,
  os: () => "web",
}));
mock.module("../src/api/common/platform", () => ({ isWeb: () => true }));
mock.module("lucide-react-native", () =>
  Object.fromEntries(
    [
      "ArrowDownUp",
      "CalendarDays",
      "CircleCheck",
      "Ellipsis",
      "FolderOpen",
      "FolderPlus",
      "RefreshCw",
      "Search",
      "Settings",
      "ChevronsUpDown",
      "ChevronDown",
      "ChevronRight",
      "Folder",
    ].map((name) => [name, () => <svg />]),
  ),
);
mock.module("../src/hooks/settings/use_font_settings", () => ({
  useFontSettings: () => ({
    ui: { selection: null },
    editor: { selection: null },
    select: async () => {},
  }),
}));
mock.module("../src/hooks/settings/use_font_directory", () => ({
  useFontDirectory: () => ({ entries: [], loading: false }),
  useFontCapability: () => true,
}));
mock.module("../src/theme/accent_themes", () => ({
  accentThemeNames: ["lavender"],
  accentThemeSeeds: { lavender: "#2563eb" },
  getAccentThemePreset: () => ({ label: "紫色" }),
  isCustomAccentColor: () => false,
}));
mock.module("../src/hooks/workspace/use_workspace_session", () => ({
  useCurrentWorkspaceId: () => null,
}));
let settingsSheetCommands;
const { SettingsList } = await import("../src/components/settings/settings_list");
function SettingsPage({ onOpenDebugSheet, onOpenGmSheet }) {
  settingsSheetCommands = useTrueSheet();
  return (
    <SettingsList accessibilityLabel="设置内容" style={{ flex: 1 }}>
      <button onClick={onOpenDebugSheet}>打开 Debug</button>
      <button onClick={onOpenGmSheet}>打开 GM</button>
      <div style={{ height: 1000 }}>内容</div>
    </SettingsList>
  );
}
const settingsPages = [
  { id: "global", title: "常规", desktopTab: true, Component: SettingsPage },
  { id: "developer", title: "开发者选项", desktopTab: true, Component: SettingsPage },
];
mock.module("../src/components/settings/settings_config", () => ({
  settingsPages,
  getSettingsPage: (id) => settingsPages.find((p) => p.id === id),
}));
mock.module("../src/components/settings/pages/gm_settings_page", () => ({
  GmSettingsPage: () => <input aria-label="GM 内容" defaultValue="保留" />,
}));
mock.module("rn-ui-kit/debug", () => ({
  RnUiKitDebugPanel: ({ open, onOpenChange, panelSheetProps }) => (
    <NativeSheetStack
      name="debug-panel"
      open={open}
      onOpenChange={onOpenChange}
      sheetProps={panelSheetProps}
    >
      <NativeSheetStack.Screen>
        {() => <input aria-label="Debug 内容" defaultValue="保留" />}
      </NativeSheetStack.Screen>
    </NativeSheetStack>
  ),
}));
const { DesktopSettingsDialog } =
  await import("../src/components/settings/desktop/settings_dialog");
const { WorkspaceSelectHeader } =
  await import("../src/components/workspaces/workspace_select/workspace_select_header");
const { AppearanceSettingsPage } =
  await import("../src/components/settings/pages/appearance_settings_page");
// 只替换 Rust command 的目录 I/O，保留真实 controller、store 和订阅 hook。
mock.module("../src/api/commands/workspace", () => ({
  workspaceIndex: { getDirectory: async () => ({ path: "", entries: [] }) },
}));
const { workspaceSessionStore } = await import("../src/stores/workspace/workspace_session_store");
const { workspaceDirectoryPicker, selectWorkspaceDirectory } =
  await import("../src/hooks/workspace/use_workspace_directory_picker");
const { DirectoryPickerHost } =
  await import("../src/components/workspaces/directory_picker/directory_picker_host");
const { createRoot } = await import("react-dom/client");
let root;
async function settle(ms = 50) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}
async function render() {
  root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(() => root.render(<DesktopSettingsDialog isOpen onOpenChange={() => {}} />));
  await settle();
}
async function click(text) {
  const button = [...document.querySelectorAll("button")].find(
    (button) => button.textContent === text,
  );
  expect(button).toBeTruthy();
  await act(() => button.click());
  await settle();
}
afterEach(async () => {
  await act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

test("Dialog body 将滚动交给左右两栏", async () => {
  await render();
  const body = document.querySelector(".modal__body");
  expect(body.style.display).toBe("flex");
  expect(body.style.flexDirection).toBe("column");
  expect(body.style.overflow).toBe("hidden");
  const list = document.querySelector('[aria-label="设置内容"]');
  expect(getComputedStyle(list).overflowY).toBe("auto");
  expect(getComputedStyle(list).flexGrow).toBe("1");
  const panel = document.querySelector('[role="tabpanel"]');
  expect(list.parentElement === panel).toBe(true);
  expect(getComputedStyle(panel).minHeight).toBe("0px");
  expect(getComputedStyle(panel).overflowY).toBe("hidden");
  const tabs = panel.parentElement;
  expect(getComputedStyle(tabs).flexDirection).toBe("row");
  expect(getComputedStyle(tabs).minHeight).toBe("0px");
  const navigation = tabs.firstElementChild;
  expect(getComputedStyle(navigation).overflowY).toBe("auto");
  expect(getComputedStyle(navigation).flexShrink).toBe("0");
});

test("不同标题长度的设置导航按钮填满可用宽度", async () => {
  await render();
  for (const tab of document.querySelectorAll('[role="tab"]')) expect(tab.style.width).toBe("100%");
});

test("工作区 Header 不收缩，为 Dialog 关闭按钮保留独立操作区域", async () => {
  root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(() =>
    root.render(
      <WorkspaceSelectHeader
        embedded
        isWorkspaceSelectionMode
        areAllWorkspacesSelected={false}
        canSelectWorkspaces
        isGroupModeDisabled={false}
        isScanningWorkspaces={false}
        isRefreshingWorkspaces={false}
      />,
    ),
  );
  const label = [...document.querySelectorAll("span")].find(
    (element) => element.textContent === "工作区",
  );
  const header = label.parentElement;
  const style = window.getComputedStyle(header);
  expect(style.flexShrink).toBe("0");
  expect(parseFloat(style.paddingRight)).toBeGreaterThanOrEqual(48);
});

test("字体选择保留上次 consumer 让真实 Sheet 完成退出动画，重开可切换 consumer", async () => {
  root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(() =>
    root.render(
      <TrueSheetProvider>
        <AppearanceSettingsPage />
      </TrueSheetProvider>,
    ),
  );
  expect(document.querySelector("[data-vaul-drawer]")).toBeNull();
  await click("UI 界面字体");
  await settle(400);
  const input = document.querySelector("input");
  expect(input).toBeTruthy();
  await click("关闭 Sheet");
  expect(document.querySelector("input") === input).toBe(true);
  const drawer = document.querySelector("[data-vaul-drawer]");
  await act(() =>
    drawer.dispatchEvent(
      new win.AnimationEvent("animationend", { bubbles: true, animationName: "vaulHold" }),
    ),
  );
  await settle(400);
  expect(document.querySelector("[data-vaul-drawer]")).toBeNull();
  await click("编辑器字体");
  await settle(400);
  expect(document.querySelector("[data-vaul-drawer]") !== null).toBe(true);
});

test("目录选择取消立即结束旧 Promise，保留退出内容且新请求不复用旧状态", async () => {
  workspaceSessionStore.setCurrentWorkspaceId("workspace");
  root = createRoot(document.body.appendChild(document.createElement("div")));
  await act(() =>
    root.render(
      <TrueSheetProvider>
        <DirectoryPickerHost />
      </TrueSheetProvider>,
    ),
  );
  let first;
  await act(() => {
    first = selectWorkspaceDirectory({
      workspaceId: "workspace",
      purpose: "save",
      initialPath: "old",
      suggestedFileName: "旧.md",
    });
  });
  await settle(400);
  const input = document.querySelector("input");
  expect(input.value).toBe("旧.md");
  await click("关闭 Sheet");
  expect(await first).toBeNull();
  expect(workspaceDirectoryPicker.getSnapshot()).toBeNull();
  expect(document.querySelector("input") === input).toBe(true);
  let second;
  await act(() => {
    second = selectWorkspaceDirectory({
      workspaceId: "workspace",
      purpose: "save",
      initialPath: "new",
      suggestedFileName: "新.md",
    });
  });
  await settle(400);
  expect(document.querySelector("input").value).toBe("新.md");
  expect(workspaceDirectoryPicker.getSnapshot()?.selected).toBe("new");
  await click("确定");
  expect(await second).toEqual({ directory: "new", fileName: "新.md" });
  expect(document.querySelector("input") !== null).toBe(true);
  const drawer = document.querySelector("[data-vaul-drawer]");
  await act(() =>
    drawer.dispatchEvent(
      new win.AnimationEvent("animationend", { bubbles: true, animationName: "vaulHold" }),
    ),
  );
  await settle(400);
  expect(document.querySelector("[data-vaul-drawer]") === null).toBe(true);
});

for (const kind of ["Debug", "GM"]) {
  test(`${kind} 首次打开才挂载，关闭请求保留真实 Sheet 直到退出动画完成`, async () => {
    await render();
    expect(() =>
      settingsSheetCommands.present(
        kind === "Debug" ? "debug-panel" : "lonanote-gm-settings-sheet",
        0,
        false,
      ),
    ).toThrow("no sheet registered");
    expect(document.querySelector("[data-vaul-drawer]")).toBeNull();
    await click(`打开 ${kind}`);
    await settle(400);
    const input = document.querySelector(`[aria-label="${kind} 内容"]`);
    expect(input).toBeTruthy();
    await click("关闭 Sheet");
    expect(document.querySelector(`[aria-label="${kind} 内容"]`) === input).toBe(true);
    // HappyDOM 不运行动画时钟，显式送出真实 CSS 的完成事件。
    const drawer = document.querySelector("[data-vaul-drawer]");
    await act(() =>
      drawer.dispatchEvent(
        new win.AnimationEvent("animationend", { bubbles: true, animationName: "vaulHold" }),
      ),
    );
    await settle(400);
    expect(document.querySelector("[data-vaul-drawer]")).toBeNull();
    await click(`打开 ${kind}`);
    await settle(400);
    expect(document.querySelector(`[aria-label="${kind} 内容"]`)).toBeTruthy();
  });
}
