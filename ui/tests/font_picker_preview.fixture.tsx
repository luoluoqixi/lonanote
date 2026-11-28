import { afterEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import React, { act } from "react";

const win = new Window({ url: "http://localhost/" });
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLDivElement",
  "HTMLButtonElement",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLAnchorElement",
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
])
  globalThis[key] = key === "window" ? win : win[key];
globalThis.getComputedStyle = win.getComputedStyle.bind(win);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.requestAnimationFrame = win.requestAnimationFrame.bind(win);
globalThis.cancelAnimationFrame = win.cancelAnimationFrame.bind(win);
const RNW = await import("react-native-web");
const View = React.forwardRef(({ className, style, pointerEvents, ...props }, ref) => (
  <RNW.View
    {...props}
    ref={ref}
    style={[className ? { $$css: true, tailwind: className } : {}, { pointerEvents }, style]}
  />
));
mock.module("react-native", () => ({ ...RNW, View }));
mock.module("uniwind", () => ({ withUniwind: (value) => value }));
mock.module("lucide-react-native", () =>
  Object.fromEntries(
    ["Check", "CheckCircle2", "ChevronRight", "Circle"].map((key) => [key, () => null]),
  ),
);
mock.module("@react-navigation/native", () => ({
  NavigationContext: React.createContext(undefined),
}));
const theme = {
  background: "#fff",
  surface: "#f8f8fa",
  surfaceSecondary: "#eee",
  foreground: "#111",
  border: "#ddd",
  muted: "#777777",
  accent: "#7530ff",
  accent03: "#eee6ff",
  default: "#ddd",
};
const backgrounds = { screen: "#f6f6f8", card: "#fff", sheet: "#fff", header: "#fff" };
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/theme", () => ({
  useUiTheme: () => theme,
  useAppBackgroundColors: () => backgrounds,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils/haptics", () => ({
  useResolvedNativeHaptics: () => false,
  triggerNativeHaptics() {},
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/button/button_loading_icon", () => ({
  ButtonLoadingIcon: ({ children }) => children,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/utils", () => ({
  triggerNativeHaptics() {},
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/native_list/input_control", () => ({
  Input: RNW.TextInput,
}));
mock.module(
  "../node_modules/rn-ui-kit/src/core/components/ui/native_list/textarea_control",
  () => ({ Textarea: RNW.TextInput }),
);
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/context_menu", () => ({
  ContextMenu: ({ trigger }) => trigger,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/dropdown", () => ({
  Dropdown: () => null,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/select", () => ({
  Select: () => null,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/switch", () => ({
  Switch: () => null,
}));
mock.module("../node_modules/rn-ui-kit/src/core/components/ui/scroll_view", () => ({
  ScrollView: View,
}));
const { Button } = await import("../node_modules/rn-ui-kit/src/core/components/ui/button");
const { Text } = await import("../node_modules/rn-ui-kit/src/core/components/ui/text");
const basic =
  await import("../node_modules/rn-ui-kit/src/core/components/ui/native_list/native_list_basic");
mock.module("rn-ui-kit", () => ({
  ...basic,
  Button,
  Text,
  Input: RNW.TextInput,
  useUiTheme: () => theme,
}));
// 弹层不是本 fixture 的被测对象，保留真实 FontPicker、FlatList、Button、Text 与字体 hook/store。
mock.module("../src/components/common/adaptive_modal", () => ({
  AdaptiveModal: ({ children }) => children,
}));
mock.module("../src/hooks/layout", () => ({ useLayoutMode: () => ({ layoutMode: "desktop" }) }));
mock.module("../src/api/common", () => ({ os: () => "windows" }));
const entries = [
  {
    source: "system",
    selection: {
      source: "system",
      platform: "windows",
      familyKey: "serif",
      displayName: "示例衬线",
    },
    displayName: "示例衬线",
    ui: { available: true },
    editor: { available: true },
  },
  {
    source: "system",
    selection: { source: "system", platform: "windows", familyKey: "bad", displayName: "加载失败" },
    displayName: "加载失败",
    ui: { available: true },
    editor: { available: true },
  },
  {
    source: "system",
    selection: {
      source: "system",
      platform: "windows",
      familyKey: "editor-only",
      displayName: "仅编辑器",
    },
    displayName: "仅编辑器",
    ui: { available: false, reason: "UI 不支持" },
    editor: { available: true },
  },
];
const resolved = [];
const loaded = [];
mock.module("../src/api/commands/fonts", () => ({
  systemFonts: {
    list: async () => entries,
    resolve: async (selection, consumer) => {
      resolved.push(`${consumer}:${selection.familyKey}`);
      return { family: `${consumer}-registered-${selection.familyKey}`, faces: [] };
    },
  },
}));
mock.module("../src/fonts/resolve_bundled_font", () => ({
  resolveBundledFont: async () => ({ family: "BundledPreview", faces: [] }),
}));
mock.module("../src/fonts/font_loader", () => ({
  loadFont: async (font) => {
    if (font.family.endsWith("-bad")) throw new Error("无法加载");
    loaded.push(font.family);
  },
}));
const saved = [];
mock.module("../src/hooks/settings/use_font_settings", () => ({
  useFontSettings: () => ({
    ui: { selection: null },
    editor: { selection: null },
    select: async (consumer, selection) => saved.push({ consumer, selection }),
  }),
}));
const { FontPicker } = await import("../src/components/settings/font_picker");
const { SettingsList } = await import("../src/components/settings/settings_list");
const { createRoot } = await import("react-dom/client");
let root;
async function render(element) {
  root ??= createRoot(document.body.appendChild(document.createElement("div")));
  await act(async () => {
    root.render(element);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}
afterEach(async () => {
  await act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  saved.length = 0;
});

test("字体行填满列表，预览使用已加载的 UI family 而不是字体显示名", async () => {
  await render(<FontPicker consumer="ui" open onOpenChange={() => {}} />);
  const row = document.querySelector('button[aria-label="示例衬线"]');
  expect(row).not.toBeNull();
  expect(row.style.width).toBe("100%");
  const label = [...row.querySelectorAll("span")].find((node) => node.textContent === "示例衬线");
  expect(label.style.fontFamily).toBe("ui-registered-serif");
  expect(loaded).toContain("ui-registered-serif");
  const bundled = document.querySelector('button[aria-label="Fira Code"]');
  expect(
    [...bundled.querySelectorAll("span")].find((node) => node.textContent === "Fira Code").style
      .fontFamily,
  ).toBe("BundledPreview");
  expect(document.querySelector('button[aria-label="加载失败"]').disabled).toBe(true);
  expect(saved).toHaveLength(0);
});

test("编辑器候选用 UI 可注册的 family 预览，不能预览的候选仍可选择", async () => {
  await render(<FontPicker consumer="editor" open onOpenChange={() => {}} />);
  const row = document.querySelector('button[aria-label="示例衬线"]');
  const label = [...row.querySelectorAll("span")].find((node) => node.textContent === "示例衬线");
  expect(label.style.fontFamily).toBe("ui-registered-serif");
  const editorOnly = document.querySelector('button[aria-label="仅编辑器"]');
  expect(editorOnly.disabled).toBe(false);
  expect(resolved).not.toContain("ui:editor-only");
  await act(async () => {
    editorOnly.click();
  });
  expect(saved).toEqual([{ consumer: "editor", selection: entries[2].selection }]);
});

test("桌面 SettingsList 与库默认 NativeList 使用相同卡片样式", async () => {
  const rows = (
    <basic.NativeListSection title="设置">
      <basic.NativeListItem title="标准行" />
    </basic.NativeListSection>
  );
  await render(
    <>
      <div id="library">
        <basic.NativeList scrollable={false}>{rows}</basic.NativeList>
      </div>
      <div id="settings">
        <SettingsList scrollable={false}>{rows}</SettingsList>
      </div>
    </>,
  );
  const library = document.querySelector("#library").firstElementChild;
  const settings = document.querySelector("#settings").firstElementChild;
  const libraryCard = library.querySelector(".shadow-surface");
  const settingsCard = settings.querySelector(".shadow-surface");
  expect(settingsCard).not.toBeNull();
  expect(settingsCard.className).toBe(libraryCard.className);
  expect(settingsCard.style.backgroundColor).toBe(libraryCard.style.backgroundColor);
  expect(settingsCard.style.borderRadius).toBe(libraryCard.style.borderRadius);
  expect(getComputedStyle(settings).backgroundColor).toBe(
    getComputedStyle(library).backgroundColor,
  );
});
